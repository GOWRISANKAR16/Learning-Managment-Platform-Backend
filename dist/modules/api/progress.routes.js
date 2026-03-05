"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiProgressRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const dbError_1 = require("../../utils/dbError");
exports.apiProgressRouter = (0, express_1.Router)();
/** GET /api/progress/subjects/:subjectId - auth */
exports.apiProgressRouter.get("/subjects/:subjectId", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const subjectId = req.params.subjectId;
        const [totalVideos, completedVideos, lastProgress] = await Promise.all([
            db_1.prisma.lesson.count({ where: { section: { courseId: subjectId } } }),
            db_1.prisma.lessonProgress.count({
                where: { userId, courseId: subjectId, isCompleted: true },
            }),
            db_1.prisma.lessonProgress.findFirst({
                where: { userId, courseId: subjectId },
                orderBy: { updatedAt: "desc" },
            }),
        ]);
        const percent_complete = totalVideos === 0 ? 0 : Math.round((completedVideos / totalVideos) * 100);
        res.status(200).json({
            total_videos: totalVideos,
            completed_videos: completedVideos,
            percent_complete,
            last_video_id: lastProgress?.lessonId ?? null,
            last_position_seconds: lastProgress?.lastPositionSeconds ?? null,
        });
    }
    catch (err) {
        console.error("GET /api/progress/subjects/:subjectId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: {
                message: status === 503 ? "Database temporarily unavailable" : "Failed to load progress",
            },
        });
    }
});
/** GET /api/progress/videos/:videoId - auth */
exports.apiProgressRouter.get("/videos/:videoId", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const videoId = req.params.videoId;
        const p = await db_1.prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId, lessonId: videoId } },
        });
        res.status(200).json({
            last_position_seconds: p?.lastPositionSeconds ?? 0,
            is_completed: p?.isCompleted ?? false,
        });
    }
    catch (err) {
        console.error("GET /api/progress/videos/:videoId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: {
                message: status === 503 ? "Database temporarily unavailable" : "Failed to load progress",
            },
        });
    }
});
/** POST /api/progress/videos/:videoId - auth, upsert, cap position */
exports.apiProgressRouter.post("/videos/:videoId", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const videoId = req.params.videoId;
        const body = req.body;
        const lesson = await db_1.prisma.lesson.findUnique({
            where: { id: videoId },
            include: { section: true },
        });
        if (!lesson) {
            return res.status(404).json({ error: { message: "Video not found" } });
        }
        const courseId = lesson.section.courseId;
        const maxSeconds = lesson.durationMinutes != null ? lesson.durationMinutes * 60 : undefined;
        let lastPositionSeconds = Math.max(0, Math.floor(Number(body.last_position_seconds) || 0));
        if (maxSeconds != null && lastPositionSeconds > maxSeconds) {
            lastPositionSeconds = maxSeconds;
        }
        await db_1.prisma.lessonProgress.upsert({
            where: { userId_lessonId: { userId, lessonId: videoId } },
            update: {
                lastPositionSeconds,
                isCompleted: body.is_completed ?? false,
            },
            create: {
                userId,
                courseId,
                lessonId: videoId,
                lastPositionSeconds,
                isCompleted: body.is_completed ?? false,
            },
        });
        res.status(200).json({
            last_position_seconds: lastPositionSeconds,
            is_completed: body.is_completed ?? false,
        });
    }
    catch (err) {
        console.error("POST /api/progress/videos/:videoId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: {
                message: status === 503 ? "Database temporarily unavailable" : "Failed to update progress",
            },
        });
    }
});
