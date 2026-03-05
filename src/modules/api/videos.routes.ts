import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { isDbConnectionError } from "../../utils/dbError";
import {
  getFlattenedVideos,
  getPrevNextVideoId,
  isVideoLocked,
  type SectionWithLessons,
} from "../../utils/ordering";

export const videosRouter = Router();

/** GET /api/videos/:videoId - auth; meta, section/subject, prev/next, locked */
videosRouter.get("/:videoId", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.sub;
    const videoId = req.params.videoId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: videoId },
      include: {
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      return res.status(404).json({ error: { message: "Video not found" } });
    }

    const subjectId = lesson.section.courseId;
    const sections = await prisma.section.findMany({
      where: { courseId: subjectId },
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    const sectionsForOrder: SectionWithLessons[] = sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      order: sec.order,
      lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
    }));
    const flatVideos = getFlattenedVideos(sectionsForOrder);
    const progressList = await prisma.lessonProgress.findMany({
      where: { userId, courseId: subjectId },
    });
    const completedSet = new Set(
      progressList.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );
    const locked = isVideoLocked(flatVideos, videoId, completedSet);
    const { previous_video_id, next_video_id } = getPrevNextVideoId(flatVideos, videoId);

    const lessonAny = lesson as { description?: string };
    res.status(200).json({
      id: lesson.id,
      title: lesson.title,
      description: lessonAny.description ?? "",
      youtube_url: lesson.youtubeUrl,
      order_index: lesson.order,
      duration_seconds: lesson.durationMinutes != null ? lesson.durationMinutes * 60 : null,
      section_id: lesson.sectionId,
      section_title: lesson.section.title,
      subject_id: subjectId,
      subject_title: lesson.section.course.title,
      previous_video_id,
      next_video_id,
      locked,
      unlock_reason: locked ? "Complete previous video" : null,
    });
  } catch (err) {
    console.error("GET /api/videos/:videoId error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    res.status(status).json({
      error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load video" },
    });
  }
});
