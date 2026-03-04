/**
 * Returns true if the error is a DB connection/pool/timeout error
 * so the API can return 503 "Database temporarily unavailable".
 */
export function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const code = e.code ?? "";
  const msg = String(e.message ?? "").toLowerCase();
  if (code === "P1001" || code === "P1002" || code === "P1017" || code === "P2024") return true;
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET") return true;
  if (msg.includes("connect econnrefused") || msg.includes("connect etimedout")) return true;
  if (msg.includes("connection") && msg.includes("timeout")) return true;
  if (msg.includes("pool") && (msg.includes("timeout") || msg.includes("exhausted"))) return true;
  return false;
}
