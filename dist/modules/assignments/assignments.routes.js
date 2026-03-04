"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAssignmentsRouter = exports.assignmentsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
exports.assignmentsRouter = (0, express_1.Router)();
exports.assignmentsRouter.use(authMiddleware_1.authMiddleware);
exports.assignmentsRouter.get("/users/:userId/assignments", async (req, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const assignments = await db_1.prisma.assignment.findMany();
    res.json(assignments);
});
exports.assignmentsRouter.get("/assignments/:assignmentId", async (_req, res) => {
    const assignment = await db_1.prisma.assignment.findUnique({
        where: { id: _req.params.assignmentId },
    });
    if (!assignment) {
        return res
            .status(404)
            .json({ error: { message: "Assignment not found" } });
    }
    res.json(assignment);
});
exports.assignmentsRouter.get("/assignments/:assignmentId/submissions/:userId", async (req, res) => {
    const { assignmentId, userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: { message: "Forbidden" } });
    }
    const submission = await db_1.prisma.submission.findUnique({
        where: {
            assignmentId_userId: { assignmentId, userId },
        },
    });
    if (!submission) {
        return res.status(404).json({ error: { message: "Not found" } });
    }
    res.json(submission);
});
exports.assignmentsRouter.post("/assignments/:assignmentId/submissions", async (req, res) => {
    const { assignmentId } = req.params;
    const userId = req.user.sub;
    const { content } = req.body;
    const now = new Date();
    const submission = await db_1.prisma.submission.upsert({
        where: {
            assignmentId_userId: { assignmentId, userId },
        },
        update: {
            submittedAt: now,
            content,
            status: "SUBMITTED",
        },
        create: {
            assignmentId,
            userId,
            submittedAt: now,
            content,
            status: "SUBMITTED",
        },
    });
    res.status(201).json({ submission });
});
// Admin / instructor
exports.adminAssignmentsRouter = (0, express_1.Router)();
exports.adminAssignmentsRouter.use(authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)("admin", "instructor"));
exports.adminAssignmentsRouter.get("/", async (_req, res) => {
    const assignments = await db_1.prisma.assignment.findMany();
    res.json(assignments);
});
exports.adminAssignmentsRouter.post("/", async (req, res) => {
    const { courseId, title, deadline, description } = req.body;
    const assignment = await db_1.prisma.assignment.create({
        data: {
            courseId,
            title,
            deadline: new Date(deadline),
            description,
        },
    });
    res.status(201).json(assignment);
});
exports.adminAssignmentsRouter.put("/:assignmentId", async (req, res) => {
    const { assignmentId } = req.params;
    const { courseId, title, deadline, description } = req.body;
    const assignment = await db_1.prisma.assignment.update({
        where: { id: assignmentId },
        data: {
            courseId,
            title,
            deadline: deadline ? new Date(deadline) : undefined,
            description,
        },
    });
    res.json(assignment);
});
exports.adminAssignmentsRouter.delete("/:assignmentId", async (req, res) => {
    const { assignmentId } = req.params;
    await db_1.prisma.assignment.delete({ where: { id: assignmentId } });
    res.status(204).send();
});
