import { Router } from "express";
import { prisma } from "../../config/db";
import { requireRole } from "../../middleware/roleMiddleware";
import { authMiddleware } from "../../middleware/authMiddleware";

export const adminCoursesRouter = Router();

adminCoursesRouter.use(authMiddleware, requireRole("admin"));

adminCoursesRouter.get("/", async (_req, res) => {
  const courses = await prisma.course.findMany({
    include: {
      sections: {
        include: { lessons: true },
      },
    },
  });
  res.json(courses);
});

adminCoursesRouter.post("/", async (req, res) => {
  const {
    title,
    instructor,
    difficulty,
    thumbnailUrl,
    category,
    description,
    sections,
    slug,
  } = req.body as any;

  const course = await prisma.course.create({
    data: {
      title,
      instructor,
      difficulty,
      thumbnailUrl,
      category,
      description,
      slug: slug || String(title).toLowerCase().replace(/\s+/g, "-"),
      sections: sections
        ? {
            create: (sections as any[]).map((s) => ({
              title: s.title,
              order: s.order,
              lessons: {
                create: (s.lessons || []).map((l: any) => ({
                  title: l.title,
                  order: l.order,
                  youtubeUrl: l.youtubeUrl,
                  durationMinutes: l.durationMinutes,
                })),
              },
            })),
          }
        : undefined,
    },
    include: {
      sections: {
        include: { lessons: true },
      },
    },
  });

  res.status(201).json(course);
});

adminCoursesRouter.put("/:courseId", async (req, res) => {
  const { title, instructor, difficulty, thumbnailUrl, category, description } = req.body;

  const existing = await prisma.course.findUnique({
    where: { id: req.params.courseId },
  });
  if (!existing) {
    return res.status(404).json({ error: { message: "Course not found" } });
  }

  const course = await prisma.course.update({
    where: { id: existing.id },
    data: {
      title,
      instructor,
      difficulty,
      thumbnailUrl,
      category,
      description,
    },
  });

  res.json(course);
});

adminCoursesRouter.delete("/:courseId", async (req, res) => {
  await prisma.course.delete({
    where: { id: req.params.courseId },
  });
  res.status(204).send();
});

