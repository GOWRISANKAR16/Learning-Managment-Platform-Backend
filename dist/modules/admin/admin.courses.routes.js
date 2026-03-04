"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCoursesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const authMiddleware_1 = require("../../middleware/authMiddleware");
exports.adminCoursesRouter = (0, express_1.Router)();
exports.adminCoursesRouter.use(authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)("admin"));
exports.adminCoursesRouter.get("/", async (_req, res) => {
    const courses = await db_1.prisma.course.findMany({
        include: {
            sections: {
                include: { lessons: true },
            },
        },
    });
    res.json(courses);
});
exports.adminCoursesRouter.post("/", async (req, res) => {
    const { title, instructor, difficulty, thumbnailUrl, category, description, sections, slug, } = req.body;
    const course = await db_1.prisma.course.create({
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
                    create: sections.map((s) => ({
                        title: s.title,
                        order: s.order,
                        lessons: {
                            create: (s.lessons || []).map((l) => ({
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
exports.adminCoursesRouter.put("/:courseId", async (req, res) => {
    const { title, instructor, difficulty, thumbnailUrl, category, description } = req.body;
    const existing = await db_1.prisma.course.findUnique({
        where: { id: req.params.courseId },
    });
    if (!existing) {
        return res.status(404).json({ error: { message: "Course not found" } });
    }
    const course = await db_1.prisma.course.update({
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
exports.adminCoursesRouter.delete("/:courseId", async (req, res) => {
    await db_1.prisma.course.delete({
        where: { id: req.params.courseId },
    });
    res.status(204).send();
});
