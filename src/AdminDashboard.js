import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const AdminDashboard = () => {
  const DEFAULT_VISIBLE_ROWS = 8;
  const token = localStorage.getItem("token");
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load health");
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };

    loadHealth();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load overview");
        setOverview(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) loadOverview();
  }, [token]);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  if (!token) return <div className="admin-container">Please log in first.</div>;
  if (storedUser.role && storedUser.role !== "admin") {
    return <div className="admin-container">This area is for admins only.</div>;
  }

  const visibleCourses = showAllCourses
    ? overview?.courses || []
    : (overview?.courses || []).slice(0, DEFAULT_VISIBLE_ROWS);
  const visibleUsers = showAllUsers
    ? overview?.users || []
    : (overview?.users || []).slice(0, DEFAULT_VISIBLE_ROWS);
  const dbStatus = overview?.db?.status || health?.db?.status || "unknown";
  const dbName = overview?.db?.name || health?.db?.name || "N/A";
  const dbHost = overview?.db?.host || health?.db?.host || "N/A";

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage users, courses, and overall activity.</p>
        </div>
        <Link to="/home" className="btn btn-outline">
          Back to home
        </Link>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading && <p>Loading overview...</p>}

      <div className={`admin-health admin-health--${dbStatus}`}>
        <div>
          <h2>Database status</h2>
          <p>
            MongoDB is currently <strong>{dbStatus}</strong>.
          </p>
        </div>
        <div className="admin-health__meta">
          <span>DB: {dbName}</span>
          <span>Host: {dbHost}</span>
        </div>
      </div>

      {overview && (
        <>
          <div className="admin-metrics">
            <div>
              <h3>{overview.counts?.student || 0}</h3>
              <p>Students</p>
            </div>
            <div>
              <h3>{overview.counts?.instructor || 0}</h3>
              <p>Instructors</p>
            </div>
            <div>
              <h3>{overview.counts?.admin || 0}</h3>
              <p>Admins</p>
            </div>
            <div>
              <h3>{overview.enrollments || 0}</h3>
              <p>Enrollments</p>
            </div>
          </div>

          <div className="course-table">
            <h2>Courses</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Instructor</th>
                  <th>Level</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.title || "Untitled course"}</td>
                    <td>{course.instructorName || "Instructor"}</td>
                    <td>{course.level || "Any"}</td>
                    <td>{course.duration || "Self-paced"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(overview.courses?.length || 0) > DEFAULT_VISIBLE_ROWS ? (
              <div className="course-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowAllCourses((prev) => !prev)}
                >
                  {showAllCourses ? "Show less" : `Show all ${overview.courses.length} courses`}
                </button>
              </div>
            ) : null}
          </div>

          <div className="course-table">
            <h2>Users</h2>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(overview.users?.length || 0) > DEFAULT_VISIBLE_ROWS ? (
              <div className="course-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowAllUsers((prev) => !prev)}
                >
                  {showAllUsers ? "Show less" : `Show all ${overview.users.length} users`}
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
