"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUsersRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../config/db");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
exports.adminUsersRouter = (0, express_1.Router)();
exports.adminUsersRouter.use(authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)("admin"));
exports.adminUsersRouter.get("/", async (_req, res) => {
    const users = await db_1.prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
        },
    });
    res.json(users);
});
exports.adminUsersRouter.put("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { role, status } = req.body;
    const data = {};
    if (role) {
        data.role = role.toUpperCase();
    }
    if (status) {
        data.status = status.toUpperCase();
    }
    const user = await db_1.prisma.user.update({
        where: { id: userId },
        data,
    });
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase(),
    });
});
exports.adminUsersRouter.delete("/:userId", async (req, res) => {
    const { userId } = req.params;
    await db_1.prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
});
