import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./CoursePage.css";
import { getCourseVideoLinks } from "./courseLinks";
import { API_BASE } from "./config";

const normalizeCourse = (course) => {
  if (!course) return course;
  const durationRaw = course.duration || course["Duration (hrs)"];
  const videoLinks = getCourseVideoLinks(course);
  return {
    ...course,
    title: course.title || course["Course Name"] || "Untitled course",
    subtitle: course.subtitle || course.description || course.Category || "",
    instructorName: course.instructorName || course.Instructor || "",
    providerName: course.providerName || course.channelTitle || course.Platform || "",
    providerUrl: course.providerUrl || "",
    collaborationLabel: course.collaborationLabel || "",
    isExternal: Boolean(course.isExternal),
    isCollaborative: Boolean(course.isCollaborative),
    syncEnabled: Boolean(course.syncEnabled),
    syncFrequencyHours: Number(course.syncFrequencyHours) || 24,
    lastSyncedAt: course.lastSyncedAt || null,
    syncStatus: course.syncStatus || "idle",
    syncError: course.syncError || "",
    level: course.level || course.Level || "",
    duration:
      typeof durationRaw === "number" ? `${durationRaw}h` : durationRaw || "",
    rawVideoUrl: course.url || course.videoUrl || course["Video Link"] || "",
    videoUrl: videoLinks.embedUrl,
    watchUrl: videoLinks.watchUrl,
    canEmbedVideo: videoLinks.canEmbed,
  };
};

const slugify = (value) =>
  String(value || "course")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";

const buildNotesDownload = (course) => {
  const notesWithContent = (course?.notes || []).filter((note) => note?.content);
  if (notesWithContent.length) {
    return {
      fileName: `${slugify(course?.title)}-notes.pdf`,
      content: notesWithContent
        .map((note) => `${note.title || "Course notes"}\n\n${note.content}`)
        .join("\n\n---\n\n"),
    };
  }

  const fallbackLinks = (course?.notes || [])
    .filter((note) => note?.href)
    .map((note, index) => `- ${note.title || `Resource ${index + 1}`}: ${note.href}`)
    .join("\n");

  return {
    fileName: `${slugify(course?.title)}-resources.pdf`,
    content: `Resources for ${course?.title || "this course"}\n\n${fallbackLinks || "No downloadable notes available yet."}`,
  };
};

const escapePdfText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfText = (text, maxCharsPerLine = 90) => {
  const sourceLines = String(text || "").split("\n");
  const wrapped = [];

  sourceLines.forEach((sourceLine) => {
    const words = sourceLine.trim() ? sourceLine.split(/\s+/) : [""];
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate;
      } else {
        if (currentLine) wrapped.push(currentLine);
        currentLine = word;
      }
    });

    wrapped.push(currentLine);
  });

  return wrapped;
};

const buildPdfBlob = ({ content }) => {
  const lines = wrapPdfText(content);
  const linesPerPage = 42;
  const pages = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  if (!pages.length) {
    pages.push(["No notes available."]);
  }

  const objects = [];
  const addObject = (value) => {
    objects.push(value);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const contentIds = pages.map((pageLines) => {
    const streamLines = ["BT", "/F1 12 Tf", "50 790 Td", "16 TL"];
    pageLines.forEach((line) => {
      streamLines.push(`(${escapePdfText(line)}) Tj`);
      streamLines.push("T*");
    });
    streamLines.push("ET");
    const stream = streamLines.join("\n");
    return addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  const pageIds = pages.map((_, index) =>
    addObject(
      `<< /Type /Page /Parent {{PAGES_ID}} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    )
  );

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObject(`<< /Type /Pages /Count ${pageIds.length} /Kids [${kids}] >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  pageIds.forEach((pageId, index) => {
    objects[pageId - 1] = objects[pageId - 1].replace("{{PAGES_ID}}", String(pagesId));
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((objectValue, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectValue}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const downloadFile = ({ fileName, blob }) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export default function UpdateCoursePage() {
  const { id } = useParams();
  const courseId = id;
  const [auth, setAuth] = useState({ token: "", user: null });
  const role = auth.user?.role;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [progressDraft, setProgressDraft] = useState({ progressPercent: 0, quizScore: 0 });
  const [generating, setGenerating] = useState(false);
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [importingProvider, setImportingProvider] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token") || "";
      let user = null;
      try {
        const stored = localStorage.getItem("user");
        user = stored ? JSON.parse(stored) : null;
      } catch {
        user = null;
      }
      setAuth({ token, user });
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const dashboardPath =
    auth.user?.role === "admin"
      ? "/admin"
      : auth.user?.role === "instructor"
      ? "/instructor"
      : "/student";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: "", user: null });
  };

  const lessonCount =
    course?.syllabus?.length ||
    course?.quiz?.questions?.length ||
    course?.notes?.length ||
    4;

  const learningHighlights = [
    `Build hands-on confidence in ${course?.title || "the topic"}.`,
    `Follow a ${course?.level || "self-paced"} path with practical learning steps.`,
    "Use guided resources and exercises to reinforce each lesson.",
  ];

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/courses/${courseId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setCourse(normalizeCourse(data));
        setQuizAnswers({});
        setQuizResult(null);
      } catch (err) {
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const fetchEnrollment = async () => {
      if (!auth.token || role !== "student") return;
      try {
        const res = await fetch(`${API_BASE}/api/me/enrollments`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json();
        if (!res.ok) return;
        const found = data.find((enr) => {
          if (typeof enr.courseId === "string") return enr.courseId === courseId;
          return enr.courseId?._id === courseId;
        });
        setEnrollment(found || null);
        if (found) {
          setProgressDraft({
            progressPercent: found.progressPercent || 0,
            quizScore: found.quizScore || 0,
          });
        }
      } catch {
        return;
      }
    };

    fetchEnrollment();
  }, [courseId, role, auth.token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourse((prev) => {
      if (name === "videoUrl") {
        return {
          ...prev,
          rawVideoUrl: value,
          videoUrl: value,
          watchUrl: value,
        };
      }

      if (name === "syncFrequencyHours") {
        return {
          ...prev,
          syncFrequencyHours: Number(value) || 24,
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        ...course,
        videoUrl: course.rawVideoUrl || course.videoUrl || "",
      };
      delete payload.rawVideoUrl;
      delete payload.watchUrl;
      delete payload.canEmbedVideo;

      const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      await res.json();
      setSuccess(true);
    } catch (err) {
      setError("Error saving course");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMaterials = async () => {
    if (!auth.token) {
      setError("Please log in as an instructor to generate quiz and notes.");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        title: course?.title || "",
        subtitle: course?.subtitle || "",
        level: course?.level || "",
        duration: course?.duration || "",
        videoUrl: course?.rawVideoUrl || course?.videoUrl || "",
        learningContent: course?.learningContent || "",
        syllabus: course?.syllabus || [],
      };
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/generate-materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Generation failed");
      setCourse(normalizeCourse(data));
      setSuccess(data.generationMessage || "Quiz and notes generated successfully.");
    } catch (err) {
      setError(err.message || "Error generating quiz and notes");
    } finally {
      setGenerating(false);
    }
  };

  const handleExternalSync = async () => {
    setSyncingExternal(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/sync-external`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "External sync failed");
      setCourse(normalizeCourse(data));
      setSuccess(true);
    } catch (err) {
      setError(err.message || "External sync failed");
    } finally {
      setSyncingExternal(false);
    }
  };

  const handleProviderImport = async () => {
    if (!course?.providerUrl) {
      setError("Add a provider URL first");
      return;
    }

    setImportingProvider(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/import-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ providerUrl: course.providerUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Provider import failed");
      setCourse(normalizeCourse(data));
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Provider import failed");
    } finally {
      setImportingProvider(false);
    }
  };

  const handleEnroll = async () => {
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Enroll failed");
      setEnrollment(data);
      setProgressDraft({ progressPercent: data.progressPercent || 0, quizScore: data.quizScore || 0 });
    } catch (err) {
      setError(err.message || "Error enrolling");
    }
  };

  const handleProgressSave = async () => {
    if (!enrollment) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/enrollments/${enrollment._id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(progressDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setEnrollment(data);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Error updating progress");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadNotes = () => {
    const notesDownload = buildNotesDownload(course);
    downloadFile({
      fileName: notesDownload.fileName,
      blob: buildPdfBlob(notesDownload),
    });
  };

  const handleQuizAnswerChange = (questionId, optionIndex) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleQuizSubmit = async () => {
    if (!course?.quiz?.questions?.length) return;
    setSaving(true);
    setError(null);
    setQuizResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: quizAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Quiz submission failed");
      setQuizResult(data);

      if (enrollment && auth.token && role === "student") {
        const percent = data.total ? Math.round((data.score / data.total) * 100) : 0;
        const nextProgress = {
          progressPercent: Math.max(progressDraft.progressPercent, 100),
          quizScore: percent,
        };
        setProgressDraft(nextProgress);

        await fetch(`${API_BASE}/api/enrollments/${enrollment._id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(nextProgress),
        });
      }
    } catch (err) {
      setError(err.message || "Error submitting quiz");
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/home" className="brand">
          <span className="brand-mark">AA</span>
          <span className="brand-name">AtomAcademy</span>
        </Link>
        <nav className="nav-links">
          <Link to="/home">Home</Link>
          <Link to="/course">Courses</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {auth.token && <Link to={dashboardPath}>Dashboard</Link>}
        </nav>
        <div className="header-actions">
          {auth.token ? (
            <div className="profile">
              <div className="profile__avatar">
                {(auth.user?.username || auth.user?.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="profile__info">
                <span className="profile__name">
                  {auth.user?.username || auth.user?.email || "Account"}
                </span>
                <span className="profile__email">
                  {auth.user?.email || "Signed in"}
                </span>
              </div>
              <button className="btn btn-outline" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="course-page">
        {header}
        <div className="course-page__status">Loading course...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="course-page">
        {header}
        <div className="course-page__status error">{error}</div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="course-page">
        {header}
        <div className="course-page__status">No course found</div>
      </div>
    );
  }

  const overviewCards = (
    <div className="course-overview-grid">
      <div className="course-overview-card">
        <span className="course-overview-card__label">Instructor</span>
        <strong>{course.instructorName || "Instructor"}</strong>
      </div>
      <div className="course-overview-card">
        <span className="course-overview-card__label">Level</span>
        <strong>{course.level || "All levels"}</strong>
      </div>
      <div className="course-overview-card">
        <span className="course-overview-card__label">Duration</span>
        <strong>{course.duration || "Self-paced"}</strong>
      </div>
      <div className="course-overview-card">
        <span className="course-overview-card__label">Access</span>
        <strong>{course.isFree ? "Free access" : "Open course"}</strong>
      </div>
    </div>
  );
  if (!auth.token || role === "student") {
    return (
      <div className="course-page">
        {header}
        <div className="course-shell">
          <section className="course-hero-panel">
            <div className="course-card__header">
              <span className="course-page__eyebrow">Course spotlight</span>
              <h1>{course.title || "Course"}</h1>
              <p>{course.subtitle || "Learn at your own pace."}</p>
            </div>
            {overviewCards}
          </section>

          <section className="course-content-grid">
            <div className="course-primary">
              {course.videoUrl && course.canEmbedVideo ? (
                <div className="video-wrap">
                  <iframe
                    src={course.videoUrl}
                    title={course.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : null}
              {course.watchUrl && !course.canEmbedVideo ? (
                <div className="course-fallback-card">
                  <h3>Open this lesson</h3>
                  <p>
                    This video provider does not support inline playback here, but the
                    lesson link is ready below.
                  </p>
                  <a
                    href={course.watchUrl}
                    className="btn btn-outline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open video
                  </a>
                </div>
              ) : null}

              <div className="course-info-section">
                <h3>About this course</h3>
                <p>
                  {course.subtitle ||
                    "Build practical skills with guided lessons, clear progression, and a simple pace you can follow."}
                </p>
              </div>

              <div className="course-info-section">
                <h3>What you will learn</h3>
                <ul className="course-list">
                  {learningHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="course-info-section">
                <h3>Course details</h3>
                <div className="course-detail-grid">
                  <div className="course-detail-item">
                    <span>Lessons</span>
                    <strong>{lessonCount}</strong>
                  </div>
                  <div className="course-detail-item">
                    <span>Provider</span>
                    <strong>{course.channelTitle || "AtomAcademy"}</strong>
                  </div>
                  <div className="course-detail-item">
                    <span>Published</span>
                    <strong>
                      {course.publishedAt
                        ? new Date(course.publishedAt).toLocaleDateString()
                        : "Recently updated"}
                    </strong>
                  </div>
                  <div className="course-detail-item">
                    <span>Views</span>
                    <strong>{course.views || "New"}</strong>
                  </div>
                  {course.isCollaborative ? (
                    <div className="course-detail-item">
                      <span>Format</span>
                      <strong>{course.collaborationLabel || "Collaborative course"}</strong>
                    </div>
                  ) : null}
                  {course.providerName ? (
                    <div className="course-detail-item">
                      <span>Platform</span>
                      <strong>{course.providerName}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {course.isCollaborative || course.isExternal ? (
                <div className="course-info-section">
                  <h3>Partner course access</h3>
                  <p>
                    This course is offered as a collaborative learning experience.
                    Students can discover it here and continue on the partner platform
                    when needed.
                  </p>
                  {course.providerUrl ? (
                    <div className="course-actions course-actions--inline">
                      <a
                        href={course.providerUrl}
                        className="btn btn-outline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open partner course
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {course.notes?.length ? (
                <div className="course-info-section">
                  <h3>Resources</h3>
                  <div className="course-actions course-actions--inline">
                    <button type="button" onClick={handleDownloadNotes}>
                      Download notes
                    </button>
                  </div>
                  <ul className="course-resource-list">
                    {course.notes.map((note, index) => (
                      <li key={note.id || note.href || `${note.title}-${index}`}>
                        <div className="course-resource-item">
                          <strong>{note.title || `Resource ${index + 1}`}</strong>
                          {note.content ? (
                            <p>{note.content.split("\n").slice(0, 4).join(" ")}</p>
                          ) : null}
                          {note.href ? (
                            <a href={note.href} target="_blank" rel="noreferrer">
                              Open resource
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {course.quiz?.questions?.length ? (
                <div className="course-info-section">
                  <h3>{course.quiz.title || "Practice quiz"}</h3>
                  <div className="student-quiz">
                    {course.quiz.questions.map((question, questionIndex) => {
                      const questionKey = question.id || `q-${questionIndex + 1}`;

                      return (
                        <div key={questionKey} className="student-quiz__card">
                          <p className="student-quiz__question">
                            {questionIndex + 1}. {question.text}
                          </p>
                          <div className="student-quiz__options">
                            {(question.options || []).map((option, optionIndex) => (
                              <label
                                key={`${questionKey}-${optionIndex}`}
                                className="student-quiz__option"
                              >
                                <input
                                  type="radio"
                                  name={questionKey}
                                  checked={quizAnswers[questionKey] === optionIndex}
                                  onChange={() =>
                                    handleQuizAnswerChange(questionKey, optionIndex)
                                  }
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="course-actions course-actions--inline">
                      <button type="button" onClick={handleQuizSubmit} disabled={saving}>
                        {saving ? "Submitting..." : "Submit quiz"}
                      </button>
                      {quizResult ? (
                        <span className="success">
                          Score: {quizResult.score}/{quizResult.total}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="course-sidebar">
              <div className="course-sidebar-card">
                <h3>Learning actions</h3>
                <p className="course-sidebar-copy">
                  Enroll to save progress, revisit lessons, and keep your learning
                  organized.
                </p>
                {!auth.token ? (
                  <>
                    <Link to="/login" className="btn btn-outline">
                      Log in to enroll
                    </Link>
                  </>
                ) : !enrollment ? (
                  <>
                    <p>Start learning now and save this course to your dashboard.</p>
                    <button onClick={handleEnroll} disabled={!auth.token}>
                      Enroll free
                    </button>
                  </>
                ) : (
                  <div className="progress-panel">
                    <label>
                      Progress {progressDraft.progressPercent}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressDraft.progressPercent}
                        onChange={(e) =>
                          setProgressDraft((prev) => ({
                            ...prev,
                            progressPercent: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Quiz score
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progressDraft.quizScore}
                        onChange={(e) =>
                          setProgressDraft((prev) => ({
                            ...prev,
                            quizScore: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <button onClick={handleProgressSave} disabled={saving}>
                      {saving ? "Saving..." : "Save progress"}
                    </button>
                  </div>
                )}
                {success ? (
                  <span className="success">
                    {typeof success === "string" ? success : "Saved successfully."}
                  </span>
                ) : null}
                {error && <span className="error">{error}</span>}
              </div>
            </aside>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      {header}
      <div className="course-shell">
        <section className="course-hero-panel">
          <div className="course-card__header">
            <span className="course-page__eyebrow">Instructor workspace</span>
            <h1>Update Course</h1>
            <p>Keep your course details fresh, structured, and clear for learners.</p>
          </div>
          {overviewCards}
        </section>

        <section className="course-content-grid">
          <div className="course-primary">
            <div className="course-card">
              <div className="course-form">
                <label>Title</label>
                <input
                  name="title"
                  value={course.title || ""}
                  onChange={handleChange}
                />

                <label>Subtitle</label>
                <input
                  name="subtitle"
                  value={course.subtitle || ""}
                  onChange={handleChange}
                />

                <label>Video URL</label>
                <input
                  name="videoUrl"
                  value={course.rawVideoUrl || ""}
                  onChange={handleChange}
                />

                <label>Video transcript or lesson content</label>
                <textarea
                  name="learningContent"
                  value={course.learningContent || ""}
                  onChange={handleChange}
                  rows={8}
                  placeholder="Paste the video transcript, lesson summary, or course notes here. The automatic generator will use this to create quiz questions and downloadable notes."
                />

                <label>Provider name</label>
                <input
                  name="providerName"
                  value={course.providerName || ""}
                  onChange={handleChange}
                  placeholder="Udemy, Coursera, YouTube, Partner academy"
                />

                <label>Provider course URL</label>
                <input
                  name="providerUrl"
                  value={course.providerUrl || ""}
                  onChange={handleChange}
                  placeholder="https://..."
                />

                <label>Collaboration label</label>
                <input
                  name="collaborationLabel"
                  value={course.collaborationLabel || ""}
                  onChange={handleChange}
                  placeholder="Co-branded course, Partner certification, External cohort"
                />

                <label className="course-check">
                  <input
                    type="checkbox"
                    checked={Boolean(course.isCollaborative)}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        isCollaborative: e.target.checked,
                      }))
                    }
                  />
                  Collaborative course
                </label>

                <label className="course-check">
                  <input
                    type="checkbox"
                    checked={Boolean(course.isExternal)}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        isExternal: e.target.checked,
                      }))
                    }
                  />
                  External platform course
                </label>

                <label className="course-check">
                  <input
                    type="checkbox"
                    checked={Boolean(course.syncEnabled)}
                    onChange={(e) =>
                      setCourse((prev) => ({
                        ...prev,
                        syncEnabled: e.target.checked,
                      }))
                    }
                  />
                  Auto-sync partner metadata
                </label>

                <label>Sync frequency in hours</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  name="syncFrequencyHours"
                  value={course.syncFrequencyHours || 24}
                  onChange={handleChange}
                />

                {(course.isExternal || course.syncEnabled) && course.providerUrl ? (
                  <div className="course-sync-panel">
                    <p>
                      Status: <strong>{course.syncStatus || "idle"}</strong>
                    </p>
                    <p>
                      Last synced:{" "}
                      <strong>
                        {course.lastSyncedAt
                          ? new Date(course.lastSyncedAt).toLocaleString()
                          : "Never"}
                      </strong>
                    </p>
                    {course.syncError ? <p className="error">{course.syncError}</p> : null}
                  </div>
                ) : null}

                <div className="form-section">
                  <h3>Notes</h3>
                  {course.notes?.length ? course.notes.map((note, idx) => (
                    <div key={idx} className="note-editor">
                      <input
                        value={note.title || ""}
                        onChange={(e) => {
                          const updated = [...course.notes];
                          updated[idx].title = e.target.value;
                          setCourse({ ...course, notes: updated });
                        }}
                        placeholder="Note title"
                      />
                      <input
                        value={note.href}
                        onChange={(e) => {
                          const updated = [...course.notes];
                          updated[idx].href = e.target.value;
                          setCourse({ ...course, notes: updated });
                        }}
                        placeholder="Note link"
                      />
                      <textarea
                        rows={8}
                        value={note.content || ""}
                        onChange={(e) => {
                          const updated = [...course.notes];
                          updated[idx].content = e.target.value;
                          setCourse({ ...course, notes: updated });
                        }}
                        placeholder="Generated or custom note content"
                      />
                    </div>
                  )) : <p className="course-muted">Generate notes to populate this section.</p>}
                </div>

                <div className="form-section">
                  <h3>Quiz</h3>
                  <input
                    value={course.quiz?.title || ""}
                    onChange={(e) =>
                      setCourse({ ...course, quiz: { ...course.quiz, title: e.target.value } })
                    }
                    placeholder="Quiz title"
                  />

                  {course.quiz?.questions?.length ? course.quiz.questions.map((q, idx) => (
                    <div key={idx} className="quiz-row">
                      <input
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...course.quiz.questions];
                          updated[idx].text = e.target.value;
                          setCourse({
                            ...course,
                            quiz: { ...course.quiz, questions: updated },
                          });
                        }}
                        placeholder={`Question ${idx + 1}`}
                      />
                    </div>
                  )) : <p className="course-muted">Generate a quiz to create question drafts.</p>}
                </div>
              </div>
            </div>
          </div>

          <aside className="course-sidebar">
            <div className="course-sidebar-card">
              <h3>Publishing</h3>
              <p>Review the course details, keep links valid, and update the learning materials for students.</p>
              <div className="course-actions">
                <button
                  type="button"
                  onClick={handleProviderImport}
                  disabled={importingProvider || !course.providerUrl}
                >
                  {importingProvider ? "Importing..." : "Import provider details"}
                </button>
                <button
                  type="button"
                  onClick={handleExternalSync}
                  disabled={syncingExternal || !course.isExternal || !course.providerUrl}
                >
                  {syncingExternal ? "Syncing..." : "Sync partner metadata"}
                </button>
                <button type="button" onClick={handleGenerateMaterials} disabled={generating}>
                  {generating ? "Generating..." : "Auto-generate quiz and notes"}
                </button>
                <button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {success && <span className="success">Saved successfully.</span>}
                {error && <span className="error">{error}</span>}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
