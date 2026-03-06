"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstreamError = void 0;
exports.getReply = getReply;
const env_1 = require("../../config/env");
const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 60; // ~90s total
const RUN_PREDICT_TIMEOUT_MS = 60000;
class UpstreamError extends Error {
    constructor() {
        super(...arguments);
        this.code = "UPSTREAM_ERROR";
    }
}
exports.UpstreamError = UpstreamError;
/**
 * Call Hugging Face Space:
 * - Prefer /call/predict: POST with message → get event_id → poll GET until done → parse SSE data for reply.
 * - If /call/predict is not supported (404), fall back to /run/predict and parse direct JSON response.
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
    // Try /call/predict (event_id) first
    const callPostRes = await fetch(`${base}/call/predict`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data: [message] }),
    });
    if (callPostRes.status !== 404) {
        if (!callPostRes.ok) {
            throw new UpstreamError("AI service returned an error");
        }
        const postData = (await callPostRes.json());
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
                    if (last &&
                        typeof last === "object" &&
                        "content" in last &&
                        typeof last.content === "string") {
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
    // Fallback: /run/predict (direct response)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RUN_PREDICT_TIMEOUT_MS);
    try {
        const runRes = await fetch(`${base}/run/predict`, {
            method: "POST",
            headers,
            body: JSON.stringify({ data: [message] }),
            signal: controller.signal,
        });
        if (!runRes.ok)
            throw new UpstreamError("AI service returned an error");
        const json = (await runRes.json());
        if (!json || typeof json !== "object") {
            throw new UpstreamError("Invalid response from AI service");
        }
        const data = json.data;
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (typeof first === "string")
                return first;
            if (first && typeof first === "object" && "content" in first) {
                return String(first.content);
            }
            return String(first);
        }
        const content = json.content;
        if (typeof content === "string")
            return content;
        throw new UpstreamError("Could not parse reply from AI service");
    }
    catch (e) {
        if (e instanceof UpstreamError)
            throw e;
        if (e instanceof Error && e.name === "AbortError") {
            throw new UpstreamError("AI service request timed out");
        }
        throw new UpstreamError("AI service temporarily unavailable");
    }
    finally {
        clearTimeout(timeoutId);
    }
}
