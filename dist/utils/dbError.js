"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbConnectionError = isDbConnectionError;
/**
 * Returns true if the error is a DB connection/pool/schema error
 * so the API can return 503 "Database temporarily unavailable".
 * Does not treat business errors (e.g. P2002 unique, P2025 not found) as 503.
 */
function isDbConnectionError(err) {
    if (!err || typeof err !== "object")
        return false;
    const e = err;
    const code = String(e.code ?? "");
    const msg = String(e.message ?? "").toLowerCase();
    // Connection/timeout/pool
    if (code === "P1001" || code === "P1002" || code === "P1017" || code === "P2024")
        return true;
    if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET")
        return true;
    if (msg.includes("connect econnrefused") || msg.includes("connect etimedout"))
        return true;
    if (msg.includes("connection") && msg.includes("timeout"))
        return true;
    if (msg.includes("pool") && (msg.includes("timeout") || msg.includes("exhausted")))
        return true;
    // Schema/column mismatches (DB out of sync with Prisma)
    if (code === "P2010" || code === "P2011")
        return true; // column not found / invalid data
    if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("unknown")))
        return true;
    if (msg.includes("incorrect integer value") || msg.includes("incorrect string value"))
        return true;
    return false;
}
