import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";

export const progressRouter = Router();

progressRouter.post("/users/:userId/progress", authMiddleware, async (req: AuthenticatedRequest, res) => {
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

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    update: {
      lastPositionSeconds: clamped,
      isCompleted: isCompleted ?? false,
    },
    create: {
      userId,
      courseId,
      lessonId,
      lastPositionSeconds: clamped,
      isCompleted: isCompleted ?? false,
    },
  });

  res.json({ success: true, progress });
});

progressRouter.get(
  "/users/:userId/progress/:courseId",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    const { userId, courseId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const progresses = await prisma.lessonProgress.findMany({
      where: { userId, courseId },
    });

    const lessons: Record<
      string,
      { lastPositionSeconds: number; isCompleted: boolean; updatedAt: string }
    > = {};

    for (const p of progresses) {
      lessons[p.lessonId] = {
        lastPositionSeconds: p.lastPositionSeconds,
        isCompleted: p.isCompleted,
        updatedAt: p.updatedAt.toISOString(),
      };
    }

    res.json({ courseId, lessons });
  }
);

progressRouter.get(
  "/courses/:courseId/progress-summary",
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.sub;
    const { courseId } = req.params;

    const totalLessons = await prisma.lesson.count({
      where: { section: { courseId } },
    });
    const completedLessons = await prisma.lessonProgress.count({
      where: { userId, courseId, isCompleted: true },
    });

    const percentComplete =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    res.json({
      totalLessons,
      completedLessons,
      percentComplete,
    });
  }
);

