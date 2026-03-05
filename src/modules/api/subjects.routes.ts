import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { isDbConnectionError } from "../../utils/dbError";
import {
  getFlattenedVideos,
  isVideoLocked,
  type SectionWithLessons,
} from "../../utils/ordering";

export const subjectsRouter = Router();

/** GET /api/subjects - public, pagination + optional q */
subjectsRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    where.isPublished = true;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { slug: { contains: q } },
      ];
    }

    const [subjects, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.course.count({ where }),
    ]);

    const list = subjects.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      is_published: (s as { isPublished?: boolean }).isPublished ?? true,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    }));

    res.status(200).json({ items: list, total, page, pageSize });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("GET /api/subjects error:", e?.code, e?.message, err);
    const status = isDbConnectionError(err) ? 503 : 500;
    res.status(status).json({
      error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load subjects" },
    });
  }
});

/** GET /api/subjects/:subjectId - public */
subjectsRouter.get("/:subjectId", async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.subjectId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Subject not found" } });
    }
    const s = course as { isPublished?: boolean };
    res.status(200).json({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      is_published: s.isPublished ?? true,
      sections: course.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        order_index: sec.order,
        videos: sec.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          order_index: l.order,
          youtube_url: l.youtubeUrl,
          duration_seconds: l.durationMinutes != null ? l.durationMinutes * 60 : null,
        })),
      })),
    });
  } catch (err) {
    console.error("GET /api/subjects/:subjectId error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    res.status(status).json({
      error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load subject" },
    });
  }
});

/** GET /api/subjects/:subjectId/tree - auth, with locked + is_completed per video */
subjectsRouter.get("/:subjectId/tree", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.sub;
    const subjectId = req.params.subjectId;

    const course = await prisma.course.findUnique({
      where: { id: subjectId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Subject not found" } });
    }

    const progressList = await prisma.lessonProgress.findMany({
      where: { userId, courseId: subjectId },
    });
    const completedSet = new Set(
      progressList.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );

    const sectionsForOrder: SectionWithLessons[] = course.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      order: sec.order,
      lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
    }));
    const flatVideos = getFlattenedVideos(sectionsForOrder);

    const tree = {
      id: course.id,
      title: course.title,
      sections: course.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        order_index: sec.order,
        videos: sec.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          order_index: l.order,
          is_completed: completedSet.has(l.id),
          locked: isVideoLocked(flatVideos, l.id, completedSet),
        })),
      })),
    };

    res.status(200).json(tree);
  } catch (err) {
    console.error("GET /api/subjects/:subjectId/tree error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    res.status(status).json({
      error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load tree" },
    });
  }
});

/** GET /api/subjects/:subjectId/first-video - auth */
subjectsRouter.get("/:subjectId/first-video", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.sub;
    const subjectId = req.params.subjectId;

    const course = await prisma.course.findUnique({
      where: { id: subjectId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Subject not found" } });
    }

    const progressList = await prisma.lessonProgress.findMany({
      where: { userId, courseId: subjectId },
    });
    const completedSet = new Set(
      progressList.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );

    const sectionsForOrder: SectionWithLessons[] = course.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      order: sec.order,
      lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
    }));
    const flatVideos = getFlattenedVideos(sectionsForOrder);
    const firstUnlocked = flatVideos.find((v) => !isVideoLocked(flatVideos, v.id, completedSet));
    const video_id = firstUnlocked?.id ?? flatVideos[0]?.id ?? null;

    if (!video_id) {
      return res.status(404).json({ error: { message: "No videos in this subject" } });
    }
    res.status(200).json({ video_id });
  } catch (err) {
    console.error("GET /api/subjects/:subjectId/first-video error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    res.status(status).json({
      error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to get first video" },
    });
  }
});
