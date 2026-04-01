import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";
import { API_BASE } from "./config";

const ResetPassword = () => {
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const [email] = useState(query.get("email") || "");
  const [token] = useState(query.get("token") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed");
        return;
      }
      setMessage("Password updated. Please sign in.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError("Cannot connect to server. Is backend running?");
    }
  };

  if (!email || !token) {
    return (
      <div className="auth-container">
        <div className="login-box">
          <h2>Invalid reset link</h2>
          <p className="note">Please use the reset link from your email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="login-box">
        <h2>Reset password</h2>
        <hr />
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="password">P</label>
            <input
              type="password"
              id="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}
          {message && <p style={{ color: "green", fontSize: "12px" }}>{message}</p>}
          <button type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
