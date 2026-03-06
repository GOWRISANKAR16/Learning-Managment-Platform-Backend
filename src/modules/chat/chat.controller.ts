import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";
import { env } from "../../config/env";
import { getReply, UpstreamError } from "./chat.service";

export async function chatHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { message } = req.body as { message?: unknown; history?: unknown[] };

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

    const maxLen = env.chatMaxMessageLength;
    if (trimmed.length > maxLen) {
      return res.status(400).json({
        error: { message: `Message must be at most ${maxLen} characters` },
      });
    }

    const reply = await getReply(trimmed);
    return res.json({ reply });
  } catch (e) {
    if (e instanceof UpstreamError) {
      return res.status(502).json({
        error: { message: "AI service temporarily unavailable" },
      });
    }
    const err = e as { code?: string; message?: string };
    if (err?.code === "UPSTREAM_ERROR" || err?.message?.includes("timeout")) {
      return res.status(502).json({
        error: { message: "AI service temporarily unavailable" },
      });
    }
    console.error("Chat error", e);
    return res.status(500).json({
      error: { message: "Something went wrong. Please try again." },
    });
  }
}
