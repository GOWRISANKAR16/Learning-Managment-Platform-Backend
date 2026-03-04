"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("../generated/prisma/client");
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}
const dbUrl = new URL(databaseUrl);
const adapter = new adapter_mariadb_1.PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || "3306"),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
    connectionLimit: 10,
    connectTimeout: 15000,
    idleTimeout: 30000,
});
const prisma = global.__prisma__ || new client_1.PrismaClient({ adapter });
exports.prisma = prisma;
if (process.env.NODE_ENV !== "production") {
    global.__prisma__ = prisma;
}
