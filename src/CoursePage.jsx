import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function UpdateCoursePage() {
  const { id } = useParams(); // 👈 get courseId from URL
  const courseId = id;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/courses/${courseId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setCourse(data);
      } catch (err) {
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchCourse();
  }, [courseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCourse((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(course),
      });
      if (!res.ok) throw new Error("Save failed");
      await res.json();
      setSuccess(true);
    } catch (err) {
      setError("Error saving course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading course…</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!course) return <div>No course found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gray-900 text-white rounded-lg">
      <h1 className="text-xl font-bold mb-4">Update Course</h1>

      {/* Title */}
      <label className="block mb-2">Title</label>
      <input
        name="title"
        value={course.title || ""}
        onChange={handleChange}
        className="w-full p-2 mb-4 rounded text-black"
      />

      {/* Subtitle */}
      <label className="block mb-2">Subtitle</label>
      <input
        name="subtitle"
        value={course.subtitle || ""}
        onChange={handleChange}
        className="w-full p-2 mb-4 rounded text-black"
      />

      {/* Video URL */}
      <label className="block mb-2">Video URL</label>
      <input
        name="videoUrl"
        value={course.videoUrl || ""}
        onChange={handleChange}
        className="w-full p-2 mb-4 rounded text-black"
      />

      {/* Notes */}
      <label className="block mb-2">Notes</label>
      {course.notes?.map((note, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
          <input
            value={note.title}
            onChange={(e) => {
              const updated = [...course.notes];
              updated[idx].title = e.target.value;
              setCourse({ ...course, notes: updated });
            }}
            className="flex-1 p-2 rounded text-black"
          />
          <input
            value={note.href}
            onChange={(e) => {
              const updated = [...course.notes];
              updated[idx].href = e.target.value;
              setCourse({ ...course, notes: updated });
            }}
            className="flex-1 p-2 rounded text-black"
          />
        </div>
      ))}

      {/* Quiz */}
      <label className="block mb-2 mt-4">Quiz</label>
      <input
        value={course.quiz?.title || ""}
        onChange={(e) =>
          setCourse({ ...course, quiz: { ...course.quiz, title: e.target.value } })
        }
        className="w-full p-2 mb-4 rounded text-black"
      />

      {course.quiz?.questions?.map((q, idx) => (
        <div key={idx} className="mb-4 p-2 bg-gray-800 rounded">
          <input
            value={q.text}
            onChange={(e) => {
              const updated = [...course.quiz.questions];
              updated[idx].text = e.target.value;
              setCourse({ ...course, quiz: { ...course.quiz, questions: updated } });
            }}
            className="w-full p-2 mb-2 rounded text-black"
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded mt-4"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>

      {success && <div className="text-green-400 mt-2">✅ Saved successfully!</div>}
      {error && <div className="text-red-400 mt-2">{error}</div>}
    </div>
  );
}
