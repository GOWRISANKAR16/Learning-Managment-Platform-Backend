import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { chatHandler } from "./chat.controller";

export const chatRouter = Router();

chatRouter.post("/chat", authMiddleware, chatHandler);
// Frontend fallback: if /chat 404, it tries /api/chat
chatRouter.post("/api/chat", authMiddleware, chatHandler);
