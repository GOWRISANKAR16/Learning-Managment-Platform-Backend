import { env } from "../../config/env";

const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 60; // ~90s total
const RUN_PREDICT_TIMEOUT_MS = 60_000;

export class UpstreamError extends Error {
  code = "UPSTREAM_ERROR" as const;
}

/**
 * Call Hugging Face Space:
 * - Prefer /call/predict: POST with message → get event_id → poll GET until done → parse SSE data for reply.
 * - If /call/predict is not supported (404), fall back to /run/predict and parse direct JSON response.
 * Keeps HF token on server; frontend calls this backend instead of HF directly.
 */
export async function getReply(message: string): Promise<string> {
  const base = env.huggingFaceSpaceUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.hfToken) {
    headers["Authorization"] = `Bearer ${env.hfToken}`;
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

    const postData = (await callPostRes.json()) as { event_id?: string };
    const eventId = postData?.event_id;
    if (!eventId) {
      throw new UpstreamError("No event_id from AI service");
    }

    const getHeaders: Record<string, string> = {};
    if (env.hfToken) {
      getHeaders["Authorization"] = `Bearer ${env.hfToken}`;
    }

    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const getRes = await fetch(`${base}/call/predict/${eventId}`, {
        headers: getHeaders,
      });
      if (!getRes.ok) continue;

      const text = await getRes.text();

      // Try SSE-style line: data: [...]
      const dataMatch = text.match(/^data:\s*(\[.*\])\s*$/m);
      if (dataMatch) {
        try {
          const arr = JSON.parse(dataMatch[1]) as unknown;
          const last = Array.isArray(arr) ? arr[arr.length - 1] : arr;
          if (typeof last === "string") return last;
          if (
            last &&
            typeof last === "object" &&
            "content" in last &&
            typeof (last as { content: unknown }).content === "string"
          ) {
            return (last as { content: string }).content;
          }
        } catch {
          // ignore parse error, keep polling
        }
      }

      // Try JSON body (some Spaces return JSON when complete)
      try {
        const json = JSON.parse(text) as unknown;
        if (json && typeof json === "object") {
          const data = (json as { data?: unknown[] }).data;
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (typeof first === "string") return first;
            if (first && typeof first === "object" && "content" in first) {
              return String((first as { content: unknown }).content);
            }
          }
          const content = (json as { content?: string }).content;
          if (typeof content === "string") return content;
          const reply = (json as { reply?: string }).reply;
          if (typeof reply === "string") return reply;
        }
      } catch {
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
    if (!runRes.ok) throw new UpstreamError("AI service returned an error");

    const json = (await runRes.json()) as unknown;
    if (!json || typeof json !== "object") {
      throw new UpstreamError("Invalid response from AI service");
    }

    const data = (json as { data?: unknown[] }).data;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "content" in first) {
        return String((first as { content: unknown }).content);
      }
      return String(first);
    }

    const content = (json as { content?: string }).content;
    if (typeof content === "string") return content;

    throw new UpstreamError("Could not parse reply from AI service");
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new UpstreamError("AI service request timed out");
    }
    throw new UpstreamError("AI service temporarily unavailable");
  } finally {
    clearTimeout(timeoutId);
  }
}
