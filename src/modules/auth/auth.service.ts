import { prisma } from "../../config/db";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { security } from "../../config/security";
import crypto from "crypto";

type Role = "student" | "instructor" | "admin";

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role };
}> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
    },
  });

  return issueTokensForUser(user.id, user.email, user.name, "student");
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: Role };
}> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  if (user.status === "BLOCKED") {
    throw new Error("User is blocked");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  return issueTokensForUser(
    user.id,
    user.email,
    user.name,
    user.role.toLowerCase() as Role
  );
}

export async function refreshAccessToken(
  jwtRefreshToken: string
): Promise<{ token: string; refreshTokenId: string } | null> {
  try {
    const decoded = (await import("jsonwebtoken")).default.verify(
      jwtRefreshToken,
      security.jwtRefreshSecret
    ) as { tid: string };

    const existing = await prisma.refreshToken.findUnique({
      where: { id: decoded.tid },
      include: { user: true },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date()
    ) {
      return null;
    }

    const token = signAccessToken(
      existing.user.id,
      existing.user.email,
      existing.user.role.toLowerCase() as Role
    );

    return { token, refreshTokenId: existing.id };
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(rawId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: rawId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function issueTokensForUser(
  userId: string,
  email: string,
  name: string,
  role: Role
) {
  const token = signAccessToken(userId, email, role);

  const rawId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + security.refreshTokenTtlSeconds * 1000
  );

  await prisma.refreshToken.create({
    data: {
      id: rawId,
      userId,
      tokenHash: rawId,
      expiresAt,
    },
  });

  const refreshToken = signRefreshToken(rawId);

  return {
    token,
    refreshToken,
    user: { id: userId, name, email, role },
  };
}

