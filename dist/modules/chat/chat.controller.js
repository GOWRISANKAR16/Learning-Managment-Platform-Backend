"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatHandler = chatHandler;
const env_1 = require("../../config/env");
const chat_service_1 = require("./chat.service");
async function chatHandler(req, res) {
    try {
        const { message } = req.body;
        if (message === undefined || message === null) {
            return res.status(400).json({ error: { message: "Message is required" } });
        }
        if (typeof message !== "string") {
            return res.status(400).json({ error: { message: "Message must be a string" } });
        }
        const trimmed = message.trim();
        if (!trimmed) {
            return res.status(400).json({ error: { message: "Message is required" } });
        }
        const maxLen = env_1.env.chatMaxMessageLength;
        if (trimmed.length > maxLen) {
            return res.status(400).json({
                error: { message: `Message must be at most ${maxLen} characters` },
            });
        }
        const reply = await (0, chat_service_1.getReply)(trimmed);
        return res.json({ reply });
    }
    catch (e) {
        if (e instanceof chat_service_1.UpstreamError) {
            return res.status(502).json({
                error: { message: "AI service temporarily unavailable" },
            });
        }
        throw e;
    }
}
