import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./HomePage.css";
import { getCourseVideoLinks } from "./courseLinks";
import { API_BASE } from "./config";

const getCourseId = (course) => course?._id || course?.id;

const normalizeCourse = (course) => {
  if (!course) return course;
  const durationRaw = course.duration || course["Duration (hrs)"];
  const videoLinks = getCourseVideoLinks(course);

  return {
    ...course,
    title: course.title || course["Course Name"] || "Untitled course",
    subtitle: course.subtitle || course.description || course.Category || "",
    instructorName: course.instructorName || course.Instructor || "",
    channelTitle: course.channelTitle || course.Platform || course.Instructor || "",
    providerName: course.providerName || course.channelTitle || course.Platform || "",
    providerUrl: course.providerUrl || "",
    collaborationLabel: course.collaborationLabel || "",
    isExternal: Boolean(course.isExternal),
    isCollaborative: Boolean(course.isCollaborative),
    level: course.level || course.Level || "",
    category: course.category || course.Category || "",
    duration:
      typeof durationRaw === "number" ? `${durationRaw}h` : durationRaw || "",
    videoUrl: videoLinks.embedUrl,
    watchUrl: videoLinks.watchUrl,
    publishedAt: course.publishedAt || course.createdAt || "",
  };
};

const CourseCard = ({ course, tone }) => (
  <article className={`course-card ${tone}`}>
    <div
      className="course-card__media"
      style={
        course.thumbnail
          ? { backgroundImage: `url(${course.thumbnail})` }
          : undefined
      }
    >
      <div className="course-card__media-overlay"></div>
      {!course.thumbnail ? (
        <div className="course-card__title-panel">
          <span className="course-card__title-badge">
            {course.collaborationLabel ||
              (course.isCollaborative ? "Collaborative" : course.category || course.level || "Course")}
          </span>
          <h4>{course.title}</h4>
          <p>{course.providerName || course.instructorName || course.channelTitle}</p>
        </div>
      ) : null}
      {course.duration ? (
        <div className="course-card__chip">{course.duration}</div>
      ) : null}
    </div>
    <div className="course-card__body">
      <div className="course-card__provider">
        <div className="course-card__provider-badge">
          {(course.providerName || course.instructorName || course.channelTitle || "A")
            .charAt(0)
            .toUpperCase()}
        </div>
        <span>{course.providerName || course.instructorName || course.channelTitle || "AtomAcademy"}</span>
      </div>
      <h3>{course.title}</h3>
      <p className="course-card__meta-line">
        [
          course.level || "All levels",
          course.isCollaborative ? course.collaborationLabel || "Partner course" : course.category || "Certificate",
        ].join(" | ")
      </p>
    </div>
    <div className="course-card__footer">
      <span className="course-card__access">
        {course.isExternal ? "External" : course.isFree ? "Free" : "Open"}
      </span>
      <Link
        to={`/course/${getCourseId(course)}`}
        className="btn btn-outline course-card__cta"
      >
        {course.isExternal ? "View details" : "Start learning"}
      </Link>
    </div>
  </article>
);

const CoursesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const DEFAULT_VISIBLE_COURSES = 12;
  const initialSearch = new URLSearchParams(location.search).get("q") || "";

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [level, setLevel] = useState("all");
  const [tab, setTab] = useState("all");
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [auth, setAuth] = useState({ token: "", user: null });
  const [footer, setFooter] = useState({
    blurb: "",
    newsletterTitle: "",
    newsletterCopy: "",
    copyright: "",
  });

  useEffect(() => {
    const nextSearch = new URLSearchParams(location.search).get("q") || "";
    setSearch(nextSearch);
  }, [location.search]);

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/api/courses`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load courses");
        setCourses(Array.isArray(data) ? data.map(normalizeCourse) : []);
      } catch (err) {
        setError(err.message || "Unable to load courses.");
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

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
        setFooter((prev) => prev);
      }
    };

    loadFooter();
  }, []);

  const levels = useMemo(() => {
    const items = new Set();
    courses.forEach((course) => {
      if (course.level) items.add(course.level);
    });
    return ["all", ...Array.from(items)];
  }, [courses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (tab === "featured" && !course.isFeatured) return false;
      if (tab === "popular" && !course.isPopular) return false;
      if (tab === "collaborative" && !course.isCollaborative) return false;
      if (level !== "all" && course.level !== level) return false;
      if (!term) return true;

      return (
        course.title?.toLowerCase().includes(term) ||
        course.subtitle?.toLowerCase().includes(term) ||
        course.instructorName?.toLowerCase().includes(term) ||
        course.providerName?.toLowerCase().includes(term) ||
        course.collaborationLabel?.toLowerCase().includes(term)
      );
    });
  }, [courses, level, search, tab]);

  const visibleCourses = showAllCourses
    ? filtered
    : filtered.slice(0, DEFAULT_VISIBLE_COURSES);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(location.search);
    const term = search.trim();

    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }

    navigate({
      pathname: "/course",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      setNewsletterMessage("Enter an email address to subscribe.");
      return;
    }

    setNewsletterMessage("Thanks. We will send new course drops and study tips there.");
    setNewsletterEmail("");
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
            <span className="hero-badge">Open learning</span>
            <h1>Browse hundreds of courses built for real-world skills.</h1>
            <p>
              Explore beginner to advanced tracks, curated by instructors and the
              community. Enroll instantly and learn at your own pace.
            </p>
            <form className="hero-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search by title, instructor, or topic"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-accent">
                Search
              </button>
            </form>
          </div>
          <div className="hero-card">
            <h3>Course discovery</h3>
            <p>Filter by level, spotlight featured content, or scan what is popular.</p>
            <div className="hero-card__metrics">
              <div>
                <strong>{courses.length}</strong>
                <span>Courses</span>
              </div>
              <div>
                <strong>{courses.filter((c) => c.isFeatured).length}</strong>
                <span>Featured</span>
              </div>
              <div>
                <strong>{courses.filter((c) => c.isPopular).length}</strong>
                <span>Popular</span>
              </div>
              <div>
                <strong>{courses.filter((c) => c.isCollaborative).length}</strong>
                <span>Collaborative</span>
              </div>
            </div>
            <Link to="/contact" className="btn btn-primary">
              Teach on AtomAcademy
            </Link>
          </div>
        </div>
      </section>

      <section className="categories" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Explore courses</h2>
              <p>Use filters to narrow down what you want to learn next.</p>
            </div>
            <div className="hero-actions">
              <button
                className={`btn ${tab === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                className={`btn ${tab === "featured" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("featured")}
              >
                Featured
              </button>
              <button
                className={`btn ${tab === "popular" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("popular")}
              >
                Popular
              </button>
              <button
                className={`btn ${tab === "collaborative" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("collaborative")}
              >
                Collaborative
              </button>
            </div>
          </div>
          <div className="hero-actions" style={{ marginTop: "1rem" }}>
            <label style={{ color: "#fff", fontWeight: 600 }}>Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{ padding: "0.6rem 0.8rem", borderRadius: "999px" }}
            >
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All levels" : item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="courses">
        <div className="container">
          {loading ? (
            <p className="dash-muted">Loading courses...</p>
          ) : error ? (
            <p className="dash-muted">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="dash-muted">No courses match your filters.</p>
          ) : (
            <>
              <div className="course-grid">
                {visibleCourses.map((course, index) => (
                  <CourseCard
                    key={getCourseId(course)}
                    course={course}
                    tone={index % 2 === 0 ? "tone-primary" : "tone-secondary"}
                  />
                ))}
              </div>
              {filtered.length > DEFAULT_VISIBLE_COURSES ? (
                <div className="catalog-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowAllCourses((prev) => !prev)}
                  >
                    {showAllCourses ? "Show less" : `Show all ${filtered.length} courses`}
                  </button>
                </div>
              ) : null}
            </>
          )}
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
            <form className="newsletter" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                placeholder="Email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Subscribe
              </button>
            </form>
            {newsletterMessage ? (
              <p className="newsletter-feedback">{newsletterMessage}</p>
            ) : null}
          </div>
        </div>
        <div className="container footer-bottom">
          <p>{footer.copyright || "(c) 2026 AtomAcademy. All rights reserved."}</p>
        </div>
      </footer>
    </div>
  );
};

export default CoursesPage;
