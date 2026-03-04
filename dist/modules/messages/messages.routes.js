"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
exports.messagesRouter = (0, express_1.Router)();
exports.messagesRouter.get("/users/:userId/threads", authMiddleware_1.authMiddleware, async (req, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const threads = await db_1.prisma.thread.findMany({
        where: { userId },
        include: {
            messages: {
                orderBy: { createdAt: "asc" },
            },
        },
    });
    res.json(threads);
});
exports.messagesRouter.post("/users/:userId/threads", authMiddleware_1.authMiddleware, async (req, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const { courseId, courseTitle } = req.body;
    const thread = await db_1.prisma.thread.create({
        data: {
            userId,
            courseId,
            courseTitle,
        },
    });
    res.status(201).json(thread);
});
exports.messagesRouter.get("/threads/:threadId/messages", authMiddleware_1.authMiddleware, async (req, res) => {
    const thread = await db_1.prisma.thread.findUnique({
        where: { id: req.params.threadId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) {
        return res.status(404).json({ error: { message: "Thread not found" } });
    }
    res.json(thread.messages);
});
exports.messagesRouter.post("/threads/:threadId/messages", authMiddleware_1.authMiddleware, async (req, res) => {
    const thread = await db_1.prisma.thread.findUnique({
        where: { id: req.params.threadId },
    });
    if (!thread) {
        return res.status(404).json({ error: { message: "Thread not found" } });
    }
    const from = req.user?.role === "student" ? "STUDENT" : "INSTRUCTOR";
    const message = await db_1.prisma.message.create({
        data: {
            threadId: thread.id,
            from,
            text: req.body.text,
            isRead: from === "STUDENT",
            senderId: req.user?.sub,
        },
    });
    res.status(201).json({ message });
});
exports.messagesRouter.patch("/threads/:threadId/read", authMiddleware_1.authMiddleware, async (req, res) => {
    const thread = await db_1.prisma.thread.findUnique({
        where: { id: req.params.threadId },
    });
    if (!thread) {
        return res.status(404).json({ error: { message: "Thread not found" } });
    }
    if (req.user?.sub !== thread.userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    await db_1.prisma.message.updateMany({
        where: {
            threadId: thread.id,
            from: "INSTRUCTOR",
            isRead: false,
        },
        data: { isRead: true },
    });
    res.json({ success: true });
});
