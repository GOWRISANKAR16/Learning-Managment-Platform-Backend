"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstreamError = void 0;
exports.getReply = getReply;
const env_1 = require("../../config/env");
const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 60; // ~90s total
class UpstreamError extends Error {
    constructor() {
        super(...arguments);
        this.code = "UPSTREAM_ERROR";
    }
}
exports.UpstreamError = UpstreamError;
/**
 * Call Hugging Face Space /call/predict: POST with message → get event_id → poll GET until done → parse SSE data for reply.
 * Keeps HF token on server; frontend calls this backend instead of HF directly.
 */
async function getReply(message) {
    const base = env_1.env.huggingFaceSpaceUrl.replace(/\/$/, "");
    const headers = {
        "Content-Type": "application/json",
    };
    if (env_1.env.hfToken) {
        headers["Authorization"] = `Bearer ${env_1.env.hfToken}`;
    }
    const postRes = await fetch(`${base}/call/predict`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: [message] }),
    });
    if (!postRes.ok) {
        throw new UpstreamError("AI service returned an error");
    }
    const postData = (await postRes.json());
    const eventId = postData?.event_id;
    if (!eventId) {
        throw new UpstreamError("No event_id from AI service");
    }
    const getHeaders = {};
    if (env_1.env.hfToken) {
        getHeaders["Authorization"] = `Bearer ${env_1.env.hfToken}`;
    }
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const getRes = await fetch(`${base}/call/predict/${eventId}`, {
            headers: getHeaders,
        });
        if (!getRes.ok)
            continue;
        const text = await getRes.text();
        // Try SSE-style line: data: [...]
        const dataMatch = text.match(/^data:\s*(\[.*\])\s*$/m);
        if (dataMatch) {
            try {
                const arr = JSON.parse(dataMatch[1]);
                const last = Array.isArray(arr) ? arr[arr.length - 1] : arr;
                if (typeof last === "string")
                    return last;
                if (last && typeof last === "object" && "content" in last && typeof last.content === "string") {
                    return last.content;
                }
            }
            catch {
                // ignore parse error, keep polling
            }
        }
        // Try JSON body (some Spaces return JSON when complete)
        try {
            const json = JSON.parse(text);
            if (json && typeof json === "object") {
                const data = json.data;
                if (Array.isArray(data) && data.length > 0) {
                    const first = data[0];
                    if (typeof first === "string")
                        return first;
                    if (first && typeof first === "object" && "content" in first) {
                        return String(first.content);
                    }
                }
                const content = json.content;
                if (typeof content === "string")
                    return content;
                const reply = json.reply;
                if (typeof reply === "string")
                    return reply;
            }
        }
        catch {
            // not JSON, keep polling
        }
    }
    throw new UpstreamError("AI service request timed out");
}
