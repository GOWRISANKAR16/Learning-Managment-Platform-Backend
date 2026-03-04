import { env } from "./env";

export const security = {
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  jwtAccessSecret: env.jwtAccessSecret,
  jwtRefreshSecret: env.jwtRefreshSecret,
  cookieOptions: {
    httpOnly: true as const,
    secure: true as const,
    sameSite: "lax" as const,
    domain: env.cookieDomain,
    path: "/",
  },
};

