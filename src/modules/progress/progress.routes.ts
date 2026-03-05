import { Router } from "express";
import { pool, query, queryOne } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";
import crypto from "crypto";

export const progressRouter = Router();

function uuid(): string {
  return crypto.randomUUID();
}

progressRouter.post(
  "/users/:userId/progress",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
      }

      const { courseId, lessonId, lastPositionSeconds, isCompleted } = req.body as {
        courseId: string;
        lessonId: string;
        lastPositionSeconds: number;
        isCompleted?: boolean;
      };

      const clamped = Math.max(0, Math.floor(lastPositionSeconds || 0));

      const existing = await queryOne<{ id: string }>(
        "SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
        [userId, lessonId]
      );

      if (existing) {
        await pool.execute(
          "UPDATE lesson_progress SET last_position_seconds = ?, is_completed = ? WHERE user_id = ? AND lesson_id = ?",
          [clamped, isCompleted ? 1 : 0, userId, lessonId]
        );
      } else {
        await pool.execute(
          "INSERT INTO lesson_progress (id, user_id, course_id, lesson_id, last_position_seconds, is_completed) VALUES (?, ?, ?, ?, ?, ?)",
          [uuid(), userId, courseId, lessonId, clamped, isCompleted ? 1 : 0]
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("POST /users/:userId/progress error:", err);
      res
        .status(500)
        .json({ error: { message: "Failed to update progress" } });
    }
  }
);

progressRouter.get(
  "/users/:userId/progress/:courseId",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, courseId } = req.params;
      if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
      }

      const rows = await query<{ lesson_id: string; last_position_seconds: number; is_completed: number; updated_at: Date }[]>(
        "SELECT lesson_id, last_position_seconds, is_completed, updated_at FROM lesson_progress WHERE user_id = ? AND course_id = ?",
        [userId, courseId]
      );

      const lessons: Record<
        string,
        { lastPositionSeconds: number; isCompleted: boolean; updatedAt: string }
      > = {};
      for (const p of rows || []) {
        lessons[p.lesson_id] = {
          lastPositionSeconds: p.last_position_seconds,
          isCompleted: Boolean(p.is_completed),
          updatedAt: new Date(p.updated_at).toISOString(),
        };
      }

      res.json({ courseId, lessons });
    } catch (err) {
      console.error("GET /users/:userId/progress/:courseId error:", err);
      res
        .status(500)
        .json({ error: { message: "Failed to load progress" } });
    }
  }
);

progressRouter.get(
  "/courses/:courseId/progress-summary",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.sub;
      const { courseId } = req.params;

      const totalResult = await queryOne<{ total: number }>(
        "SELECT COUNT(*) AS total FROM lessons l JOIN sections s ON l.section_id = s.id WHERE s.course_id = ?",
        [courseId]
      );
      const totalLessons = totalResult?.total ?? 0;

      const completedResult = await queryOne<{ completed: number }>(
        "SELECT COUNT(*) AS completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1",
        [userId, courseId]
      );
      const completedLessons = completedResult?.completed ?? 0;

      const percentComplete =
        totalLessons === 0
          ? 0
          : Math.round((completedLessons / totalLessons) * 100);

      res.json({
        totalLessons,
        completedLessons,
        percentComplete,
      });
    } catch (err) {
      console.error("GET /courses/:courseId/progress-summary error:", err);
      res
        .status(500)
        .json({ error: { message: "Failed to load progress summary" } });
    }
  }
);
