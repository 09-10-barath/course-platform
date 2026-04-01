import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./StudentDashboard.css";
import { API_BASE } from "./config";

const StudentDashboard = () => {
  const DEFAULT_VISIBLE_PROGRESS = 4;
  const DEFAULT_VISIBLE_COURSES = 6;
  const token = localStorage.getItem("token");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [progressDraft, setProgressDraft] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);

  const progressStats = useMemo(() => {
    if (!enrollments.length) {
      return { avgProgress: 0, completed: 0, inProgress: 0 };
    }
    const total = enrollments.reduce(
      (sum, enr) => sum + (enr.progressPercent || 0),
      0
    );
    const completed = enrollments.filter(
      (enr) => (enr.progressPercent || 0) >= 100
    ).length;
    return {
      avgProgress: Math.round(total / enrollments.length),
      completed,
      inProgress: enrollments.length - completed,
    };
  }, [enrollments]);

  const enrollmentByCourse = useMemo(() => {
    const map = {};
    enrollments.forEach((enr) => {
      if (typeof enr.courseId === "string") {
        map[enr.courseId] = enr;
      } else if (enr.courseId?._id) {
        map[enr.courseId._id] = enr;
      }
    });
    return map;
  }, [enrollments]);

  const courseById = useMemo(() => {
    const map = {};
    courses.forEach((course) => {
      map[course._id || course.id] = course;
    });
    return map;
  }, [courses]);

  const visibleEnrollments = showAllProgress
    ? enrollments
    : enrollments.slice(0, DEFAULT_VISIBLE_PROGRESS);

  const visibleCourses = showAllCourses
    ? courses
    : courses.slice(0, DEFAULT_VISIBLE_COURSES);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [coursesRes, enrollRes] = await Promise.all([
          fetch(`${API_BASE}/api/courses`),
          fetch(`${API_BASE}/api/me/enrollments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const coursesData = await coursesRes.json();
        const enrollData = await enrollRes.json();
        if (!coursesRes.ok) {
          throw new Error(coursesData.message || "Failed to load courses");
        }
        if (!enrollRes.ok) {
          throw new Error(enrollData.message || "Failed to load enrollments");
        }
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setEnrollments(Array.isArray(enrollData) ? enrollData : []);
        const drafts = {};
        enrollData.forEach((enr) => {
          drafts[enr._id] = {
            progressPercent: enr.progressPercent || 0,
            quizScore: enr.quizScore || 0,
          };
        });
        setProgressDraft(drafts);
      } catch (err) {
        setError(err.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    if (token) loadData();
  }, [token]);

  const handleEnroll = async (courseId) => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to enroll");
      setEnrollments((prev) => [data, ...prev]);
      setProgressDraft((prev) => ({
        ...prev,
        [data._id]: {
          progressPercent: data.progressPercent || 0,
          quizScore: data.quizScore || 0,
        },
      }));
    } catch (err) {
      setError(err.message || "Failed to enroll");
    }
  };

  const handleProgressSave = async (enrollmentId) => {
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/enrollments/${enrollmentId}/progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(progressDraft[enrollmentId]),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update progress");
      setEnrollments((prev) =>
        prev.map((enr) => (enr._id === data._id ? data : enr))
      );
    } catch (err) {
      setError(err.message || "Failed to update progress");
    }
  };

  if (!token) return <div className="dash-status">Please log in first.</div>;
  if (user.role && user.role !== "student") {
    return <div className="dash-status">This area is for students only.</div>;
  }

  return (
    <div className="student-dashboard">
      <header className="dash-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Keep learning, {user.username || "Student"}.</p>
        </div>
        <Link to="/home" className="btn btn-outline">
          Back to home
        </Link>
      </header>

      {error && <div className="dash-error">{error}</div>}

      <section className="dash-card profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {(user.username || user.email || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{user.username || "Student profile"}</h2>
            <p>{user.email || "No email available"}</p>
          </div>
        </div>
        <div className="profile-stats">
          <div>
            <strong>{enrollments.length}</strong>
            <span>Courses enrolled</span>
          </div>
          <div>
            <strong>{progressStats.avgProgress}%</strong>
            <span>Average progress</span>
          </div>
          <div>
            <strong>{progressStats.completed}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>{progressStats.inProgress}</strong>
            <span>In progress</span>
          </div>
        </div>
      </section>

      <section className="dash-card">
        <h2>Your progress</h2>
        {loading ? (
          <p className="dash-muted">Loading your enrollments...</p>
        ) : enrollments.length === 0 ? (
          <p className="dash-muted">No enrollments yet. Pick a course below.</p>
        ) : (
          <div className="progress-list">
            {visibleEnrollments.map((enr) => {
              const course =
                typeof enr.courseId === "string"
                  ? courseById[enr.courseId]
                  : courseById[enr.courseId?._id];
              return (
                <div key={enr._id} className="progress-item">
                  <div>
                    <h3>{course?.title || "Course"}</h3>
                    <p>{course?.subtitle || "Track your progress and quiz score."}</p>
                  </div>
                  <div className="progress-controls">
                    <label>
                      Progress {progressDraft[enr._id]?.progressPercent || 0}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressDraft[enr._id]?.progressPercent || 0}
                        onChange={(e) =>
                          setProgressDraft((prev) => ({
                            ...prev,
                            [enr._id]: {
                              ...prev[enr._id],
                              progressPercent: Number(e.target.value),
                            },
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
                        value={progressDraft[enr._id]?.quizScore || 0}
                        onChange={(e) =>
                          setProgressDraft((prev) => ({
                            ...prev,
                            [enr._id]: {
                              ...prev[enr._id],
                              quizScore: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleProgressSave(enr._id)}
                    >
                      Save progress
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {enrollments.length > DEFAULT_VISIBLE_PROGRESS ? (
          <div className="course-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowAllProgress((prev) => !prev)}
            >
              {showAllProgress ? "Show less" : `Show all ${enrollments.length} progress items`}
            </button>
          </div>
        ) : null}
      </section>

      <section className="dash-card">
        <h2>Available courses</h2>
        {loading ? (
          <p className="dash-muted">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="dash-muted">No courses available yet.</p>
        ) : (
          <div className="course-grid">
            {visibleCourses.map((course) => {
              const courseId = course._id || course.id;
              const enrolled = Boolean(enrollmentByCourse[courseId]);
              return (
                <div key={courseId} className="course-tile">
                  <h3>{course.title || "Untitled course"}</h3>
                  <p>{course.subtitle || "Learn at your own pace."}</p>
                  <span className="course-meta">
                    {course.level || "All levels"} · {course.duration || "Self-paced"}
                  </span>
                  <div className="course-actions">
                    <Link to={`/course/${courseId}`} className="btn btn-outline">
                      View
                    </Link>
                    <button
                      className="btn btn-primary"
                      disabled={enrolled}
                      onClick={() => handleEnroll(courseId)}
                    >
                      {enrolled ? "Enrolled" : "Enroll free"}
                    </button>
                  </div>
                </div>
              );
            })}
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

export default StudentDashboard;
