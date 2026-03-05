import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  /** Comma-separated list of origins, or single origin */
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
};

