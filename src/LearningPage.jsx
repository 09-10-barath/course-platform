import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import './LearningPage.css';

const courses = {
  1: {
    title: 'React Basics',
    video: 'https://www.youtube.com/embed/dGcsHMXbSOA',
    notes: 'React is a JavaScript library for building user interfaces. It uses components to structure your app.',
    quiz: [
      { q: 'What is JSX?', a: 'A syntax extension for JavaScript that looks like HTML.' },
      { q: 'What is a component?', a: 'A reusable piece of UI in React.' },
    ],
  },
  2: {
    title: 'JavaScript Advanced',
    video: 'https://www.youtube.com/embed/hdI2bqOjy3c',
    notes: 'Advanced JS topics include closures, async/await, and higher-order functions.',
    quiz: [
      { q: 'What is a closure?', a: 'A function with access to variables from its outer scope.' },
      { q: 'What is hoisting?', a: 'JS behavior of moving variable and function declarations to the top.' },
    ],
  },
};

const LearningPage = () => {
  const { courseId } = useParams();
  const course = courses[courseId];
  const [activeTab, setActiveTab] = useState('video');
  const [quizIndex, setQuizIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (!course) return <div>Course not found!</div>;

  const handleNextQuiz = () => {
    if (quizIndex + 1 < course.quiz.length) {
      setQuizIndex(quizIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const progressPercent = completed
    ? 100
    : ((quizIndex / course.quiz.length) * 100).toFixed(0);

  return (
    <div className="learning-container">
      <h1>{course.title}</h1>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'video' ? 'active' : ''}
          onClick={() => setActiveTab('video')}
        >
          Video
        </button>
        <button
          className={activeTab === 'notes' ? 'active' : ''}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button
          className={activeTab === 'quiz' ? 'active' : ''}
          onClick={() => setActiveTab('quiz')}
        >
          Quiz
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'video' && (
          <iframe
            width="100%"
            height="400px"
            src={course.video}
            title={course.title}
            frameBorder="0"
            allowFullScreen
          ></iframe>
        )}

        {activeTab === 'notes' && <p>{course.notes}</p>}

        {activeTab === 'quiz' && (
          <div className="quiz-section">
            {!completed ? (
              <>
                <p><strong>Q:</strong> {course.quiz[quizIndex].q}</p>
                <p><strong>A:</strong> {course.quiz[quizIndex].a}</p>
                <button onClick={handleNextQuiz}>Next Question</button>
              </>
            ) : (
              <p>🎉 Quiz Completed!</p>
            )}
          </div>
        )}
      </div>

      {/* Learning Status */}
      <div className="status">
        <h3>Learning Progress</h3>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <p>{completed ? 'Completed ✅' : 'In Progress ⏳'}</p>
      </div>
    </div>
  );
};

export default LearningPage;

