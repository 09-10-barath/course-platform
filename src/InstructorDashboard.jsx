import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./InstructorDashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const emptyForm = {
  title: "",
  subtitle: "",
  instructorName: "",
  duration: "",
  level: "Beginner",
  videoUrl: "",
  learningContent: "",
  thumbnail: "",
  providerName: "",
  providerUrl: "",
  collaborationLabel: "",
  isExternal: false,
  isCollaborative: false,
  syncEnabled: false,
  syncFrequencyHours: 24,
  isFeatured: false,
  isPopular: false,
  status: "draft",
  notes: [],
};

const steps = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Content" },
  { id: 2, label: "Publish" },
];

const normalizeCourse = (course) => ({
  ...course,
  status: course?.status || "draft",
  level: course?.level || "Beginner",
  duration: course?.duration || "Self-paced",
});

const fieldLabel = (value) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/([A-Z])/g, " $1");

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const InstructorDashboard = () => {
  const DEFAULT_VISIBLE_COURSES = 6;
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [quickImportUrl, setQuickImportUrl] = useState("");
  const [bulkJson, setBulkJson] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [deletingCourseId, setDeletingCourseId] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState("");

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setError("Session expired. Please log in again.");
    setSuccess("");
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/instructor/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!res.ok) throw new Error(data.message || "Failed to load courses");
        setCourses(Array.isArray(data) ? data.map(normalizeCourse) : []);
      } catch (err) {
        setError(err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [handleUnauthorized, token]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Thumbnail image is too large. Keep it under 2 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setField("thumbnail", dataUrl);
      setSuccess("Thumbnail uploaded successfully.");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to upload thumbnail.");
    } finally {
      event.target.value = "";
    }
  };

  const handleNoteFilesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const nextNotes = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE) {
          throw new Error(`${file.name} is too large. Keep uploads under 2 MB.`);
        }
        const href = await readFileAsDataUrl(file);
        nextNotes.push({
          id: `${Date.now()}-${file.name}`,
          title: file.name.replace(/\.[^.]+$/, ""),
          href,
          content: "",
          type: "upload",
          fileName: file.name,
        });
      }

      setForm((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), ...nextNotes],
      }));
      setSuccess("Resources uploaded successfully.");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to upload files.");
    } finally {
      event.target.value = "";
    }
  };

  const removeNote = (id) => {
    setForm((prev) => ({
      ...prev,
      notes: (prev.notes || []).filter((note) => note.id !== id),
    }));
  };

  const createCourse = async (status) => {
    setError("");
    setSuccess("");
    const setBusy = status === "published" ? setPublishing : setSavingDraft;
    setBusy(true);
    const wasUpdatingDraft = Boolean(currentDraftId);

    try {
      const payload = {
        ...form,
        status,
        instructorName: form.instructorName || user.username || "Instructor",
        isExternal: Boolean(form.isExternal || form.providerUrl),
        isCollaborative: Boolean(form.isCollaborative || form.providerUrl),
      };

      const endpoint = currentDraftId ? `${API_BASE}/api/courses/${currentDraftId}` : `${API_BASE}/api/courses`;
      const method = currentDraftId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(data.message || "Failed to create course");
      const normalized = normalizeCourse(data);
      setCourses((prev) => {
        if (currentDraftId) {
          return prev.map((course) =>
            (course._id || course.id) === currentDraftId ? normalized : course
          );
        }
        return [normalized, ...prev];
      });
      setForm(emptyForm);
      setQuickImportUrl("");
      setActiveStep(0);
      setCurrentDraftId("");
      setSuccess(
        status === "draft"
          ? wasUpdatingDraft
            ? "Draft updated successfully."
            : "Draft saved successfully."
          : wasUpdatingDraft
          ? "Draft published successfully."
          : "Course published successfully."
      );
    } catch (err) {
      setError(err.message || "Failed to create course");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickImport = async () => {
    if (!quickImportUrl.trim()) {
      setError("Paste a provider URL to import a course quickly.");
      return;
    }

    setError("");
    setSuccess("");
    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses/import-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerUrl: quickImportUrl.trim(),
          instructorName: user.username || "Instructor",
          status: "draft",
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || "Failed to import course");
      const normalized = normalizeCourse(data);
      setCourses((prev) => [normalized, ...prev]);
      setForm({
        ...emptyForm,
        ...Object.fromEntries(
          Object.entries(normalized).filter(([key]) =>
            !["_id", "id", "__v", "createdAt", "updatedAt", "instructorId"].includes(key)
          )
        ),
        syncFrequencyHours: normalized.syncFrequencyHours || 24,
        status: normalized.status || "draft",
      });
      setCurrentDraftId(normalized._id || normalized.id || "");
      setQuickImportUrl("");
      setActiveStep(1);
      setSuccess(data.importMessage || "Course imported. Review the details and publish when ready.");
    } catch (err) {
      setError(err.message || "Failed to import course");
    } finally {
      setImporting(false);
    }
  };

  const handleBulkAdd = async () => {
    setBulkError("");
    let payload = [];
    try {
      payload = JSON.parse(bulkJson);
      if (!Array.isArray(payload)) {
        throw new Error("Bulk input must be a JSON array");
      }
    } catch (err) {
      setBulkError(err.message || "Invalid JSON");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/courses/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to add courses");
      setCourses((prev) => [...data.map(normalizeCourse), ...prev]);
      setBulkJson("");
      setSuccess("Bulk courses added successfully.");
    } catch (err) {
      setBulkError(err.message || "Failed to add courses");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmed = window.confirm("Delete this course? This action cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingCourseId(courseId);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(data.message || "Failed to delete course");
      setCourses((prev) => prev.filter((course) => (course._id || course.id) !== courseId));
      setSuccess("Course deleted successfully.");
      if (currentDraftId === courseId) {
        setCurrentDraftId("");
        setForm(emptyForm);
        setActiveStep(0);
      }
    } catch (err) {
      setError(err.message || "Failed to delete course");
    } finally {
      setDeletingCourseId("");
    }
  };

  const visibleCourses = showAllCourses
    ? courses
    : courses.slice(0, DEFAULT_VISIBLE_COURSES);

  const draftCount = courses.filter((course) => course.status === "draft").length;
  const publishedCount = courses.filter((course) => course.status === "published").length;

  if (!token) return <div className="dash-status">Please log in first.</div>;
  if (user.role && user.role !== "instructor") {
    return <div className="dash-status">This area is for instructors only.</div>;
  }

  return (
    <div className="instructor-dashboard">
      <header className="dash-header">
        <div>
          <span className="dash-header__eyebrow">Instructor workspace</span>
          <h1>Publish courses without the long setup pain.</h1>
          <p>Use quick import, save drafts, and publish only after the course looks right.</p>
        </div>
        <Link to="/home" className="btn btn-outline">
          Back to home
        </Link>
      </header>

      <section className="dash-hero">
        <div className="dash-hero__card dash-hero__card--primary">
          <h2>Quick Add Course</h2>
          <p>Paste a YouTube, Udemy, Coursera, or partner URL and let the LMS prefill the course for you.</p>
          <div className="dash-quick-add">
            <input
              placeholder="Paste provider URL"
              value={quickImportUrl}
              onChange={(e) => setQuickImportUrl(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleQuickImport} disabled={importing}>
              {importing ? "Importing..." : "Import as Draft"}
            </button>
          </div>
        </div>

        <div className="dash-hero__stats">
          <div className="dash-stat-card">
            <strong>{courses.length}</strong>
            <span>Total courses</span>
          </div>
          <div className="dash-stat-card">
            <strong>{draftCount}</strong>
            <span>Drafts</span>
          </div>
          <div className="dash-stat-card">
            <strong>{publishedCount}</strong>
            <span>Published</span>
          </div>
        </div>
      </section>

      {error ? <div className="dash-error">{error}</div> : null}
      {success ? <div className="dash-success">{success}</div> : null}

      <section className="dash-card">
        <div className="dash-card__header">
          <div>
            <h2>Guided Course Wizard</h2>
            <p className="dash-muted">Follow three short steps instead of filling one giant form.</p>
          </div>
          <div className="dash-steps">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`dash-step ${activeStep === step.id ? "active" : ""}`}
                onClick={() => setActiveStep(step.id)}
              >
                <span>{step.id + 1}</span>
                {step.label}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 0 ? (
          <div className="form-grid">
            {["title", "subtitle", "instructorName", "level", "duration", "thumbnail"].map((field) => (
              <input
                key={field}
                placeholder={fieldLabel(field)}
                value={form[field]}
                onChange={(e) => setField(field, e.target.value)}
              />
            ))}
            <label className="dash-upload">
              <span>Upload thumbnail</span>
              <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
            </label>
            {form.thumbnail ? (
              <div className="dash-thumbnail-preview">
                <img src={form.thumbnail} alt="Course thumbnail preview" />
              </div>
            ) : null}
            <div className="dash-actions">
              <button type="button" className="btn btn-primary" onClick={() => setActiveStep(1)}>
                Continue to Content
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="dash-section-stack">
            <div className="form-grid">
              {["videoUrl", "providerUrl", "providerName", "collaborationLabel"].map((field) => (
                <input
                  key={field}
                  placeholder={fieldLabel(field)}
                  value={form[field]}
                  onChange={(e) => setField(field, e.target.value)}
                />
              ))}
            </div>

            <textarea
              className="dash-textarea"
              rows={7}
              placeholder="Paste transcript, lesson summary, or course notes here. This helps generate quiz and notes later."
              value={form.learningContent}
              onChange={(e) => setField("learningContent", e.target.value)}
            />

            <div className="dash-upload-panel">
              <div>
                <h3>Upload notes or PDFs</h3>
                <p className="dash-muted">
                  Add small note files or PDFs so students can download them directly from the course.
                </p>
              </div>
              <label className="dash-upload">
                <span>Select files</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx,.md"
                  multiple
                  onChange={handleNoteFilesUpload}
                />
              </label>
            </div>

            {form.notes?.length ? (
              <div className="dash-note-list">
                {form.notes.map((note) => (
                  <div key={note.id} className="dash-note-item">
                    <div>
                      <strong>{note.fileName || note.title}</strong>
                      <span>{note.type === "upload" ? "Uploaded resource" : "Course note"}</span>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => removeNote(note.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="dash-toggle-grid">
              <label className="dash-toggle">
                <input
                  type="checkbox"
                  checked={form.isCollaborative}
                  onChange={(e) => setField("isCollaborative", e.target.checked)}
                />
                Collaborative course
              </label>
              <label className="dash-toggle">
                <input
                  type="checkbox"
                  checked={form.isExternal}
                  onChange={(e) => setField("isExternal", e.target.checked)}
                />
                External platform course
              </label>
              <label className="dash-toggle">
                <input
                  type="checkbox"
                  checked={form.syncEnabled}
                  onChange={(e) => setField("syncEnabled", e.target.checked)}
                />
                Auto-sync provider metadata
              </label>
            </div>

            <div className="dash-actions">
              <button type="button" className="btn btn-outline" onClick={() => setActiveStep(0)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setActiveStep(2)}>
                Continue to Publish
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="dash-section-stack">
            <div className="dash-summary-grid">
              <div className="dash-summary-card">
                <span>Course</span>
                <strong>{form.title || "Untitled course"}</strong>
              </div>
              <div className="dash-summary-card">
                <span>Delivery</span>
                <strong>{form.providerUrl ? "Imported / linked" : "Manual build"}</strong>
              </div>
              <div className="dash-summary-card">
                <span>Status</span>
                <strong>{form.status === "published" ? "Ready to publish" : "Draft recommended"}</strong>
              </div>
            </div>

            <div className="form-grid">
              <input
                type="number"
                min="1"
                max="168"
                placeholder="Sync frequency (hours)"
                value={form.syncFrequencyHours}
                onChange={(e) => setField("syncFrequencyHours", Number(e.target.value) || 24)}
              />
              <label className="dash-toggle">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setField("isFeatured", e.target.checked)}
                />
                Featured course
              </label>
              <label className="dash-toggle">
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={(e) => setField("isPopular", e.target.checked)}
                />
                Popular course
              </label>
            </div>

            <div className="dash-actions">
              <button type="button" className="btn btn-outline" onClick={() => setActiveStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => createCourse("draft")}
                disabled={savingDraft}
              >
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => createCourse("published")}
                disabled={publishing}
              >
                {publishing ? "Publishing..." : "Publish Course"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="dash-card">
        <h2>Bulk add courses</h2>
        <p className="dash-muted">Paste a JSON array if you need to upload many courses at once.</p>
        <textarea
          className="dash-textarea"
          rows={10}
          value={bulkJson}
          onChange={(e) => setBulkJson(e.target.value)}
          placeholder='[{"title":"React Mastery","level":"Intermediate","status":"draft"}]'
        />
        {bulkError ? <p className="dash-error">{bulkError}</p> : null}
        <button className="btn btn-outline" onClick={handleBulkAdd}>
          Add Multiple Courses
        </button>
      </section>

      <section className="dash-card">
        <div className="dash-card__header">
          <div>
            <h2>Your courses</h2>
            <p className="dash-muted">Draft first, then edit and publish when the course is ready.</p>
          </div>
        </div>
        {loading ? (
          <p className="dash-muted">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="dash-muted">No courses yet. Start with Quick Add or save your first draft.</p>
        ) : (
          <div className="course-list">
            {visibleCourses.map((course) => (
              <div key={course._id || course.id} className="course-item">
                <div className="course-item__main">
                  <div className="course-meta">
                    <div className="course-meta__top">
                      <h3>{course.title || "Untitled course"}</h3>
                      <span className={`course-status course-status--${course.status || "draft"}`}>
                        {course.status || "draft"}
                      </span>
                    </div>
                    <p className="course-meta__subtitle">{course.subtitle || "No subtitle added yet."}</p>
                    <div className="course-meta__chips">
                      <span>{course.level || "Any level"}</span>
                      <span>{course.duration || "Self-paced"}</span>
                      <span>{course.isExternal ? "External" : "Internal"}</span>
                    </div>
                  </div>

                  <div className="course-actions course-actions--stacked">
                    <Link to={`/course/${course._id || course.id}`} className="btn btn-outline">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline btn-danger"
                      onClick={() => handleDeleteCourse(course._id || course.id)}
                      disabled={deletingCourseId === (course._id || course.id)}
                    >
                      {deletingCourseId === (course._id || course.id) ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {courses.length > DEFAULT_VISIBLE_COURSES ? (
          <div className="course-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowAllCourses((prev) => !prev)}
            >
              {showAllCourses ? "Show less" : `Show all ${courses.length} courses`}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default InstructorDashboard;
