"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const auth_routes_1 = require("../auth/auth.routes");
const subjects_routes_1 = require("./subjects.routes");
const videos_routes_1 = require("./videos.routes");
const progress_routes_1 = require("./progress.routes");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.apiRouter.use("/auth", auth_routes_1.authRouter);
exports.apiRouter.use("/subjects", subjects_routes_1.subjectsRouter);
exports.apiRouter.use("/videos", videos_routes_1.videosRouter);
exports.apiRouter.use("/progress", progress_routes_1.apiProgressRouter);
