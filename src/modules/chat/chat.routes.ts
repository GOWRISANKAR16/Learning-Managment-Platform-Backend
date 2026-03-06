import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { chatHandler } from "./chat.controller";

export const chatRouter = Router();

chatRouter.post("/chat", authMiddleware, chatHandler);
