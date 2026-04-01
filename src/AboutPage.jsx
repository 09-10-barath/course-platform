import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const AboutPage = () => {
  const [auth, setAuth] = useState({ token: "", user: null });
  const [footer, setFooter] = useState({
    blurb: "",
    newsletterTitle: "",
    newsletterCopy: "",
    copyright: "",
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
            <span className="hero-badge">Our mission</span>
            <h1>Open learning for every learner, anywhere.</h1>
            <p>
              AtomAcademy is built to make high-quality learning accessible at
              scale. We connect learners with instructors, structured curricula,
              and real-world projects so skills translate into outcomes.
            </p>
            <div className="hero-actions">
              <Link to="/course" className="btn btn-primary">
                Explore courses
              </Link>
              <Link to="/contact" className="btn btn-outline">
                Talk to us
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <h3>What we believe</h3>
            <p>
              Learning should be flexible, community-powered, and driven by
              practical skills. We design courses with industry mentors and
              continue to improve based on learner feedback.
            </p>
            <div className="hero-card__metrics">
              <div>
                <strong>120+</strong>
                <span>Courses</span>
              </div>
              <div>
                <strong>45k</strong>
                <span>Learners</span>
              </div>
              <div>
                <strong>95%</strong>
                <span>Satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="categories" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>How AtomAcademy works</h2>
              <p>Designed to feel like a modern MOOC, but more personal.</p>
            </div>
          </div>
          <div className="category-grid">
            {[
              {
                title: "Structured learning paths",
                copy: "Curated sequences that guide you from fundamentals to mastery.",
              },
              {
                title: "Expert-led instruction",
                copy: "Courses built with instructors who teach from real experience.",
              },
              {
                title: "Community momentum",
                copy: "Join peer cohorts, track progress, and get feedback faster.",
              },
            ].map((item) => (
              <div key={item.title} className="category-card">
                <div className="category-icon">{item.title.charAt(0)}</div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <div>
            <h2>We help learners reach career-ready confidence.</h2>
            <p>
              Whether you are changing careers or leveling up, our courses are
              built to be practical, project-based, and supportive.
            </p>
          </div>
          <Link to="/course" className="btn btn-light">
            Start learning
          </Link>
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

export default AboutPage;
