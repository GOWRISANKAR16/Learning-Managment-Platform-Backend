"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subjectsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const dbError_1 = require("../../utils/dbError");
const ordering_1 = require("../../utils/ordering");
exports.subjectsRouter = (0, express_1.Router)();
/** GET /api/subjects - public, pagination + optional q */
exports.subjectsRouter.get("/", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20));
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
        const skip = (page - 1) * pageSize;
        const where = {};
        where.isPublished = true;
        if (q) {
            where.OR = [
                { title: { contains: q } },
                { description: { contains: q } },
                { slug: { contains: q } },
            ];
        }
        const [subjects, total] = await Promise.all([
            db_1.prisma.course.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    isPublished: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            db_1.prisma.course.count({ where }),
        ]);
        const list = subjects.map((s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            description: s.description,
            is_published: s.isPublished ?? true,
            created_at: s.createdAt.toISOString(),
            updated_at: s.updatedAt.toISOString(),
        }));
        res.status(200).json({ items: list, total, page, pageSize });
    }
    catch (err) {
        const e = err;
        console.error("GET /api/subjects error:", e?.code, e?.message, err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load subjects" },
        });
    }
});
/** GET /api/subjects/:subjectId - public */
exports.subjectsRouter.get("/:subjectId", async (req, res) => {
    try {
        const course = await db_1.prisma.course.findUnique({
            where: { id: req.params.subjectId },
            include: {
                sections: {
                    orderBy: { order: "asc" },
                    include: { lessons: { orderBy: { order: "asc" } } },
                },
            },
        });
        if (!course) {
            return res.status(404).json({ error: { message: "Subject not found" } });
        }
        const s = course;
        res.status(200).json({
            id: course.id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            is_published: s.isPublished ?? true,
            sections: course.sections.map((sec) => ({
                id: sec.id,
                title: sec.title,
                order_index: sec.order,
                videos: sec.lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    order_index: l.order,
                    youtube_url: l.youtubeUrl,
                    duration_seconds: l.durationMinutes != null ? l.durationMinutes * 60 : null,
                })),
            })),
        });
    }
    catch (err) {
        console.error("GET /api/subjects/:subjectId error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load subject" },
        });
    }
});
/** GET /api/subjects/:subjectId/tree - auth, with locked + is_completed per video */
exports.subjectsRouter.get("/:subjectId/tree", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const subjectId = req.params.subjectId;
        const course = await db_1.prisma.course.findUnique({
            where: { id: subjectId },
            include: {
                sections: {
                    orderBy: { order: "asc" },
                    include: { lessons: { orderBy: { order: "asc" } } },
                },
            },
        });
        if (!course) {
            return res.status(404).json({ error: { message: "Subject not found" } });
        }
        const progressList = await db_1.prisma.lessonProgress.findMany({
            where: { userId, courseId: subjectId },
        });
        const completedSet = new Set(progressList.filter((p) => p.isCompleted).map((p) => p.lessonId));
        const sectionsForOrder = course.sections.map((sec) => ({
            id: sec.id,
            title: sec.title,
            order: sec.order,
            lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
        }));
        const flatVideos = (0, ordering_1.getFlattenedVideos)(sectionsForOrder);
        const tree = {
            id: course.id,
            title: course.title,
            sections: course.sections.map((sec) => ({
                id: sec.id,
                title: sec.title,
                order_index: sec.order,
                videos: sec.lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    order_index: l.order,
                    is_completed: completedSet.has(l.id),
                    locked: (0, ordering_1.isVideoLocked)(flatVideos, l.id, completedSet),
                })),
            })),
        };
        res.status(200).json(tree);
    }
    catch (err) {
        console.error("GET /api/subjects/:subjectId/tree error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to load tree" },
        });
    }
});
/** GET /api/subjects/:subjectId/first-video - auth */
exports.subjectsRouter.get("/:subjectId/first-video", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const subjectId = req.params.subjectId;
        const course = await db_1.prisma.course.findUnique({
            where: { id: subjectId },
            include: {
                sections: {
                    orderBy: { order: "asc" },
                    include: { lessons: { orderBy: { order: "asc" } } },
                },
            },
        });
        if (!course) {
            return res.status(404).json({ error: { message: "Subject not found" } });
        }
        const progressList = await db_1.prisma.lessonProgress.findMany({
            where: { userId, courseId: subjectId },
        });
        const completedSet = new Set(progressList.filter((p) => p.isCompleted).map((p) => p.lessonId));
        const sectionsForOrder = course.sections.map((sec) => ({
            id: sec.id,
            title: sec.title,
            order: sec.order,
            lessons: sec.lessons.map((l) => ({ id: l.id, order: l.order })),
        }));
        const flatVideos = (0, ordering_1.getFlattenedVideos)(sectionsForOrder);
        const firstUnlocked = flatVideos.find((v) => !(0, ordering_1.isVideoLocked)(flatVideos, v.id, completedSet));
        const video_id = firstUnlocked?.id ?? flatVideos[0]?.id ?? null;
        if (!video_id) {
            return res.status(404).json({ error: { message: "No videos in this subject" } });
        }
        res.status(200).json({ video_id });
    }
    catch (err) {
        console.error("GET /api/subjects/:subjectId/first-video error:", err);
        const status = (0, dbError_1.isDbConnectionError)(err) ? 503 : 500;
        res.status(status).json({
            error: { message: status === 503 ? "Database temporarily unavailable" : "Failed to get first video" },
        });
    }
});
