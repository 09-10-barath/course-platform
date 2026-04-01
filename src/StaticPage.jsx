import React from "react";
import { Link } from "react-router-dom";
import "./StaticPage.css";

const StaticPage = ({ eyebrow, title, intro, sections }) => {
  return (
    <div className="static-page">
      <div className="static-page__shell">
        <Link to="/home" className="static-page__back">
          Back to home
        </Link>
        <div className="static-page__hero">
          <span className="static-page__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>

        <div className="static-page__content">
          {sections.map((section) => (
            <section key={section.heading} className="static-page__section">
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaticPage;
