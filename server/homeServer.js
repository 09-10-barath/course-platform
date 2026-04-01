const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const dataPath = path.join(__dirname, "home-data.json");
const coursesPath = path.join(__dirname, "courses.json");
const enrollmentsPath = path.join(__dirname, "enrollments.json");

const readJson = (filePath, fallback) => {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
};

const writeJson = (filePath, payload) => {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  });
  res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });

const getCourses = () => readJson(coursesPath, []);
const saveCourses = (courses) => writeJson(coursesPath, courses);
const getEnrollments = () => readJson(enrollmentsPath, []);
const saveEnrollments = (enrollments) => writeJson(enrollmentsPath, enrollments);

const buildHomePayload = () => {
  const baseData = readJson(dataPath, {});
  const courses = getCourses();
  const featuredCourses = courses.filter((course) => course.isFeatured);
  const popularCourses = courses.filter((course) => course.isPopular);

  return {
    ...baseData,
    featuredCourses,
    popularCourses,
  };
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.url === "/api/home" && req.method === "GET") {
    const payload = buildHomePayload();
    sendJson(res, 200, payload);
    return;
  }

  if (req.url === "/api/courses" && req.method === "GET") {
    const courses = getCourses();
    sendJson(res, 200, courses);
    return;
  }

  if (req.url === "/api/courses" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const courses = getCourses();
      const course = {
        id: body.id || `course-${Date.now()}`,
        title: body.title || "Untitled course",
        subtitle: body.subtitle || "",
        instructorName: body.instructorName || "",
        level: body.level || "",
        duration: body.duration || "",
        channelTitle: body.channelTitle || body.instructorName || "",
        views: body.views || "",
        publishedAt: body.publishedAt || "",
        thumbnail: body.thumbnail || "",
        url: body.url || "",
        videoUrl: body.videoUrl || "",
        notes: Array.isArray(body.notes) ? body.notes : [],
        quiz: body.quiz || { title: "", questions: [] },
        isFeatured: Boolean(body.isFeatured),
        isPopular: Boolean(body.isPopular),
      };
      courses.push(course);
      saveCourses(courses);
      sendJson(res, 201, course);
    } catch (err) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
    return;
  }

  if (req.url === "/api/courses/bulk" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      if (!Array.isArray(body)) {
        sendJson(res, 400, { error: "Expected an array of courses" });
        return;
      }
      const courses = getCourses();
      const created = body.map((item) => ({
        id: item.id || `course-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: item.title || "Untitled course",
        subtitle: item.subtitle || "",
        instructorName: item.instructorName || "",
        level: item.level || "",
        duration: item.duration || "",
        channelTitle: item.channelTitle || item.instructorName || "",
        views: item.views || "",
        publishedAt: item.publishedAt || "",
        thumbnail: item.thumbnail || "",
        url: item.url || "",
        videoUrl: item.videoUrl || "",
        notes: Array.isArray(item.notes) ? item.notes : [],
        quiz: item.quiz || { title: "", questions: [] },
        isFeatured: Boolean(item.isFeatured),
        isPopular: Boolean(item.isPopular),
      }));
      courses.push(...created);
      saveCourses(courses);
      sendJson(res, 201, created);
    } catch (err) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
    return;
  }

  if (req.url && req.url.startsWith("/api/courses/")) {
    const parts = req.url.split("/").filter(Boolean);
    const courseId = parts[2];
    const subRoute = parts[3];

    if (subRoute === "enroll" && req.method === "POST") {
      const courses = getCourses();
      const course = courses.find((item) => item.id === courseId);
      if (!course) {
        sendJson(res, 404, { message: "Course not found" });
        return;
      }
      const enrollments = getEnrollments();
      const existing = enrollments.find((enr) => enr.courseId === courseId);
      if (existing) {
        sendJson(res, 200, existing);
        return;
      }
      const enrollment = {
        _id: `enr-${Date.now()}`,
        courseId,
        progressPercent: 0,
        quizScore: 0,
      };
      enrollments.push(enrollment);
      saveEnrollments(enrollments);
      sendJson(res, 200, enrollment);
      return;
    }

    if (req.method === "GET") {
      const courses = getCourses();
      const course = courses.find((item) => item.id === courseId);
      if (!course) {
        sendJson(res, 404, { error: "Course not found" });
        return;
      }
      sendJson(res, 200, course);
      return;
    }

    if (req.method === "PUT") {
      try {
        const body = await parseBody(req);
        const courses = getCourses();
        const index = courses.findIndex((item) => item.id === courseId);
        if (index === -1) {
          sendJson(res, 404, { error: "Course not found" });
          return;
        }
        const updated = {
          ...courses[index],
          ...body,
          id: courses[index].id,
        };
        courses[index] = updated;
        saveCourses(courses);
        sendJson(res, 200, updated);
      } catch (err) {
        sendJson(res, 400, { error: "Invalid JSON" });
      }
      return;
    }
  }

  if (req.url === "/api/me/enrollments" && req.method === "GET") {
    const enrollments = getEnrollments();
    sendJson(res, 200, enrollments);
    return;
  }

  if (req.url && req.url.startsWith("/api/enrollments/") && req.method === "POST") {
    const parts = req.url.split("/").filter(Boolean);
    const enrollmentId = parts[2];
    const subRoute = parts[3];
    if (subRoute !== "progress") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    try {
      const body = await parseBody(req);
      const enrollments = getEnrollments();
      const index = enrollments.findIndex((item) => item._id === enrollmentId);
      if (index === -1) {
        sendJson(res, 404, { message: "Enrollment not found" });
        return;
      }
      const updated = {
        ...enrollments[index],
        progressPercent: Number(body.progressPercent || 0),
        quizScore: Number(body.quizScore || 0),
      };
      enrollments[index] = updated;
      saveEnrollments(enrollments);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
    return;
  }

  if (req.url === "/api/admin/overview" && req.method === "GET") {
    const courses = getCourses();
    const enrollments = getEnrollments();
    const payload = {
      counts: {
        student: 0,
        instructor: 0,
        admin: 0,
      },
      enrollments: enrollments.length,
      courses,
      users: [],
    };
    sendJson(res, 200, payload);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
