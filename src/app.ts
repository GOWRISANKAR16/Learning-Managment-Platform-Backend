import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { coursesRouter } from "./modules/courses/courses.routes";
import { progressRouter } from "./modules/progress/progress.routes";

/** Convert a glob pattern (e.g. https://*.vercel.app) to a RegExp for origin matching */
function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = env.corsOrigins;
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, origin);
      const patterns = env.corsOriginPatterns;
      if (patterns.length > 0) {
        for (const pattern of patterns) {
          if (globToRegex(pattern).test(origin)) return cb(null, origin);
        }
      }
      return cb(null, false);
    },
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

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use(errorHandler);

