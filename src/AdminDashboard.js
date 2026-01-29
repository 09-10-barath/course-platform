import React, { useState } from 'react';
import './AdminDashboard.css';

const initialCourses = [
  { id: 1, title: 'React Basics', students: 120 },
  { id: 2, title: 'JavaScript Advanced', students: 80 },
  { id: 3, title: 'CSS Flex & Grid', students: 60 },
];

const AdminDashboard = () => {
  const [courses, setCourses] = useState(initialCourses);
  const [newCourse, setNewCourse] = useState('');

  const handleAddCourse = () => {
    if (newCourse.trim() === '') return;
    const nextId = courses.length ? courses[courses.length - 1].id + 1 : 1;
    setCourses([...courses, { id: nextId, title: newCourse, students: 0 }]);
    setNewCourse('');
  };

  const handleDeleteCourse = (id) => {
    setCourses(courses.filter(course => course.id !== id));
  };

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>

      <div className="add-course">
        <input
          type="text"
          placeholder="New Course Title"
          value={newCourse}
          onChange={(e) => setNewCourse(e.target.value)}
        />
        <button onClick={handleAddCourse}>Add Course</button>
      </div>

      <div className="course-table">
        <h2>Courses</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Students Enrolled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.title}</td>
                <td>{course.students}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDeleteCourse(course.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
