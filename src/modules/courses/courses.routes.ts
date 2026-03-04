import { Router } from "express";
import { prisma } from "../../config/db";

export const coursesRouter = Router();

coursesRouter.get("/", async (_req, res) => {
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
  res.json(courses);
});

coursesRouter.get("/:courseId", async (req, res) => {
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
  res.json(course);
});

coursesRouter.get("/:courseId/lessons", async (req, res) => {
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

  res.json({ course, lessons });
});

coursesRouter.get("/:courseId/lessons/:lessonId", async (req, res) => {
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

  res.json({ course, lesson, lessons });
});

