import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { isDbConnectionError } from "../../utils/dbError";

export const apiProgressRouter = Router();

/** GET /api/progress/subjects/:subjectId - auth */
apiProgressRouter.get(
  "/subjects/:subjectId",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.sub;
      const subjectId = req.params.subjectId;

      const [totalVideos, completedVideos, lastProgress] = await Promise.all([
        prisma.lesson.count({ where: { section: { courseId: subjectId } } }),
        prisma.lessonProgress.count({
          where: { userId, courseId: subjectId, isCompleted: true },
        }),
        prisma.lessonProgress.findFirst({
          where: { userId, courseId: subjectId },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const percent_complete =
        totalVideos === 0 ? 0 : Math.round((completedVideos / totalVideos) * 100);

      res.status(200).json({
        total_videos: totalVideos,
        completed_videos: completedVideos,
        percent_complete,
        last_video_id: lastProgress?.lessonId ?? null,
        last_position_seconds: lastProgress?.lastPositionSeconds ?? null,
      });
    } catch (err) {
      console.error("GET /api/progress/subjects/:subjectId error:", err);
      const status = isDbConnectionError(err) ? 503 : 500;
      res.status(status).json({
        error: {
          message:
            status === 503 ? "Database temporarily unavailable" : "Failed to load progress",
        },
      });
    }
  }
);

/** GET /api/progress/videos/:videoId - auth */
apiProgressRouter.get(
  "/videos/:videoId",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.sub;
      const videoId = req.params.videoId;

      const p = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: videoId } },
      });

      res.status(200).json({
        last_position_seconds: p?.lastPositionSeconds ?? 0,
        is_completed: p?.isCompleted ?? false,
      });
    } catch (err) {
      console.error("GET /api/progress/videos/:videoId error:", err);
      const status = isDbConnectionError(err) ? 503 : 500;
      res.status(status).json({
        error: {
          message:
            status === 503 ? "Database temporarily unavailable" : "Failed to load progress",
        },
      });
    }
  }
);

/** POST /api/progress/videos/:videoId - auth, upsert, cap position */
apiProgressRouter.post(
  "/videos/:videoId",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.sub;
      const videoId = req.params.videoId;
      const body = req.body as { last_position_seconds?: number; is_completed?: boolean };

      const lesson = await prisma.lesson.findUnique({
        where: { id: videoId },
        include: { section: true },
      });
      if (!lesson) {
        return res.status(404).json({ error: { message: "Video not found" } });
      }
      const courseId = lesson.section.courseId;
      const maxSeconds =
        lesson.durationMinutes != null ? lesson.durationMinutes * 60 : undefined;
      let lastPositionSeconds = Math.max(0, Math.floor(Number(body.last_position_seconds) || 0));
      if (maxSeconds != null && lastPositionSeconds > maxSeconds) {
        lastPositionSeconds = maxSeconds;
      }

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: videoId } },
        update: {
          lastPositionSeconds,
          isCompleted: body.is_completed ?? false,
        },
        create: {
          userId,
          courseId,
          lessonId: videoId,
          lastPositionSeconds,
          isCompleted: body.is_completed ?? false,
        },
      });

      res.status(200).json({
        last_position_seconds: lastPositionSeconds,
        is_completed: body.is_completed ?? false,
      });
    } catch (err) {
      console.error("POST /api/progress/videos/:videoId error:", err);
      const status = isDbConnectionError(err) ? 503 : 500;
      res.status(status).json({
        error: {
          message:
            status === 503 ? "Database temporarily unavailable" : "Failed to update progress",
        },
      });
    }
  }
);
