import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginSignup from './LoginSignup';
import HomePage from './HomePage';
import CoursesPage from './CoursesPage';
import AboutPage from './AboutPage';
import ContactPage from './ContactPage';
import CoursePage from './CoursePage';
import AdminDashboard from './AdminDashboard';
import InstructorDashboard from './InstructorDashboard';
import StudentDashboard from './StudentDashboard';
import ResetPassword from './ResetPassword';
import StaticPage from './StaticPage';

const termsSections = [
  {
    heading: "Using the platform",
    body: [
      "AtomAcademy is built for learning, collaboration, and course delivery. By using the platform, you agree to use courses, notes, quizzes, and community spaces respectfully.",
      "Accounts, course progress, and dashboards are personal to the signed-in user. Sharing access or attempting to bypass permissions is not allowed.",
    ],
  },
  {
    heading: "Instructor and learner content",
    body: [
      "Learners may enroll in courses and use materials for personal education. Instructors are responsible for keeping course details accurate, current, and appropriate for their audience.",
      "We may remove or update content that is misleading, harmful, infringes on rights, or does not meet platform standards.",
    ],
  },
  {
    heading: "Service expectations",
    body: [
      "We work to keep the platform available and reliable, but features, course catalogs, and product experiences may change over time as the platform evolves.",
      "If you need support, you can contact the AtomAcademy team through the help center or contact page.",
    ],
  },
];

const privacySections = [
  {
    heading: "What we collect",
    body: [
      "AtomAcademy stores account information such as email, username, role, enrollments, and course progress so we can personalize the learning experience.",
      "We also store information submitted through forms such as password reset requests and contact flows when needed to operate the service.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "Your information is used to authenticate accounts, deliver courses, save progress, support instructors, and improve the platform experience.",
      "We do not use your personal information for unrelated purposes. Platform access is limited based on role and product needs.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can update your account details through your profile and contact the team if you need account assistance or data-related support.",
      "If policies materially change, the platform should provide an updated version here so learners and instructors can review the latest expectations.",
    ],
  },
];

const helpSections = [
  {
    heading: "Getting started",
    body: [
      "Create a learner account, browse the course catalog, enroll in a course, and use your dashboard to keep track of progress and quiz performance.",
      "If you are interested in teaching on AtomAcademy, use the contact page to request instructor access instead of creating an admin account.",
    ],
  },
  {
    heading: "Common support topics",
    body: [
      "Use the password reset flow if you cannot sign in. If a course video does not play inline, the course page includes a direct lesson link when available.",
      "Dashboard and course access depend on your account role, so make sure you are signed in with the correct account before troubleshooting permissions.",
    ],
  },
  {
    heading: "Need more help",
    body: [
      "For billing, enrollment, instructor onboarding, or technical issues, use the contact page and include the course name, account email, and a short description of the problem.",
    ],
  },
];

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginSignup />} />
        <Route path="/login" element={<LoginSignup />} />
        <Route path="/signup" element={<LoginSignup />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/terms"
          element={
            <StaticPage
              eyebrow="Legal"
              title="Terms of service"
              intro="Clear expectations help an online learning platform feel reliable and professional. These terms explain the basics of using AtomAcademy."
              sections={termsSections}
            />
          }
        />
        <Route
          path="/privacy"
          element={
            <StaticPage
              eyebrow="Privacy"
              title="Privacy policy"
              intro="This page explains the core account and learning data AtomAcademy uses to operate the platform experience."
              sections={privacySections}
            />
          }
        />
        <Route
          path="/help"
          element={
            <StaticPage
              eyebrow="Support"
              title="Help center"
              intro="Use this page for quick answers about account access, enrollment, and everyday learning support."
              sections={helpSections}
            />
          }
        />

        <Route path="/course" element={<CoursesPage />} />
        <Route path="/course/:id" element={<CoursePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/instructor" element={<InstructorDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
