"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: process.env.PORT ? Number(process.env.PORT) : 4000,
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    /** Comma-separated list of origins, or single origin */
    corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean),
    /** Optional comma-separated glob patterns (e.g. https://*.vercel.app) to allow dynamic preview URLs */
    corsOriginPatterns: (process.env.CORS_ORIGIN_PATTERNS || "").split(",").map((p) => p.trim()).filter(Boolean),
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    /** Hugging Face Space URL for chat proxy (no trailing slash) */
    huggingFaceSpaceUrl: process.env.HF_SPACE_URL ||
        "https://gowrisankara-qwen-qwen2-5-coder-32b-instruct.hf.space",
    /** Hugging Face token for gated Spaces (optional) */
    hfToken: process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || undefined,
    /** Max length for chat message (default 4000) */
    chatMaxMessageLength: process.env.CHAT_MAX_MESSAGE_LENGTH
        ? Number(process.env.CHAT_MAX_MESSAGE_LENGTH)
        : 4000,
};
