import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { RootLayout } from "./components/RootLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "courses", Component: Courses },
      { path: "courses/:id", Component: CourseDetail },
    ],
  },
]);
