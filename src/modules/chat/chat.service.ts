import { env } from "../../config/env";

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 60;

export class UpstreamError extends Error {
  code = "UPSTREAM_ERROR" as const;
}

/**
 * Call Hugging Face Space /call/predict: POST with message → get event_id → poll
 * GET /call/predict/<event_id> until SSE data line has the reply. Keeps HF token on server.
 */
export async function getReply(userMessage: string): Promise<string> {
  const base = env.huggingFaceSpaceUrl.replace(/\/$/, "");
  const token = env.hfToken;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const postRes = await fetch(`${base}/call/predict`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: [userMessage] }),
  });

  if (!postRes.ok) {
    throw new UpstreamError(`HF Space returned ${postRes.status}`);
  }

  const postData = (await postRes.json()) as { event_id?: string };
  const eventId = postData?.event_id;
  if (!eventId) {
    throw new UpstreamError("No event_id from AI service");
  }

  const getHeaders: Record<string, string> = {};
  if (token) getHeaders["Authorization"] = `Bearer ${token}`;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const getRes = await fetch(`${base}/call/predict/${eventId}`, {
      headers: getHeaders,
    });
    if (!getRes.ok) continue;

    const text = await getRes.text();
    const dataMatch = text.match(/^data:\s*(\[.*\])\s*$/m);
    if (dataMatch) {
      try {
        const arr = JSON.parse(dataMatch[1]) as unknown;
        const list = Array.isArray(arr) ? arr : [arr];
        const last = list[list.length - 1];
        if (typeof last === "string") return last;
        if (last && typeof last === "object" && "content" in last && typeof (last as { content: unknown }).content === "string") {
          return (last as { content: string }).content;
        }
      } catch {
        // ignore parse errors, keep polling
      }
    }
  }

  throw new UpstreamError("AI service request timed out");
}
