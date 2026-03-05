import { pool, query, queryOne } from "../../config/db";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { security } from "../../config/security";
import crypto from "crypto";

type Role = "student" | "instructor" | "admin";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  status: string;
}

function uuid(): string {
  return crypto.randomUUID();
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role };
}> {
  const existing = await queryOne<UserRow>(
    "SELECT id FROM users WHERE email = ?",
    [input.email]
  );
  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(input.password);
  const id = uuid();

  await pool.execute(
    "INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'student', 'active')",
    [id, input.name, input.email, passwordHash]
  );

  return issueTokensForUser(id, input.email, input.name, "student");
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role };
}> {
  const user = await queryOne<UserRow>("SELECT * FROM users WHERE email = ?", [
    input.email,
  ]);
  if (!user) {
    throw new Error("Invalid credentials");
  }
  if (user.status === "blocked") {
    throw new Error("User is blocked");
  }

  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  const role = user.role.toLowerCase() as Role;
  return issueTokensForUser(user.id, user.email, user.name, role);
}

export async function refreshAccessToken(
  jwtRefreshToken: string
): Promise<{ token: string; refreshTokenId: string } | null> {
  try {
    const jwt = await import("jsonwebtoken");
    const decoded = jwt.default.verify(
      jwtRefreshToken,
      security.jwtRefreshSecret
    ) as { tid: string };

    const rows = await query<
      { user_id: string; email: string; name: string; role: string; expires_at: Date; revoked_at: null | Date }[]
    >(
      "SELECT r.user_id, r.expires_at, r.revoked_at, u.email, u.name, u.role FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE r.id = ?",
      [decoded.tid]
    );
    const row = rows && rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
      return null;
    }

    const role = row.role.toLowerCase() as Role;
    const token = signAccessToken(row.user_id, row.email, role);
    return { token, refreshTokenId: decoded.tid };
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(rawId: string): Promise<void> {
  await pool.execute(
    "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revoked_at IS NULL",
    [rawId]
  );
}

async function issueTokensForUser(
  userId: string,
  email: string,
  name: string,
  role: Role
) {
  const token = signAccessToken(userId, email, role);

  const rawId = uuid();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + security.refreshTokenTtlSeconds * 1000
  );

  await pool.execute(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [rawId, userId, rawId, expiresAt]
  );

  const refreshToken = signRefreshToken(rawId);

  return {
    token,
    refreshToken,
    user: { id: userId, name, email, role },
  };
}
