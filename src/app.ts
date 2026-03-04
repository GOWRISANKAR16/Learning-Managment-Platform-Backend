import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { coursesRouter } from "./modules/courses/courses.routes";
import { progressRouter } from "./modules/progress/progress.routes";
import { messagesRouter } from "./modules/messages/messages.routes";
import {
  adminAssignmentsRouter,
  assignmentsRouter,
} from "./modules/assignments/assignments.routes";
import { adminCoursesRouter } from "./modules/admin/admin.courses.routes";
import { adminUsersRouter } from "./modules/admin/admin.users.routes";

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

app.get("/", (_req, res) => {
  res.json({
    message: "LMS API",
    health: "/health",
    docs: "Use /auth, /courses, /users/.../progress, etc.",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/courses", coursesRouter);
app.use("/", progressRouter);
app.use("/", messagesRouter);
app.use("/", assignmentsRouter);
app.use("/admin/courses", adminCoursesRouter);
app.use("/admin/users", adminUsersRouter);
app.use("/admin/assignments", adminAssignmentsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use(errorHandler);

