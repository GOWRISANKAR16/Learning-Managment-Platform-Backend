"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstreamError = void 0;
exports.getReply = getReply;
const env_1 = require("../../config/env");
const HF_TIMEOUT_MS = 60000;
class UpstreamError extends Error {
    constructor() {
        super(...arguments);
        this.code = "UPSTREAM_ERROR";
    }
}
exports.UpstreamError = UpstreamError;
/**
 * Call Hugging Face Space (Gradio) /run/predict and return the model reply.
 * Keeps HF token on server; frontend calls this backend instead of HF directly.
 */
async function getReply(message) {
    const url = `${env_1.env.huggingFaceSpaceUrl.replace(/\/$/, "")}/run/predict`;
    const headers = {
        "Content-Type": "application/json",
    };
    if (env_1.env.hfToken) {
        headers["Authorization"] = `Bearer ${env_1.env.hfToken}`;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ data: [message] }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            throw new UpstreamError(`HF Space returned ${res.status}`);
        }
        const json = (await res.json());
        if (!json || typeof json !== "object") {
            throw new UpstreamError("Invalid response from AI service");
        }
        const data = json.data;
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (typeof first === "string")
                return first;
            if (first && typeof first === "object" && typeof first.content === "string") {
                return first.content;
            }
            return String(first);
        }
        const content = json.content;
        if (typeof content === "string")
            return content;
        const reply = json.reply;
        if (typeof reply === "string")
            return reply;
        throw new UpstreamError("Could not parse reply from AI service");
    }
    catch (e) {
        if (e instanceof UpstreamError)
            throw e;
        if (e instanceof Error && e.name === "AbortError") {
            throw new UpstreamError("AI service request timed out");
        }
        throw new UpstreamError(e instanceof Error ? e.message : "AI service temporarily unavailable");
    }
}
