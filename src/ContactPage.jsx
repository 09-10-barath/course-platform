import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const ContactPage = () => {
  const [auth, setAuth] = useState({ token: "", user: null });
  const [footer, setFooter] = useState({
    blurb: "",
    newsletterTitle: "",
    newsletterCopy: "",
    copyright: "",
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "general",
    message: "",
  });

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

  useEffect(() => {
    const loadFooter = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/home`);
        if (!res.ok) return;
        const data = await res.json();
        setFooter({
          blurb: data.footer?.blurb || "",
          newsletterTitle: data.footer?.newsletterTitle || "",
          newsletterCopy: data.footer?.newsletterCopy || "",
          copyright: data.footer?.copyright || "",
        });
      } catch {
        return;
      }
    };

    loadFooter();
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

  const handleSubmit = (event) => {
    event.preventDefault();
    setForm({ name: "", email: "", topic: "general", message: "" });
  };

  return (
    <div className="home">
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

      <section className="hero" style={{ paddingBottom: "2.5rem" }}>
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-badge">Contact</span>
            <h1>Let’s build the learning experience together.</h1>
            <p>
              Have a question about courses, partnerships, or support? Send us a
              message and we’ll respond within 24 hours.
            </p>
            <div className="hero-actions">
              <a href="mailto:support@atomacademy.com" className="btn btn-outline">
                Email support
              </a>
              <Link to="/course" className="btn btn-primary">
                Browse courses
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <h3>Contact details</h3>
            <p>Reach the team that powers the AtomAcademy community.</p>
            <div className="contact-details">
              <div className="contact-detail">
                <span className="contact-detail__label">Support email</span>
                <strong className="contact-detail__value">support@atomacademy.com</strong>
              </div>
              <div className="contact-detail">
                <span className="contact-detail__label">Phone</span>
                <strong className="contact-detail__value contact-detail__value--mono">
                  +91 8072416892
                </strong>
              </div>
              <div className="contact-detail">
                <span className="contact-detail__label">HQ</span>
                <strong className="contact-detail__value">Chennai (Remote-first)</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="courses">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Send us a message</h2>
              <p>We’d love to hear about your learning goals.</p>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form__grid">
              <label className="contact-field">
                <span>Full name</span>
                <input
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label className="contact-field">
                <span>Email address</span>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </label>
              <label className="contact-field">
                <span>Topic</span>
                <select
                  value={form.topic}
                  onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                >
                  <option value="general">General inquiry</option>
                  <option value="support">Support request</option>
                  <option value="partnerships">Partnerships</option>
                  <option value="instructors">Become an instructor</option>
                </select>
              </label>
              <label className="contact-field contact-field--full">
                <span>Message</span>
                <textarea
                  rows={6}
                  placeholder="Tell us what you need help with."
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="contact-form__actions">
              <button className="btn btn-primary" type="submit">
                Send message
              </button>
              <span className="contact-form__note">
                We usually reply within 24 hours.
              </span>
            </div>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">AA</span>
              <span className="brand-name">AtomAcademy</span>
            </div>
            <p>{footer.blurb || "Learn without limits and build skills for the future."}</p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li>
                <Link to="/course">Courses</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
              <li>
                <Link to="/terms">Terms</Link>
              </li>
              <li>
                <Link to="/help">Help center</Link>
              </li>
            </ul>
          </div>
          <div className="footer-newsletter">
            <h4>{footer.newsletterTitle || "Stay in the loop"}</h4>
            <p>{footer.newsletterCopy || "Get course updates and learning tips."}</p>
            <div className="newsletter">
              <input type="email" placeholder="Email address" />
              <button className="btn btn-primary">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>{footer.copyright || "© 2026 AtomAcademy. All rights reserved."}</p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
