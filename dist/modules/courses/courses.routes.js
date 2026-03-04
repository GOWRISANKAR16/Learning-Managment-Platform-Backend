"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coursesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const dbError_1 = require("../../utils/dbError");
exports.coursesRouter = (0, express_1.Router)();
function toTitleCase(s) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function mapCourseForApi(course) {
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
        sections: (course.sections || []).map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            lessons: (s.lessons || []).map((l) => ({
                id: l.id,
                title: l.title,
                order: l.order,
                youtubeUrl: l.youtubeUrl,
                durationMinutes: l.durationMinutes ?? undefined,
            })),
        })),
    };
}
exports.coursesRouter.get("/", async (_req, res) => {
    try {
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
        const payload = courses.map(mapCourseForApi);
        res.status(200).json(payload);
    }
    catch (err) {
        console.error("GET /courses error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        const message = status === 503 ? "Database temporarily unavailable" : "Failed to load courses";
        res.status(status).json({ error: { message } });
    }
});
exports.coursesRouter.get("/:courseId", async (req, res) => {
    try {
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
        res.status(200).json(mapCourseForApi(course));
    }
    catch (err) {
        console.error("GET /courses/:courseId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        const message = status === 503 ? "Database temporarily unavailable" : "Failed to load course";
        res.status(status).json({ error: { message } });
    }
});
exports.coursesRouter.get("/:courseId/lessons", async (req, res) => {
    try {
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
        res.status(200).json({ course: mapCourseForApi(course), lessons });
    }
    catch (err) {
        console.error("GET /courses/:courseId/lessons error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        const message = status === 503 ? "Database temporarily unavailable" : "Failed to load lessons";
        res.status(status).json({ error: { message } });
    }
});
exports.coursesRouter.get("/:courseId/lessons/:lessonId", async (req, res) => {
    try {
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
        res.status(200).json({ course: mapCourseForApi(course), lesson, lessons });
    }
    catch (err) {
        console.error("GET /courses/:courseId/lessons/:lessonId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        const message = status === 503 ? "Database temporarily unavailable" : "Failed to load lesson";
        res.status(status).json({ error: { message } });
    }
});
