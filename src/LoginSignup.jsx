import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import { API_BASE } from "./config";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isForgot) {
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Request failed");
          return;
        }
        setMessage("If the email exists, a reset link was sent.");
        return;
      }

      const url = isSignup
        ? `${API_BASE}/api/signup`
        : `${API_BASE}/api/login`;

      const body = isSignup
        ? { email, username, password, role }
        : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Authentication failed");
        return;
      }

      if (isSignup) {
        setIsSignup(false);
        setError("Signup successful! Please log in.");
        setMessage("");
        setEmail("");
        setUsername("");
        setPassword("");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Cannot connect to server. Is backend running?");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <aside className="auth-side">
          <span className="auth-badge">AtomAcademy</span>
          <h1>One modern workspace for learning, teaching, and tracking progress.</h1>
          <p>
            Manage learners, publish courses, import partner content, and keep
            everything organized from one clean LMS experience.
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Smart courses</strong>
              <span>Generate quizzes, notes, and collaborative course links.</span>
            </div>
            <div>
              <strong>Clear dashboards</strong>
              <span>Track students, enrollments, and database health in one place.</span>
            </div>
            <div>
              <strong>Faster delivery</strong>
              <span>Use the platform for internal content and partner programs together.</span>
            </div>
          </div>
        </aside>

        <div className="login-box">
          <div className="auth-panel__header">
            <span className="auth-panel__eyebrow">
              {isForgot ? "Password Recovery" : isSignup ? "Create Account" : "Welcome Back"}
            </span>
            <h2>
              {isForgot ? "Forgot Password" : isSignup ? "Sign Up" : "Sign In"}
            </h2>
            <p>
              {isForgot
                ? "We will send a reset link to your email."
                : isSignup
                ? "Create your learner or instructor account to continue."
                : "Sign in to continue to your learning dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">@</label>
              <input
                type="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {isSignup && (
              <div className="input-group">
                <label htmlFor="username">U</label>
                <input
                  type="text"
                  id="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            {isSignup && (
              <div className="input-group">
                <label htmlFor="role">R</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                </select>
              </div>
            )}

            {isSignup && (
              <p className="note">
                Admin access is assigned internally. Use instructor if you want to publish
                courses.
              </p>
            )}

            {!isForgot && (
              <div className="input-group">
                <label htmlFor="password">P</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
            {message ? <p className="auth-feedback auth-feedback--success">{message}</p> : null}

            <p className="note">
              {isForgot ? (
                <>
                  Remembered your password?{" "}
                  <span
                    onClick={() => {
                      setIsForgot(false);
                      setError("");
                      setMessage("");
                    }}
                    style={{ cursor: "pointer", color: "var(--color-primary)" }}
                  >
                    SIGN IN
                  </span>
                </>
              ) : isSignup ? (
                <>
                  Already have an account?{" "}
                  <span
                    onClick={() => {
                      setIsSignup(false);
                      setError("");
                      setMessage("");
                    }}
                    style={{ cursor: "pointer", color: "var(--color-primary)" }}
                  >
                    LOG IN
                  </span>
                </>
              ) : (
                <>
                  Do not have an account?{" "}
                  <span
                    onClick={() => {
                      setIsSignup(true);
                      setError("");
                      setMessage("");
                    }}
                    style={{ cursor: "pointer", color: "var(--color-primary)" }}
                  >
                    SIGN UP
                  </span>
                </>
              )}
            </p>

            {!isSignup && !isForgot && (
              <p className="note">
                <span
                  onClick={() => {
                    setIsForgot(true);
                    setError("");
                    setMessage("");
                  }}
                  style={{ cursor: "pointer", color: "var(--color-primary)" }}
                >
                  Forgot password?
                </span>
              </p>
            )}

            <button type="submit">
              {isForgot ? "Send reset link" : isSignup ? "Sign Up" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
