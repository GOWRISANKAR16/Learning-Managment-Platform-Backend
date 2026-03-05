"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = require("./modules/auth/auth.routes");
const courses_routes_1 = require("./modules/courses/courses.routes");
const progress_routes_1 = require("./modules/progress/progress.routes");
const messages_routes_1 = require("./modules/messages/messages.routes");
const assignments_routes_1 = require("./modules/assignments/assignments.routes");
const admin_courses_routes_1 = require("./modules/admin/admin.courses.routes");
const admin_users_routes_1 = require("./modules/admin/admin.users.routes");
const api_routes_1 = require("./modules/api/api.routes");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(requestLogger_1.requestLogger);
exports.app.use((0, cors_1.default)({
    origin: env_1.env.corsOrigin,
    credentials: true,
}));
exports.app.get("/", (_req, res) => {
    res.json({
        message: "LMS API",
        health: "/health",
        docs: "Use /auth, /courses, /users/.../progress, etc.",
    });
});
exports.app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.app.use("/auth", auth_routes_1.authRouter);
exports.app.use("/courses", courses_routes_1.coursesRouter);
exports.app.use("/", progress_routes_1.progressRouter);
exports.app.use("/", messages_routes_1.messagesRouter);
exports.app.use("/", assignments_routes_1.assignmentsRouter);
exports.app.use("/admin/courses", admin_courses_routes_1.adminCoursesRouter);
exports.app.use("/admin/users", admin_users_routes_1.adminUsersRouter);
exports.app.use("/admin/assignments", assignments_routes_1.adminAssignmentsRouter);
exports.app.use("/api", api_routes_1.apiRouter);
exports.app.use((_req, res) => {
    res.status(404).json({ error: { message: "Not found" } });
});
exports.app.use(errorHandler_1.errorHandler);
