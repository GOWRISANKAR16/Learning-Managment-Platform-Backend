import { Router } from "express";
import { prisma } from "../../config/db";
import { isDbConnectionError } from "../../utils/dbError";

export const coursesRouter = Router();

function toTitleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapCourseForApi(course: any) {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    category: toTitleCase(course.category),
    difficulty: toTitleCase(course.difficulty),
    description: course.description,
    instructor: course.instructor,
    thumbnailUrl: course.thumbnailUrl,
    totalMinutes: course.totalMinutes ?? undefined,
    sections: (course.sections || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      lessons: (s.lessons || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        youtubeUrl: l.youtubeUrl,
        durationMinutes: l.durationMinutes ?? undefined,
      })),
    })),
  };
}

coursesRouter.get("/", async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    const payload = courses.map(mapCourseForApi);
    res.status(200).json(payload);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("GET /courses error:", e?.code, e?.message, err);
    const status = isDbConnectionError(err) ? 503 : 500;
    const message =
      status === 503 ? "Database temporarily unavailable" : "Failed to load courses";
    res.status(status).json({ error: { message } });
  }
});

coursesRouter.get("/:courseId", async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Course not found" } });
    }
    res.status(200).json(mapCourseForApi(course));
  } catch (err) {
    console.error("GET /courses/:courseId error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    const message =
      status === 503 ? "Database temporarily unavailable" : "Failed to load course";
    res.status(status).json({ error: { message } });
  }
});

coursesRouter.get("/:courseId/lessons", async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Course not found" } });
    }

    const sections = await prisma.section.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    });

    const lessons = sections.flatMap((s: { lessons: any[] }) => s.lessons);

    res.status(200).json({ course: mapCourseForApi(course), lessons });
  } catch (err) {
    console.error("GET /courses/:courseId/lessons error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    const message =
      status === 503 ? "Database temporarily unavailable" : "Failed to load lessons";
    res.status(status).json({ error: { message } });
  }
});

coursesRouter.get("/:courseId/lessons/:lessonId", async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
    });
    if (!course) {
      return res.status(404).json({ error: { message: "Course not found" } });
    }

    const sections = await prisma.section.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    });

    const lessons = sections.flatMap((s: { lessons: any[] }) => s.lessons);
    const lesson = lessons.find((l: any) => l.id === req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({ error: { message: "Lesson not found" } });
    }

    res.status(200).json({ course: mapCourseForApi(course), lesson, lessons });
  } catch (err) {
    console.error("GET /courses/:courseId/lessons/:lessonId error:", err);
    const status = isDbConnectionError(err) ? 503 : 500;
    const message =
      status === 503 ? "Database temporarily unavailable" : "Failed to load lesson";
    res.status(status).json({ error: { message } });
  }
});

