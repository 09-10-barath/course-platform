import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./HomePage.css";
import { getCourseVideoLinks } from "./courseLinks";
import { API_BASE } from "./config";

const HeroBadge = ({ text }) => <span className="hero-badge">{text}</span>;

const HOME_FALLBACK = {
  hero: {
    badge: "Open learning",
    headline: "Grow real-world skills with flexible, expert-led courses.",
    subhead:
      "AtomAcademy brings together top instructors, curated tracks, and project-based learning you can complete at your own pace.",
    ctaPrimary: "Start learning",
    ctaSecondary: "View catalog",
    searchPlaceholder: "Search by topic, instructor, or skill",
    categoriesTitle: "Explore categories",
    categoriesSubtitle: "Pick a track, follow a path, and learn with confidence.",
    featuredTitle: "Featured courses",
    featuredSubtitle: "Curated picks to help you level up fast.",
    popularTitle: "Popular with learners",
    popularSubtitle: "Courses learners are enrolling in this week.",
  },
  weeklySprint: {
    title: "Weekly sprint: Build a product UI",
    description:
      "Complete a practical UI challenge with mentor feedback and a portfolio-ready outcome.",
    metrics: [
      { label: "Learners", value: "4.6k" },
      { label: "Completions", value: "89%" },
      { label: "Avg. rating", value: "4.8/5" },
    ],
    cta: "Join sprint",
  },
  stats: [
    { label: "Active learners", value: "45k+" },
    { label: "Courses", value: "120+" },
    { label: "Mentors", value: "80+" },
    { label: "Countries", value: "32" },
  ],
  categories: [
    { label: "Web Development", count: "36 courses" },
    { label: "Product Design", count: "18 courses" },
    { label: "Data & Analytics", count: "22 courses" },
    { label: "Cloud & DevOps", count: "16 courses" },
    { label: "AI Foundations", count: "12 courses" },
    { label: "Career Growth", count: "10 courses" },
  ],
  cta: {
    title: "Learn with structure, not overwhelm.",
    description:
      "Get curated tracks, mentor support, and real projects that build confidence.",
    action: "Browse courses",
  },
  footer: {
    blurb:
      "AtomAcademy is a community-first learning platform for modern, job-ready skills.",
    newsletterTitle: "Stay in the loop",
    newsletterCopy: "Get course updates, new tracks, and learning tips every week.",
    copyright: "(c) 2026 AtomAcademy. All rights reserved.",
  },
};

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
        {[
          course.level || "All levels",
          course.isCollaborative
            ? course.collaborationLabel || "Partner course"
            : course.category || "Certificate",
        ].join(" | ")}
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

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [heroSearch, setHeroSearch] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [stats, setStats] = useState(HOME_FALLBACK.stats);
  const [categories, setCategories] = useState(HOME_FALLBACK.categories);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [popularCourses, setPopularCourses] = useState([]);
  const [hero, setHero] = useState(HOME_FALLBACK.hero);
  const [weeklySprint, setWeeklySprint] = useState(HOME_FALLBACK.weeklySprint);
  const [cta, setCta] = useState(HOME_FALLBACK.cta);
  const [footer, setFooter] = useState(HOME_FALLBACK.footer);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "instructor"
      ? "/instructor"
      : "/student";

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHome = async () => {
      setLoading(true);
      setError("");

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_BASE}/api/home`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          throw new Error(`Home API error: ${res.status}`);
        }

        const data = await res.json();
        if (!isMounted) return;

        setStats(Array.isArray(data.stats) ? data.stats : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setFeaturedCourses(
          Array.isArray(data.featuredCourses)
            ? data.featuredCourses.map(normalizeCourse)
            : []
        );
        setPopularCourses(
          Array.isArray(data.popularCourses)
            ? data.popularCourses.map(normalizeCourse)
            : []
        );
        setHero({
          badge: data.hero?.badge || HOME_FALLBACK.hero.badge,
          headline: data.hero?.headline || HOME_FALLBACK.hero.headline,
          subhead: data.hero?.subhead || HOME_FALLBACK.hero.subhead,
          ctaPrimary: data.hero?.ctaPrimary || HOME_FALLBACK.hero.ctaPrimary,
          ctaSecondary: data.hero?.ctaSecondary || HOME_FALLBACK.hero.ctaSecondary,
          searchPlaceholder:
            data.hero?.searchPlaceholder || HOME_FALLBACK.hero.searchPlaceholder,
          categoriesTitle:
            data.hero?.categoriesTitle || HOME_FALLBACK.hero.categoriesTitle,
          categoriesSubtitle:
            data.hero?.categoriesSubtitle || HOME_FALLBACK.hero.categoriesSubtitle,
          featuredTitle:
            data.hero?.featuredTitle || HOME_FALLBACK.hero.featuredTitle,
          featuredSubtitle:
            data.hero?.featuredSubtitle || HOME_FALLBACK.hero.featuredSubtitle,
          popularTitle: data.hero?.popularTitle || HOME_FALLBACK.hero.popularTitle,
          popularSubtitle:
            data.hero?.popularSubtitle || HOME_FALLBACK.hero.popularSubtitle,
        });
        setWeeklySprint({
          title: data.weeklySprint?.title || HOME_FALLBACK.weeklySprint.title,
          description:
            data.weeklySprint?.description || HOME_FALLBACK.weeklySprint.description,
          metrics: Array.isArray(data.weeklySprint?.metrics)
            ? data.weeklySprint.metrics
            : HOME_FALLBACK.weeklySprint.metrics,
          cta: data.weeklySprint?.cta || HOME_FALLBACK.weeklySprint.cta,
        });
        setCta({
          title: data.cta?.title || HOME_FALLBACK.cta.title,
          description: data.cta?.description || HOME_FALLBACK.cta.description,
          action: data.cta?.action || HOME_FALLBACK.cta.action,
        });
        setFooter({
          blurb: data.footer?.blurb || HOME_FALLBACK.footer.blurb,
          newsletterTitle:
            data.footer?.newsletterTitle || HOME_FALLBACK.footer.newsletterTitle,
          newsletterCopy:
            data.footer?.newsletterCopy || HOME_FALLBACK.footer.newsletterCopy,
          copyright: data.footer?.copyright || HOME_FALLBACK.footer.copyright,
        });
      } catch {
        if (!isMounted) return;
        setError("Live course feed is unavailable right now. Showing saved homepage content.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHome();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const term = heroSearch.trim();
    navigate(term ? `/course?q=${encodeURIComponent(term)}` : "/course");
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      setNewsletterMessage("Enter an email address to subscribe.");
      return;
    }

    setNewsletterMessage("Thanks. You are on the list for product and course updates.");
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
            {user && <Link to={dashboardPath}>Dashboard</Link>}
          </nav>
          <div className="header-actions">
            {user ? (
              <div className="profile">
                <div className="profile__avatar">
                  {(user.username || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="profile__info">
                  <span className="profile__name">{user.username || "User"}</span>
                  <span className="profile__email">{user.email}</span>
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

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            {hero.badge ? <HeroBadge text={hero.badge} /> : null}
            <h1>{hero.headline || ""}</h1>
            <p>{hero.subhead || ""}</p>
            <div className="hero-actions">
              {hero.ctaPrimary ? (
                <Link to="/course" className="btn btn-primary">
                  {hero.ctaPrimary}
                </Link>
              ) : null}
              {hero.ctaSecondary ? (
                <Link to="/course" className="btn btn-outline">
                  {hero.ctaSecondary}
                </Link>
              ) : null}
            </div>
            <form className="hero-search" onSubmit={handleHeroSearch}>
              <input
                type="text"
                placeholder={hero.searchPlaceholder || ""}
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-accent">
                Search
              </button>
            </form>
          </div>
          <div className="hero-card">
            <h3>{weeklySprint.title || ""}</h3>
            <p>{weeklySprint.description || ""}</p>
            <div className="hero-card__metrics">
              {weeklySprint.metrics.map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            {weeklySprint.cta ? (
              <Link to="/course" className="btn btn-primary">
                {weeklySprint.cta}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="categories">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{hero.categoriesTitle || ""}</h2>
              <p>{hero.categoriesSubtitle || ""}</p>
            </div>
            <Link to="/course" className="btn btn-ghost">
              View all categories
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <div key={category.label} className="category-card">
                <div className="category-icon">{category.label?.charAt(0) || ""}</div>
                <div>
                  <h4>{category.label}</h4>
                  <p>{category.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="courses">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{hero.featuredTitle || ""}</h2>
              <p>{hero.featuredSubtitle || ""}</p>
            </div>
            <Link to="/course" className="btn btn-outline">
              Browse all
            </Link>
          </div>
          <div className="course-grid">
            {featuredCourses.map((course) => (
              <CourseCard key={getCourseId(course)} course={course} tone="tone-primary" />
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <div>
            <h2>{cta.title || ""}</h2>
            <p>{cta.description || ""}</p>
          </div>
          {cta.action ? (
            <Link to="/course" className="btn btn-light">
              {cta.action}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="courses">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{hero.popularTitle || ""}</h2>
              <p>{hero.popularSubtitle || ""}</p>
            </div>
            <Link to="/course" className="btn btn-outline">
              See more
            </Link>
          </div>
          <div className="course-grid">
            {popularCourses.map((course) => (
              <CourseCard
                key={getCourseId(course)}
                course={course}
                tone="tone-secondary"
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">AA</span>
              <span className="brand-name">AtomAcademy</span>
            </div>
            <p>{footer.blurb || ""}</p>
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
            <h4>{footer.newsletterTitle || ""}</h4>
            <p>{footer.newsletterCopy || ""}</p>
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

      {loading || error ? (
        <div className="container" style={{ padding: "1.5rem 0" }}>
          {loading ? <p>Loading live content...</p> : null}
          {!loading && error ? <p>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export default HomePage;
