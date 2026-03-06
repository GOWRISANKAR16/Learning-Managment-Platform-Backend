"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const chat_controller_1 = require("./chat.controller");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.post("/chat", authMiddleware_1.authMiddleware, chat_controller_1.chatHandler);
// Frontend fallback: if /chat 404, it tries /api/chat
exports.chatRouter.post("/api/chat", authMiddleware_1.authMiddleware, chat_controller_1.chatHandler);
