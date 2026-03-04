"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coursesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
exports.coursesRouter = (0, express_1.Router)();
exports.coursesRouter.get("/", async (_req, res) => {
    const courses = await db_1.prisma.course.findMany({
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
exports.coursesRouter.get("/:courseId", async (req, res) => {
    const course = await db_1.prisma.course.findUnique({
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
exports.coursesRouter.get("/:courseId/lessons", async (req, res) => {
    const course = await db_1.prisma.course.findUnique({
        where: { id: req.params.courseId },
    });
    if (!course) {
        return res.status(404).json({ error: { message: "Course not found" } });
    }
    const sections = await db_1.prisma.section.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
    });
    const lessons = sections.flatMap((s) => s.lessons);
    res.json({ course, lessons });
});
exports.coursesRouter.get("/:courseId/lessons/:lessonId", async (req, res) => {
    const course = await db_1.prisma.course.findUnique({
        where: { id: req.params.courseId },
    });
    if (!course) {
        return res.status(404).json({ error: { message: "Course not found" } });
    }
    const sections = await db_1.prisma.section.findMany({
        where: { courseId: course.id },
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
    });
    const lessons = sections.flatMap((s) => s.lessons);
    const lesson = lessons.find((l) => l.id === req.params.lessonId);
    if (!lesson) {
        return res.status(404).json({ error: { message: "Lesson not found" } });
    }
    res.json({ course, lesson, lessons });
});
