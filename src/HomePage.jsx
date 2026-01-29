import React from "react";
import "./HomePage.css";
import { Link } from "react-router-dom";

const HomePage = () => {
  // Mock featured courses
  const featuredCourses = [
    { id: "course-1", title: "Intro to Web Development", description: "Learn the basics of HTML, CSS, and JavaScript." },
    { id: "course-2", title: "Advanced React & Node.js", description: "Build full-stack applications with React and Node.js." },
    { id: "course-3", title: "Python for Beginners", description: "Start programming with Python and solve real-world problems." },
  ];

  return (
    <div className="home-container">
      {/* Navbar */}
      <header className="navbar">
        <h1 className="logo">MyLMS</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/course">Course</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="auth-buttons">
          <Link to="/login" className="login-btn">Login</Link>
          <Link to="/signup" className="signup-btn">Sign Up</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div>
          <h2>Learn Anything, Anytime, Anywhere</h2>
          <p>Access 1000+ online courses from expert instructors. Boost your career and skills today.</p>
          <div className="search-bar">
            <input type="text" placeholder="What do you want to learn?" />
            <button>Search</button>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="featured">
        <h3>Featured Courses</h3>
        <div className="course-grid">
          {featuredCourses.map((course) => (
            <div key={course.id} className="course-card">
              <img
                src={`https://source.unsplash.com/random/400x200?sig=${course.id}&education`}
                alt={course.title}
              />
              <h4>{course.title}</h4>
              <p>{course.description}</p>
              {/* Link to CoursePage */}
              <Link to={`/course/${course.id}`} className="signup-btn mt-3 inline-block">
                Enroll Now →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why">
        <h3>Why Choose Our Platform?</h3>
        <div className="why-items">
          <div>
            <h4>📚 Quality Content</h4>
            <p>Learn from structured and curated resources.</p>
          </div>
          <div>
            <h4>👨‍🏫 Expert Instructors</h4>
            <p>Courses taught by experienced professionals.</p>
          </div>
          <div>
            <h4>🏆 Certifications</h4>
            <p>Get certified to boost your career opportunities.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h3>Ready to Start Your Learning Journey?</h3>
        <Link to="/signup">Join Now</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} MyLMS. All rights reserved.</p>
        <div>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

