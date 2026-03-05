"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videosRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const dbError_1 = require("../../utils/dbError");
const ordering_1 = require("../../utils/ordering");
exports.videosRouter = (0, express_1.Router)();
/** GET /api/videos/:videoId - auth; meta, section/subject, prev/next, locked */
exports.videosRouter.get("/:videoId", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const videoId = req.params.videoId;
        const lesson = await db_1.prisma.lesson.findUnique({
            where: { id: videoId },
            include: {
                section: { include: { course: true } },
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: { message: "Video not found" } });
        }
        const subjectId = lesson.section.courseId;
        const sections = await db_1.prisma.section.findMany({
            where: { courseId: subjectId },
            orderBy: { order: "asc" },
            include: { lessons: { orderBy: { order: "asc" } } },
        });
        const sectionsForOrder = sections.map((sec) => ({
            id: sec.id,
            title: sec.title,
            order: sec.order,
            lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
        }));
        const flatVideos = (0, ordering_1.getFlattenedVideos)(sectionsForOrder);
        const progressList = await db_1.prisma.lessonProgress.findMany({
            where: { userId, courseId: subjectId },
        });
        const completedSet = new Set(progressList.filter((p) => p.isCompleted).map((p) => p.lessonId));
        const locked = (0, ordering_1.isVideoLocked)(flatVideos, videoId, completedSet);
        const { previous_video_id, next_video_id } = (0, ordering_1.getPrevNextVideoId)(flatVideos, videoId);
        const lessonAny = lesson;
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
    }
    catch (err) {
        console.error("GET /api/videos/:videoId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load video" },
        });
    }
});
