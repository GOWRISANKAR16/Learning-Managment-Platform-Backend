import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { security } from "../config/security";

type Role = "student" | "instructor" | "admin";

export function signAccessToken(
  userId: string,
  email: string,
  role: Role
): string {
  return jwt.sign(
    { sub: userId, email, role },
    env.jwtAccessSecret,
    { expiresIn: security.accessTokenTtlSeconds }
  );
}

export function signRefreshToken(rawTokenId: string): string {
  return jwt.sign(
    { tid: rawTokenId },
    env.jwtRefreshSecret,
    { expiresIn: security.refreshTokenTtlSeconds }
  );
}

