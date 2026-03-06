import { env } from "../../config/env";

const HF_TIMEOUT_MS = 60_000;

export class UpstreamError extends Error {
  code = "UPSTREAM_ERROR" as const;
}

/**
 * Call Hugging Face Space (Gradio) /run/predict and return the model reply.
 * Keeps HF token on server; frontend calls this backend instead of HF directly.
 */
export async function getReply(message: string): Promise<string> {
  const url = `${env.huggingFaceSpaceUrl.replace(/\/$/, "")}/run/predict`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.hfToken) {
    headers["Authorization"] = `Bearer ${env.hfToken}`;
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

    const json = (await res.json()) as unknown;
    if (!json || typeof json !== "object") {
      throw new UpstreamError("Invalid response from AI service");
    }

    const data = (json as { data?: unknown[] }).data;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && typeof (first as { content?: string }).content === "string") {
        return (first as { content: string }).content;
      }
      return String(first);
    }

    const content = (json as { content?: string }).content;
    if (typeof content === "string") return content;

    const reply = (json as { reply?: string }).reply;
    if (typeof reply === "string") return reply;

    throw new UpstreamError("Could not parse reply from AI service");
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new UpstreamError("AI service request timed out");
    }
    throw new UpstreamError(
      e instanceof Error ? e.message : "AI service temporarily unavailable"
    );
  }
}
