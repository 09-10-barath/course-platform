const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// --- MongoDB connection ---
mongoose
  .connect("mongodb://127.0.0.1:27017/lmsDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// --- Schemas ---
// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  instructor: {
    name: String,
    bio: String,
    avatar: String,
  },
  duration: String,
  level: String,
  price: String,
  videoUrl: String,
  syllabus: [
    {
      title: String,
      length: String,
      type: String,
    },
  ],
  notes: [
    {
      id: String,
      title: String,
      href: String,
    },
  ],
  quiz: {
    id: String,
    title: String,
    questions: [
      {
        id: String,
        text: String,
        options: [String],
        correct: Number,
      },
    ],
  },
});
const Course = mongoose.model("Course", courseSchema);

// --- Middleware: JWT verification ---
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Access denied, token missing" });

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// --- Authentication Routes ---
// Signup
app.post("/api/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPass = await bcrypt.hash(password, 10);
    const user = new User({ email, username, password: hashedPass });
    await user.save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, "SECRET_KEY", { expiresIn: "1h" });

    res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// --- Course Routes ---
// Get all courses
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Error fetching courses", error: err.message });
  }
});

// Create a new course (Admin only)
app.post("/api/courses", verifyToken, async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: "Error creating course", error: err.message });
  }
});

// Get course by ID
app.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Error fetching course", error: err.message });
  }
});

// Update course (Admin only)
app.put("/api/courses/:id", verifyToken, async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Course not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Error updating course", error: err.message });
  }
});

// Delete course (Admin only)
app.delete("/api/courses/:id", verifyToken, async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: "Error deleting course", error: err.message });
  }
});

// Submit quiz
app.post("/api/courses/:id/quiz", async (req, res) => {
  try {
    const { answers } = req.body; // { questionId: optionIndex }
    const course = await Course.findById(req.params.id);
    if (!course || !course.quiz) return res.status(404).json({ message: "Quiz not found" });

    let score = 0;
    course.quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correct) score++;
    });

    res.json({ score, total: course.quiz.questions.length });
  } catch (err) {
    res.status(500).json({ message: "Error submitting quiz", error: err.message });
  }
});

// --- Start Server ---
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));






