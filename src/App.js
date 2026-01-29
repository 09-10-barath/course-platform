import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginSignup from './LoginSignup';
import HomePage from './HomePage';
import CoursePage from './CoursePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginSignup />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/course/:id" element={<CoursePage />} />       {/* Add more routes as needed */}
      
      </Routes>
    </Router>
  );
}

export default App;
