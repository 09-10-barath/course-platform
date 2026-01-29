import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const url = isSignup ? "http://localhost:5000/api/signup" : "http://localhost:5000/api/login";

      const body = isSignup
        ? { email, username, password }
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
        setError("Signup successful! Please login.");
        setEmail("");
        setUsername("");
        setPassword("");
        return;
      }

      // Save login details
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Cannot connect to server. Is backend running?");
    }
  };

  return (
    <div className="container">
      <div className="login-box">
        <h2>{isSignup ? "Sign Up" : "Sign In"}</h2>
        <hr />

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
              <label htmlFor="username">&#128100;</label>
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

          <div className="input-group">
            <label htmlFor="password">&#128274;</label>
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "red", fontSize: "12px" }}>{error}</p>
          )}

          <p className="note">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <span
                  onClick={() => {
                    setIsSignup(false);
                    setError("");
                  }}
                  style={{ cursor: "pointer", color: "cyan" }}
                >
                  LOGIN
                </span>
              </>
            ) : (
              <>
                Don’t have an account?{" "}
                <span
                  onClick={() => {
                    setIsSignup(true);
                    setError("");
                  }}
                  style={{ cursor: "pointer", color: "cyan" }}
                >
                  SIGN UP
                </span>
              </>
            )}
          </p>

          <button type="submit">
            {isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;

