"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
exports.progressRouter = (0, express_1.Router)();
exports.progressRouter.use(authMiddleware_1.authMiddleware);
exports.progressRouter.post("/users/:userId/progress", async (req, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const { courseId, lessonId, lastPositionSeconds, isCompleted } = req.body;
    const clamped = Math.max(0, Math.floor(lastPositionSeconds || 0));
    const progress = await db_1.prisma.lessonProgress.upsert({
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
exports.progressRouter.get("/users/:userId/progress/:courseId", async (req, res) => {
    const { userId, courseId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const progresses = await db_1.prisma.lessonProgress.findMany({
        where: { userId, courseId },
    });
    const lessons = {};
    for (const p of progresses) {
        lessons[p.lessonId] = {
            lastPositionSeconds: p.lastPositionSeconds,
            isCompleted: p.isCompleted,
            updatedAt: p.updatedAt.toISOString(),
        };
    }
    res.json({ courseId, lessons });
});
exports.progressRouter.get("/courses/:courseId/progress-summary", async (req, res) => {
    const userId = req.user.sub;
    const { courseId } = req.params;
    const totalLessons = await db_1.prisma.lesson.count({
        where: { section: { courseId } },
    });
    const completedLessons = await db_1.prisma.lessonProgress.count({
        where: { userId, courseId, isCompleted: true },
    });
    const percentComplete = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    res.json({
        totalLessons,
        completedLessons,
        percentComplete,
    });
});
