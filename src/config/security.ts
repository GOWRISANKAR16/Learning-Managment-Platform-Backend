import { env } from "./env";

export const security = {
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  jwtAccessSecret: env.jwtAccessSecret,
  jwtRefreshSecret: env.jwtRefreshSecret,
  cookieOptions: {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(env.cookieDomain && { domain: env.cookieDomain }),
  },
};

