"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.queryOne = queryOne;
const promise_1 = __importDefault(require("mysql2/promise"));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}
const url = new URL(databaseUrl);
const config = {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "defaultdb",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
    ssl: url.searchParams.get("ssl-mode") === "REQUIRED" ? { rejectUnauthorized: false } : undefined,
};
exports.pool = promise_1.default.createPool(config);
/** Run a query; returns first element of result (rows). */
async function query(sql, params) {
    const [rows] = await exports.pool.execute(sql, params);
    return (Array.isArray(rows) ? rows : [rows]);
}
/** Run a query and return the first row or null. */
async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return (rows && rows[0]) ? rows[0] : null;
}
