"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const crypto_1 = __importDefault(require("crypto"));
exports.progressRouter = (0, express_1.Router)();
function uuid() {
    return crypto_1.default.randomUUID();
}
exports.progressRouter.post("/users/:userId/progress", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user?.sub !== userId && req.user?.role !== "admin") {
            return res.status(403).json({ error: { message: "Forbidden" } });
        }
        const { courseId, lessonId, lastPositionSeconds, isCompleted } = req.body;
        const clamped = Math.max(0, Math.floor(lastPositionSeconds || 0));
        const existing = await (0, db_1.queryOne)("SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?", [userId, lessonId]);
        if (existing) {
            await db_1.pool.execute("UPDATE lesson_progress SET last_position_seconds = ?, is_completed = ? WHERE user_id = ? AND lesson_id = ?", [clamped, isCompleted ? 1 : 0, userId, lessonId]);
        }
        else {
            await db_1.pool.execute("INSERT INTO lesson_progress (id, user_id, course_id, lesson_id, last_position_seconds, is_completed) VALUES (?, ?, ?, ?, ?, ?)", [uuid(), userId, courseId, lessonId, clamped, isCompleted ? 1 : 0]);
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("POST /users/:userId/progress error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to update progress" } });
    }
});
exports.progressRouter.get("/users/:userId/progress/:courseId", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { userId, courseId } = req.params;
        if (req.user?.sub !== userId && req.user?.role !== "admin") {
            return res.status(403).json({ error: { message: "Forbidden" } });
        }
        const rows = await (0, db_1.query)("SELECT lesson_id, last_position_seconds, is_completed, updated_at FROM lesson_progress WHERE user_id = ? AND course_id = ?", [userId, courseId]);
        const lessons = {};
        for (const p of rows || []) {
            lessons[p.lesson_id] = {
                lastPositionSeconds: p.last_position_seconds,
                isCompleted: Boolean(p.is_completed),
                updatedAt: new Date(p.updated_at).toISOString(),
            };
        }
        res.json({ courseId, lessons });
    }
    catch (err) {
        console.error("GET /users/:userId/progress/:courseId error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load progress" } });
    }
});
exports.progressRouter.get("/courses/:courseId/progress-summary", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.sub;
        const { courseId } = req.params;
        const totalResult = await (0, db_1.queryOne)("SELECT COUNT(*) AS total FROM lessons l JOIN sections s ON l.section_id = s.id WHERE s.course_id = ?", [courseId]);
        const totalLessons = totalResult?.total ?? 0;
        const completedResult = await (0, db_1.queryOne)("SELECT COUNT(*) AS completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1", [userId, courseId]);
        const completedLessons = completedResult?.completed ?? 0;
        const percentComplete = totalLessons === 0
            ? 0
            : Math.round((completedLessons / totalLessons) * 100);
        res.json({
            totalLessons,
            completedLessons,
            percentComplete,
        });
    }
    catch (err) {
        console.error("GET /courses/:courseId/progress-summary error:", err);
        res
            .status(500)
            .json({ error: { message: "Failed to load progress summary" } });
    }
});
