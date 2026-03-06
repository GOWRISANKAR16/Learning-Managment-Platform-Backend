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
const chat_routes_1 = require("./modules/chat/chat.routes");
const courses_routes_1 = require("./modules/courses/courses.routes");
const progress_routes_1 = require("./modules/progress/progress.routes");
/** Convert a glob pattern (e.g. https://*.vercel.app) to a RegExp for origin matching */
function globToRegex(glob) {
    const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
}
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(requestLogger_1.requestLogger);
exports.app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        const allowed = env_1.env.corsOrigins;
        if (!origin)
            return cb(null, true);
        if (allowed.includes(origin))
            return cb(null, origin);
        const patterns = env_1.env.corsOriginPatterns;
        if (patterns.length > 0) {
            for (const pattern of patterns) {
                if (globToRegex(pattern).test(origin))
                    return cb(null, origin);
            }
        }
        return cb(null, false);
    },
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
exports.app.use("/", chat_routes_1.chatRouter);
exports.app.use("/api", chat_routes_1.chatRouter);
exports.app.use("/", progress_routes_1.progressRouter);
exports.app.use((_req, res) => {
    res.status(404).json({ error: { message: "Not found" } });
});
exports.app.use(errorHandler_1.errorHandler);
