import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const dbUrl = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || "3306"),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
} as any);

const prisma =
  global.__prisma__ || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

export { prisma };

