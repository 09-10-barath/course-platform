require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const app = express();
app.use(express.json());
app.use(cors());

// --- MongoDB connection ---
const MONGO_URI = process.env.MONGODB_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ADMIN_SEED = {
  email: "sbarath281@gmail.com",
  username: "Admin",
  password: "admin@281",
  role: "admin",
};

const MAIL_CONFIG = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  fromName: process.env.SMTP_FROM_NAME || "AtomAcademy",
  fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
};

if (!MONGO_URI) {
  console.error("MongoDB URI missing. Set MONGODB_URI in your .env file before starting the backend.");
  process.exit(1);
}

console.log("Mail config loaded:", {
  hasUser: Boolean(MAIL_CONFIG.user),
  hasPass: Boolean(MAIL_CONFIG.pass),
  hasFromEmail: Boolean(MAIL_CONFIG.fromEmail),
  appBaseUrl: MAIL_CONFIG.appBaseUrl,
});

// --- Schemas ---
// User Schema with validation
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema, "users");

const ensureAdminSeed = async () => {
  try {
    const email = ADMIN_SEED.email.trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
      }
      return;
    }
    const hashedPass = await bcrypt.hash(ADMIN_SEED.password, 10);
    const adminUser = new User({
      email,
      username: ADMIN_SEED.username,
      password: hashedPass,
      role: "admin",
    });
    await adminUser.save();
    console.log("Admin seed created:", email);
  } catch (err) {
    console.log("Admin seed error:", err.message);
  }
};

const createTransporter = () => {
  if (!MAIL_CONFIG.user || !MAIL_CONFIG.pass) return null;
  return nodemailer.createTransport({
    host: MAIL_CONFIG.host,
    port: MAIL_CONFIG.port,
    secure: MAIL_CONFIG.secure,
    auth: {
      user: MAIL_CONFIG.user,
      pass: MAIL_CONFIG.pass,
    },
  });
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter || !MAIL_CONFIG.fromEmail) {
    console.log("Mail not configured. Skipping email to:", to);
    return;
  }
  await transporter.sendMail({
    from: `"${MAIL_CONFIG.fromName}" <${MAIL_CONFIG.fromEmail}>`,
    to,
    subject,
    html,
  });
};

const startServer = () => {
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("Course notes schema:", describeCourseNotesSchema());
  });
};

const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected");
    await ensureAdminSeed();
    startExternalCourseSyncScheduler();
    startServer();
  } catch (err) {
    console.error("DB Error:", err);
    console.error(
      "Failed to connect to MongoDB. Confirm your Atlas URI, credentials, and network access (IP whitelist)."
    );
    process.exit(1);
  }
};

connectToDatabase();

// Course Schema
const syllabusItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    length: { type: String, default: "" },
    type: { type: String, default: "" },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    title: { type: String, default: "" },
    href: { type: String, default: "" },
    content: { type: String, default: "" },
    type: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    text: { type: String, default: "" },
    options: { type: [String], default: [] },
    correct: { type: Number, default: 0 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    title: { type: String, default: "" },
    questions: { type: [quizQuestionSchema], default: [] },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    thumbnail: String,
    channelTitle: String,
    views: String,
    publishedAt: String,
    url: String,
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instructorName: String,
    duration: String,
    level: String,
    videoUrl: String,
    learningContent: String,
    providerUrl: String,
    providerCourseId: String,
    providerName: String,
    collaborationLabel: String,
    isExternal: { type: Boolean, default: false },
    isCollaborative: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    syncEnabled: { type: Boolean, default: false },
    syncFrequencyHours: { type: Number, default: 24 },
    lastSyncedAt: Date,
    syncStatus: { type: String, default: "idle" },
    syncError: String,
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isFree: { type: Boolean, default: true },
    syllabus: { type: [syllabusItemSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    quiz: { type: quizSchema, default: () => ({}) },
  },
  { timestamps: true }
);
const Course = mongoose.model("Course", courseSchema, "courses");

const describeCourseNotesSchema = () => {
  const notesPath = Course.schema.path("notes");
  const caster = notesPath?.caster;
  const nestedPaths = caster?.schema?.paths ? Object.keys(caster.schema.paths) : [];
  return {
    instance: notesPath?.instance || "unknown",
    casterInstance: caster?.instance || "unknown",
    nestedPaths,
  };
};

const homeDataPath = path.join(__dirname, "..", "server", "home-data.json");
const readHomeData = () => {
  try {
    const raw = fs.readFileSync(homeDataPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;
const getDatabaseStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || "unknown",
    host: mongoose.connection.host || "",
    name: mongoose.connection.name || "",
  };
};

const requireDatabaseConnection = (res) => {
  if (isDatabaseReady()) return true;
  res.status(503).json({
    message:
      "Database is disconnected. Check MongoDB Atlas network access and restart the backend.",
  });
  return false;
};

const normalizeCourse = (courseDoc) => {
  if (!courseDoc) return courseDoc;
  const course = courseDoc.toObject ? courseDoc.toObject() : courseDoc;
  const durationRaw = course.duration || course["Duration (hrs)"];
  const duration =
    typeof durationRaw === "number" ? `${durationRaw}h` : durationRaw || "";
  return {
    ...course,
    title: course.title || course["Course Name"] || course.name || "",
    subtitle: course.subtitle || course.description || "",
    instructorName: course.instructorName || course.Instructor || "",
    level: course.level || course.Level || "",
    duration,
    videoUrl: course.videoUrl || course["Video Link"] || "",
    channelTitle: course.channelTitle || course.Platform || "",
    providerUrl: course.providerUrl || "",
    providerName: course.providerName || course.channelTitle || course.Platform || "",
    collaborationLabel: course.collaborationLabel || "",
    isExternal: Boolean(course.isExternal),
    isCollaborative: Boolean(course.isCollaborative),
    status: course.status || "draft",
    syncEnabled: Boolean(course.syncEnabled),
    syncFrequencyHours: Number(course.syncFrequencyHours) || 24,
    lastSyncedAt: course.lastSyncedAt || null,
    syncStatus: course.syncStatus || "idle",
    syncError: course.syncError || "",
  };
};

const normalizeCourseStatus = (status) =>
  ["draft", "published"].includes(status) ? status : "draft";

const buildCoursePayload = (payload = {}, user = null) => ({
  ...payload,
  status: normalizeCourseStatus(payload.status),
  syncFrequencyHours: clampSyncFrequencyHours(payload.syncFrequencyHours),
  ...(user
    ? {
        instructorId: user.id,
        instructorName: payload.instructorName || user.username || "Instructor",
      }
    : {}),
});

const ensureCourseOwnership = async (courseId, req, res) => {
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404).json({ message: "Course not found" });
    return null;
  }

  if (req.user.role === "instructor" && !course.instructorId) {
    course.instructorId = req.user.id;
    if (!course.instructorName) {
      course.instructorName = req.user.username || "Instructor";
    }
    await course.save();
    return course;
  }

  if (req.user.role === "instructor" && String(course.instructorId) !== String(req.user.id)) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return course;
};

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const slugify = (value) =>
  String(value || "course")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";

const uniqueItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toStudyLines = (text) =>
  uniqueItems(
    normalizeText(text)
      .split(/\n|[.!?]+/g)
      .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((item) => item.length > 18)
  );

const extractTopics = (course) => {
  const syllabusTopics = (course.syllabus || [])
    .map((item) => item?.title)
    .filter(Boolean);
  const contentTopics = toStudyLines(course.learningContent)
    .slice(0, 8)
    .map((item) => item.split(/[:,-]/)[0].trim())
    .filter((item) => item.length > 3 && item.length < 80);

  return uniqueItems([
    course.title,
    course.subtitle,
    ...syllabusTopics,
    ...contentTopics,
  ]).slice(0, 8);
};

const buildGeneratedNotes = (course, studyLines, topics) => {
  const noteTitle = `${course.title || "Course"} Notes`;
  const overview = [
    `${course.title || "This course"} is designed to help students understand ${
      course.subtitle || "the main ideas covered in the lessons"
    }.`,
    course.level ? `Recommended level: ${course.level}.` : "",
    course.duration ? `Suggested study time: ${course.duration}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sections = [
    `# ${noteTitle}`,
    "",
    "## Course Overview",
    overview,
    "",
    "## Key Learning Points",
    ...(studyLines.length
      ? studyLines.slice(0, 8).map((line) => `- ${line}`)
      : topics.map((topic) => `- Review ${topic} and connect it to the course outcome.`)),
    "",
    "## Study Checklist",
    ...(topics.length
      ? topics.slice(0, 6).map((topic) => `- Revise: ${topic}`)
      : ["- Watch the lesson carefully.", "- Write down key definitions and examples."]),
    "",
    "## Quick Revision",
    "- Summarize the lesson in your own words.",
    "- Revisit the video and pause after each main section.",
    "- Practice one example for every major concept.",
  ].join("\n");

  return [
    {
      id: `generated-${Date.now()}`,
      title: noteTitle,
      href: "",
      content: sections,
      type: "generated",
      fileName: `${slugify(course.title)}-notes.md`,
    },
  ];
};

const buildGeneratedQuiz = (course, studyLines, topics) => {
  const fallbackOptions = [
    "Unrelated case study",
    "Optional topic outside the lesson",
    "Archived reference material",
    "Advanced content from another course",
  ];

  const focusOptions = uniqueItems([
    ...(topics.length ? topics : studyLines.slice(0, 4)),
    ...fallbackOptions,
  ]);

  const questions = [];
  const titleTopic = course.title || "the main topic";
  const subtitleTopic = course.subtitle || studyLines[0] || titleTopic;

  questions.push({
    id: "q-1",
    text: "What is the main focus of this course?",
    options: uniqueItems([
      titleTopic,
      ...focusOptions.filter((item) => item !== titleTopic),
    ]).slice(0, 4),
    correct: 0,
  });

  questions.push({
    id: "q-2",
    text: "Which description best matches this course?",
    options: uniqueItems([
      subtitleTopic,
      "A general platform orientation only",
      "A course with no guided learning outcomes",
      "A topic unrelated to the lesson video",
    ]).slice(0, 4),
    correct: 0,
  });

  const quizTopics = uniqueItems(topics.length ? topics : studyLines).slice(0, 3);
  quizTopics.forEach((topic, index) => {
    const options = uniqueItems([
      topic,
      ...focusOptions.filter((item) => item !== topic),
    ]).slice(0, 4);
    questions.push({
      id: `q-${index + 3}`,
      text: "Which topic is included in this lesson?",
      options,
      correct: 0,
    });
  });

  return {
    id: `quiz-${Date.now()}`,
    title: `${course.title || "Course"} Practice Quiz`,
    questions: questions.slice(0, 5),
  };
};

const buildCourseGenerationPrompt = (course) => {
  const syllabus = (course.syllabus || [])
    .map((item, index) => `${index + 1}. ${item?.title || "Lesson"}${item?.length ? ` (${item.length})` : ""}`)
    .join("\n");

  return [
    `Course title: ${course.title || "Untitled course"}`,
    `Subtitle: ${course.subtitle || "N/A"}`,
    `Level: ${course.level || "N/A"}`,
    `Duration: ${course.duration || "N/A"}`,
    `Video URL: ${course.videoUrl || "N/A"}`,
    "",
    "Transcript or lesson content:",
    course.learningContent || "N/A",
    "",
    "Syllabus:",
    syllabus || "N/A",
  ].join("\n");
};

const extractResponseText = (responseData) => {
  if (typeof responseData?.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (block?.type === "output_text" && typeof block.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
      if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  return "";
};

const sanitizeGeneratedNotes = (course, notes) => {
  const safeNotes = Array.isArray(notes) ? notes : [];
  return safeNotes
    .map((note, index) => ({
      id: String(note?.id || `generated-${Date.now()}-${index + 1}`),
      title: String(note?.title || `${course.title || "Course"} Notes`).trim(),
      href: "",
      content: normalizeText(note?.content || ""),
      type: "ai-generated",
      fileName:
        String(note?.fileName || "").trim() ||
        `${slugify(course.title)}-notes-${index + 1}.md`,
    }))
    .filter((note) => note.content);
};

const sanitizeGeneratedQuiz = (course, quiz) => {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const safeQuestions = questions
    .map((question, index) => {
      const options = uniqueItems(
        (Array.isArray(question?.options) ? question.options : [])
          .map((option) => String(option || "").trim())
          .filter(Boolean)
      ).slice(0, 4);

      const parsedCorrect = Number(question?.correct);
      const correct =
        Number.isInteger(parsedCorrect) && parsedCorrect >= 0 && parsedCorrect < options.length
          ? parsedCorrect
          : 0;

      if (!String(question?.text || "").trim() || options.length < 2) {
        return null;
      }

      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }

      return {
        id: String(question?.id || `q-${index + 1}`),
        text: String(question.text).trim(),
        options,
        correct,
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  return {
    id: String(quiz?.id || `quiz-${Date.now()}`),
    title: String(quiz?.title || `${course.title || "Course"} Practice Quiz`).trim(),
    questions: safeQuestions,
  };
};

const generateCourseMaterialsWithAI = async (course) => {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your .env file to use AI generation.");
  }

  const prompt = buildCourseGenerationPrompt(course);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      notes: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            content: { type: "string" },
            fileName: { type: "string" },
          },
          required: ["id", "title", "content", "fileName"],
        },
      },
      quiz: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          questions: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                options: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "string" },
                },
                correct: { type: "integer", minimum: 0, maximum: 3 },
              },
              required: ["id", "text", "options", "correct"],
            },
          },
        },
        required: ["id", "title", "questions"],
      },
    },
    required: ["notes", "quiz"],
  };

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      GEMINI_API_KEY
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You create concise course notes and multiple-choice quizzes for LMS platforms. Return only valid JSON that matches the provided schema. Keep the notes educational, clear, and ready for download. Keep quiz questions grounded in the provided lesson content.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
    },
    45000
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorBody}`.trim());
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text?.trim() || "";
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error("Gemini returned invalid JSON for course materials.");
  }

  const notes = sanitizeGeneratedNotes(course, parsed.notes);
  const quiz = sanitizeGeneratedQuiz(course, parsed.quiz);

  if (!notes.length) {
    throw new Error("Gemini did not return any valid notes.");
  }
  if (!quiz.questions.length) {
    throw new Error("Gemini did not return any valid quiz questions.");
  }

  return { notes, quiz };
};

const generateCourseMaterials = (course) => {
  const studyLines = toStudyLines(
    [
      course.subtitle,
      course.learningContent,
      ...(course.syllabus || []).map((item) => item?.title),
    ]
      .filter(Boolean)
      .join("\n")
  );
  const topics = extractTopics(course);

  return {
    notes: buildGeneratedNotes(course, studyLines, topics),
    quiz: buildGeneratedQuiz(course, studyLines, topics),
  };
};

const clampSyncFrequencyHours = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(168, Math.max(1, Math.round(parsed)));
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "AtomAcademySync/1.0",
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const extractMetaTag = (html, attribute, value) => {
  const regex = new RegExp(
    `<meta[^>]+${attribute}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const reverseRegex = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${value}["'][^>]*>`,
    "i"
  );
  return html.match(regex)?.[1] || html.match(reverseRegex)?.[1] || "";
};

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const extractMetadataFromHtml = (html, sourceUrl) => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtml(
    extractMetaTag(html, "property", "og:title") ||
      extractMetaTag(html, "name", "twitter:title") ||
      titleMatch?.[1] ||
      ""
  ).trim();

  const subtitle = decodeHtml(
    extractMetaTag(html, "name", "description") ||
      extractMetaTag(html, "property", "og:description") ||
      extractMetaTag(html, "name", "twitter:description") ||
      ""
  ).trim();

  const thumbnail = decodeHtml(
    extractMetaTag(html, "property", "og:image") ||
      extractMetaTag(html, "name", "twitter:image") ||
      ""
  ).trim();

  let providerName = "";
  try {
    providerName = new URL(sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    providerName = "";
  }

  return { title, subtitle, thumbnail, providerName };
};

const parseJsonLdBlocks = (html) => {
  const matches = [...String(html || "").matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  return matches
    .map((match) => match[1]?.trim())
    .filter(Boolean)
    .flatMap((raw) => {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    });
};

const pickCourseLikeJsonLd = (blocks) =>
  blocks.find((item) => {
    const type = item?.["@type"];
    const values = Array.isArray(type) ? type : [type];
    return values.some((entry) =>
      ["course", "videoobject", "creativework"].includes(String(entry || "").toLowerCase())
    );
  }) || null;

const extractProviderNameFromHost = (host) => {
  if (host.includes("youtube")) return "YouTube";
  if (host.includes("youtu.be")) return "YouTube";
  if (host.includes("udemy")) return "Udemy";
  if (host.includes("coursera")) return "Coursera";
  if (host.includes("edx")) return "edX";
  if (host.includes("skillshare")) return "Skillshare";
  return host.replace(/^www\./i, "");
};

const toTitleCase = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const inferTitleFromProviderUrl = (sourceUrl) => {
  try {
    const parsed = new URL(sourceUrl);
    const segment = parsed.pathname
      .split("/")
      .filter(Boolean)
      .pop();
    if (!segment) return "";
    return toTitleCase(
      decodeURIComponent(segment)
        .replace(/[-_]+/g, " ")
        .replace(/\.[a-z0-9]+$/i, "")
        .trim()
    );
  } catch {
    return "";
  }
};

const buildImportMetadata = ({ sourceUrl, host, metadata, course }) => ({
  title: metadata.title || "",
  subtitle: metadata.subtitle || "",
  thumbnail: metadata.thumbnail || "",
  providerName: metadata.providerName || extractProviderNameFromHost(host),
  providerUrl: sourceUrl,
  providerCourseId: course?.providerCourseId || "",
  channelTitle: metadata.providerName || extractProviderNameFromHost(host),
  videoUrl: metadata.videoUrl || course?.videoUrl || "",
  isExternal: true,
  isCollaborative: true,
  syncEnabled: true,
  syncFrequencyHours: clampSyncFrequencyHours(course?.syncFrequencyHours || 24),
  lastSyncedAt: new Date(),
  syncStatus: "success",
  syncError: "",
});

const importProviderCourseFromUrl = async (sourceUrl, existingCourse = null) => {
  const parsedUrl = new URL(sourceUrl);
  const host = parsedUrl.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtu.be") || host.includes("vimeo.com")) {
    const metadata = await fetchExternalCourseMetadata({
      providerUrl: sourceUrl,
      videoUrl: sourceUrl,
      subtitle: existingCourse?.subtitle || "",
    });
    return buildImportMetadata({ sourceUrl, host, metadata, course: existingCourse });
  }

  const res = await fetchWithTimeout(sourceUrl, {}, 15000);
  if (!res.ok) throw new Error(`Import failed: ${res.status}`);
  const html = await res.text();
  const pageMetadata = extractMetadataFromHtml(html, sourceUrl);
  const jsonLdBlocks = parseJsonLdBlocks(html);
  const jsonLd = pickCourseLikeJsonLd(jsonLdBlocks);

  const metadata = {
    title: jsonLd?.name || pageMetadata.title,
    subtitle:
      jsonLd?.description ||
      pageMetadata.subtitle ||
      existingCourse?.subtitle ||
      "",
    thumbnail:
      jsonLd?.image?.url ||
      jsonLd?.image ||
      pageMetadata.thumbnail ||
      "",
    providerName:
      jsonLd?.provider?.name ||
      jsonLd?.publisher?.name ||
      pageMetadata.providerName ||
      extractProviderNameFromHost(host),
  };

  const importData = buildImportMetadata({
    sourceUrl,
    host,
    metadata,
    course: existingCourse,
  });

  if (host.includes("udemy")) {
    importData.collaborationLabel = "Udemy partner course";
  } else if (host.includes("coursera")) {
    importData.collaborationLabel = "Coursera partner course";
  } else if (host.includes("edx")) {
    importData.collaborationLabel = "edX partner course";
  } else if (host.includes("skillshare")) {
    importData.collaborationLabel = "Skillshare partner course";
  } else if (host.includes("youtube") || host.includes("youtu.be")) {
    importData.collaborationLabel = "YouTube learning partner";
  } else {
    importData.collaborationLabel = existingCourse?.collaborationLabel || "Partner course";
  }

  return importData;
};

const buildFallbackImportedCourse = (sourceUrl, existingCourse = null, syncError = "") => {
  const parsed = new URL(sourceUrl);
  const host = parsed.hostname.toLowerCase();
  const providerName = extractProviderNameFromHost(host);
  const inferredTitle = inferTitleFromProviderUrl(sourceUrl);

  return {
    title: existingCourse?.title || inferredTitle || `${providerName} Course`,
    subtitle:
      existingCourse?.subtitle ||
      `Imported from ${providerName}. Review and complete the course details before publishing.`,
    providerName,
    providerUrl: sourceUrl,
    channelTitle: providerName,
    collaborationLabel: existingCourse?.collaborationLabel || "Partner course",
    videoUrl: existingCourse?.videoUrl || "",
    isExternal: true,
    isCollaborative: true,
    syncEnabled: true,
    syncFrequencyHours: clampSyncFrequencyHours(existingCourse?.syncFrequencyHours || 24),
    syncStatus: syncError ? "error" : "idle",
    syncError,
    lastSyncedAt: new Date(),
  };
};

const fetchExternalCourseMetadata = async (course) => {
  const sourceUrl = course.providerUrl || course.videoUrl || course.url;
  if (!sourceUrl) {
    throw new Error("No external provider URL found");
  }

  const parsedUrl = new URL(sourceUrl);
  const host = parsedUrl.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`,
      {},
      12000
    );
    if (!res.ok) throw new Error(`YouTube sync failed: ${res.status}`);
    const data = await res.json();
    return {
      title: data.title || "",
      thumbnail: data.thumbnail_url || "",
      providerName: data.author_name || "YouTube",
      videoUrl: sourceUrl,
    };
  }

  if (host.includes("vimeo.com")) {
    const res = await fetchWithTimeout(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(sourceUrl)}`,
      {},
      12000
    );
    if (!res.ok) throw new Error(`Vimeo sync failed: ${res.status}`);
    const data = await res.json();
    return {
      title: data.title || "",
      subtitle: data.description || "",
      thumbnail: data.thumbnail_url || "",
      providerName: data.author_name || "Vimeo",
      videoUrl: sourceUrl,
    };
  }

  const res = await fetchWithTimeout(sourceUrl, {}, 12000);
  if (!res.ok) throw new Error(`Page sync failed: ${res.status}`);
  const html = await res.text();
  return extractMetadataFromHtml(html, sourceUrl);
};

const applyExternalMetadata = (course, metadata) => {
  if (metadata.title) course.title = metadata.title;
  if (metadata.subtitle) course.subtitle = metadata.subtitle;
  if (metadata.thumbnail) course.thumbnail = metadata.thumbnail;
  if (metadata.providerName) {
    course.providerName = metadata.providerName;
    course.channelTitle = metadata.providerName;
  }
  if (metadata.videoUrl) course.videoUrl = metadata.videoUrl;
};

const syncExternalCourse = async (course) => {
  course.syncStatus = "syncing";
  course.syncError = "";
  await course.save();

  try {
    const metadata = await fetchExternalCourseMetadata(course);
    applyExternalMetadata(course, metadata);
    course.lastSyncedAt = new Date();
    course.syncStatus = "success";
    course.syncError = "";
    course.syncFrequencyHours = clampSyncFrequencyHours(course.syncFrequencyHours);
    await course.save();
    return course;
  } catch (err) {
    course.lastSyncedAt = new Date();
    course.syncStatus = "error";
    course.syncError = err.message;
    await course.save();
    throw err;
  }
};

let externalSyncTimer = null;
let externalSyncRunning = false;

const startExternalCourseSyncScheduler = () => {
  if (externalSyncTimer) return;

  const runSyncPass = async () => {
    if (externalSyncRunning) return;
    externalSyncRunning = true;

    try {
      const courses = await Course.find({
        isExternal: true,
        syncEnabled: true,
        providerUrl: { $exists: true, $ne: "" },
      });

      const now = Date.now();
      for (const course of courses) {
        const hours = clampSyncFrequencyHours(course.syncFrequencyHours);
        const lastSynced = course.lastSyncedAt ? new Date(course.lastSyncedAt).getTime() : 0;
        const isDue = !lastSynced || now - lastSynced >= hours * 60 * 60 * 1000;

        if (!isDue) continue;

        try {
          await syncExternalCourse(course);
        } catch (err) {
          console.log(`External sync failed for ${course._id}:`, err.message);
        }
      }
    } catch (err) {
      console.log("External sync scheduler error:", err.message);
    } finally {
      externalSyncRunning = false;
    }
  };

  runSyncPass().catch(() => null);
  externalSyncTimer = setInterval(() => {
    runSyncPass().catch(() => null);
  }, 15 * 60 * 1000);
};

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    quizScore: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
const Enrollment = mongoose.model("Enrollment", enrollmentSchema, "enrollments");

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);
passwordResetSchema.index({ email: 1, tokenHash: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema, "password_resets");

// --- Middleware: JWT verification ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Access denied, token missing" });
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      message: err?.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid token",
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

// --- Authentication Routes ---
// Signup
app.post("/api/signup", async (req, res) => {
  try {
    if (!requireDatabaseConnection(res)) return;
    const { email, username, password, role } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ message: "Email, username, and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const normalizedRole = ["student", "instructor"].includes(role) ? role : "student";
    const hashedPass = await bcrypt.hash(password, 10);
    const user = new User({ email: normalizedEmail, username, password: hashedPass, role: normalizedRole });
    await user.save();

    if (["student", "instructor"].includes(normalizedRole)) {
      sendMail({
        to: normalizedEmail,
        subject: "Welcome to AtomAcademy",
        html: `<p>Hi ${username},</p><p>Welcome to AtomAcademy! Your ${normalizedRole} account is ready.</p>`,
      }).catch((err) => console.log("Signup mail error:", err.message));
    }

    res.json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already registered" });
    }
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    if (!requireDatabaseConnection(res)) return;
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.role) {
      user.role = "student";
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: user._id, email: user.email, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// Me
app.get("/api/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Forgot password
app.post("/api/forgot-password", async (req, res) => {
  try {
    if (!requireDatabaseConnection(res)) return;
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await PasswordReset.create({ email: normalizedEmail, tokenHash, expiresAt });

      const resetUrl = `${MAIL_CONFIG.appBaseUrl}/reset-password?token=${token}&email=${encodeURIComponent(
        normalizedEmail
      )}`;
      sendMail({
        to: normalizedEmail,
        subject: "Reset your AtomAcademy password",
        html: `<p>We received a request to reset your AtomAcademy password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
      }).catch((err) => console.log("Reset mail error:", err.message));
    }

    res.json({ message: "If that email exists, a reset link was sent." });
  } catch (err) {
    res.status(500).json({ message: "Error sending reset link", error: err.message });
  }
});

// Reset password
app.post("/api/reset-password", async (req, res) => {
  try {
    if (!requireDatabaseConnection(res)) return;
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ message: "Email, token, and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const reset = await PasswordReset.findOne({
      email: normalizedEmail,
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (!reset) return res.status(400).json({ message: "Invalid or expired reset link" });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    reset.used = true;
    await reset.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password", error: err.message });
  }
});

// --- Course Routes ---
app.get("/api/health", (req, res) => {
  const db = getDatabaseStatus();
  res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    db,
  });
});

// Home data (used by front-end Home page)
app.get("/api/home", async (req, res) => {
  try {
    const baseData = readHomeData();
    if (!isDatabaseReady()) {
      return res.json({
        ...baseData,
        featuredCourses: Array.isArray(baseData.featuredCourses) ? baseData.featuredCourses : [],
        popularCourses: Array.isArray(baseData.popularCourses) ? baseData.popularCourses : [],
      });
    }
    const [featuredCourses, popularCourses] = await Promise.all([
      Course.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(6),
      Course.find({ isPopular: true }).sort({ createdAt: -1 }).limit(6),
    ]);

    res.json({
      ...baseData,
      featuredCourses: featuredCourses.map(normalizeCourse),
      popularCourses: popularCourses.map(normalizeCourse),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching home data", error: err.message });
  }
});

// Get all courses
app.get("/api/courses", async (req, res) => {
  try {
    if (!isDatabaseReady()) {
      return res.json([]);
    }
    const courses = await Course.find();
    res.json(courses.map(normalizeCourse));
  } catch (err) {
    res.status(500).json({ message: "Error fetching courses", error: err.message });
  }
});

// Create a new course (Instructor/Admin)
app.post("/api/courses", verifyToken, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const course = new Course(buildCoursePayload(req.body, req.user));
    await course.save();
    res.json(normalizeCourse(course));
  } catch (err) {
    res.status(400).json({ message: "Error creating course", error: err.message });
  }
});

// Import external provider course from URL
app.post(
  "/api/courses/import-provider",
  verifyToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const sourceUrl = String(req.body?.providerUrl || req.body?.url || "").trim();
      if (!sourceUrl) {
        return res.status(400).json({ message: "Provider URL is required" });
      }

      let imported;
      let importMessage = "Course imported successfully.";
      try {
        imported = await importProviderCourseFromUrl(sourceUrl);
      } catch (err) {
        imported = buildFallbackImportedCourse(sourceUrl, null, err.message);
        importMessage =
          "Course draft created from the URL, but live provider metadata could not be fetched.";
      }
      const course = new Course({
        ...buildCoursePayload(req.body, req.user),
        ...imported,
      });
      await course.save();
      res.json({ ...normalizeCourse(course), importMessage });
    } catch (err) {
      res.status(400).json({ message: "Provider import failed", error: err.message });
    }
  }
);

// Bulk create courses (Instructor/Admin)
app.post(
  "/api/courses/bulk",
  verifyToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Expected an array of courses" });
      }
      const payload = req.body.map((course) => buildCoursePayload(course, req.user));
      const created = await Course.insertMany(payload);
      res.json(created.map(normalizeCourse));
    } catch (err) {
      res.status(400).json({ message: "Error creating courses", error: err.message });
    }
  }
);

// Get course by ID
app.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(normalizeCourse(course));
  } catch (err) {
    res.status(500).json({ message: "Error fetching course", error: err.message });
  }
});

// Update course (Instructor/Admin)
app.put("/api/courses/:id", verifyToken, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const existing = await ensureCourseOwnership(req.params.id, req, res);
    if (!existing) return;
    const payload = buildCoursePayload(req.body);
    const updated = await Course.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Course not found" });
    res.json(normalizeCourse(updated));
  } catch (err) {
    res.status(400).json({ message: "Error updating course", error: err.message });
  }
});

// Auto-generate quiz and notes from course content
app.post(
  "/api/courses/:id/generate-materials",
  verifyToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const course = await ensureCourseOwnership(req.params.id, req, res);
      if (!course) return;

      const editableFields = [
        "title",
        "subtitle",
        "level",
        "duration",
        "videoUrl",
        "learningContent",
        "syllabus",
      ];
      editableFields.forEach((field) => {
        if (req.body?.[field] !== undefined) {
          course[field] = req.body[field];
        }
      });

      const hasGenerationSource = Boolean(
        String(course.learningContent || "").trim() ||
          String(course.subtitle || "").trim() ||
          (course.syllabus || []).some((item) => String(item?.title || "").trim())
      );
      if (!hasGenerationSource) {
        return res.status(400).json({
          message:
            "Add a transcript, lesson summary, subtitle, or syllabus topic before generating quiz and notes.",
        });
      }

      const generated = await generateCourseMaterialsWithAI(course);
      const generationMode = "ai";
      const generationMessage = "Materials generated with Gemini AI and saved to the course.";

      course.notes = generated.notes;
      course.quiz = generated.quiz;
      await course.save();

      res.json({
        ...normalizeCourse(course),
        generationMode,
        generationMessage,
      });
    } catch (err) {
      console.log("Generate materials error:", err.message);
      res.status(400).json({
        message: err.message || "Error generating materials",
        error: err.message,
      });
    }
  }
);

// Manual sync for external course metadata
app.post(
  "/api/courses/:id/sync-external",
  verifyToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const course = await ensureCourseOwnership(req.params.id, req, res);
      if (!course) return;

      if (!course.isExternal || !course.providerUrl) {
        return res.status(400).json({
          message: "This course must be marked as external and include a provider URL",
        });
      }

      await syncExternalCourse(course);
      res.json(normalizeCourse(course));
    } catch (err) {
      res.status(400).json({ message: "External sync failed", error: err.message });
    }
  }
);

app.post(
  "/api/courses/:id/import-provider",
  verifyToken,
  requireRole("instructor", "admin"),
  async (req, res) => {
    try {
      const course = await ensureCourseOwnership(req.params.id, req, res);
      if (!course) return;

      const sourceUrl = String(req.body?.providerUrl || course.providerUrl || "").trim();
      if (!sourceUrl) {
        return res.status(400).json({ message: "Provider URL is required" });
      }

      let imported;
      let importMessage = "Provider details imported successfully.";
      try {
        imported = await importProviderCourseFromUrl(sourceUrl, course);
      } catch (err) {
        imported = buildFallbackImportedCourse(sourceUrl, course, err.message);
        importMessage =
          "Provider link saved, but live metadata could not be fetched. You can finish the draft manually.";
      }
      Object.assign(course, imported);
      await course.save();

      res.json({ ...normalizeCourse(course), importMessage });
    } catch (err) {
      res.status(400).json({ message: "Provider import failed", error: err.message });
    }
  }
);

// Instructor: list own courses
app.get("/api/instructor/courses", verifyToken, requireRole("instructor"), async (req, res) => {
  try {
    const courses = await Course.find({ instructorId: req.user.id }).sort({ createdAt: -1 });
    res.json(courses.map(normalizeCourse));
  } catch (err) {
    res.status(500).json({ message: "Error fetching instructor courses", error: err.message });
  }
});

// Instructor: view students for a course
app.get("/api/instructor/courses/:id/students", verifyToken, requireRole("instructor"), async (req, res) => {
  try {
    const course = await ensureCourseOwnership(req.params.id, req, res);
    if (!course) return;
    const enrollments = await Enrollment.find({ courseId: course._id })
      .populate("studentId", "username email")
      .sort({ updatedAt: -1 });
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students", error: err.message });
  }
});

// Student: enroll in course
app.post("/api/courses/:id/enroll", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const enrollment = await Enrollment.create({
      studentId: req.user.id,
      courseId: course._id,
      instructorId: course.instructorId,
      lastAccessed: new Date(),
    });
    res.json(enrollment);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already enrolled" });
    }
    res.status(400).json({ message: "Error enrolling", error: err.message });
  }
});

// Student: get enrollments
app.get("/api/me/enrollments", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user.id })
      .populate("courseId", "title subtitle instructorName duration level")
      .sort({ updatedAt: -1 });
    res.json(
      enrollments.map((enr) => {
        const courseId = enr.courseId;
        if (courseId && typeof courseId === "object") {
          enr = enr.toObject ? enr.toObject() : enr;
          return {
            ...enr,
            courseId: normalizeCourse(courseId),
          };
        }
        return enr;
      })
    );
  } catch (err) {
    res.status(500).json({ message: "Error fetching enrollments", error: err.message });
  }
});

// Student: update progress
app.post("/api/enrollments/:id/progress", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const { progressPercent, quizScore } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
    if (String(enrollment.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (progressPercent !== undefined) {
      enrollment.progressPercent = Math.max(0, Math.min(100, Number(progressPercent)));
    }
    if (quizScore !== undefined) {
      enrollment.quizScore = Math.max(0, Math.min(100, Number(quizScore)));
    }
    enrollment.lastAccessed = new Date();
    await enrollment.save();
    res.json(enrollment);
  } catch (err) {
    res.status(400).json({ message: "Error updating progress", error: err.message });
  }
});

// Admin: overview
app.get("/api/admin/overview", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const db = getDatabaseStatus();
    if (!isDatabaseReady()) {
      return res.json({
        counts: { student: 0, instructor: 0, admin: 0 },
        users: [],
        courses: [],
        enrollments: 0,
        db,
      });
    }

    const [users, courses, enrollments] = await Promise.all([
      User.find().select("email username role").sort({ createdAt: -1 }),
      Course.find().sort({ createdAt: -1 }),
      Enrollment.countDocuments(),
    ]);
    const counts = users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      },
      { student: 0, instructor: 0, admin: 0 }
    );
    res.json({ counts, users, courses, enrollments, db });
  } catch (err) {
    res.status(500).json({ message: "Error fetching admin overview", error: err.message });
  }
});

// Delete course (Instructor can delete own courses, admin can delete any)
app.delete("/api/courses/:id", verifyToken, requireRole("instructor", "admin"), async (req, res) => {
  try {
    const existing = await ensureCourseOwnership(req.params.id, req, res);
    if (!existing) return;
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
    course.quiz.questions.forEach((q, index) => {
      const questionId = q.id || `q-${index + 1}`;
      if (answers?.[questionId] === q.correct) score++;
    });

    res.json({ score, total: course.quiz.questions.length });
  } catch (err) {
    res.status(500).json({ message: "Error submitting quiz", error: err.message });
  }
});

// --- Start Server ---
// Server startup happens after MongoDB connects successfully.
