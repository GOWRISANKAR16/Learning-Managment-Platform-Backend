import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const url = new URL(databaseUrl);
const config: mysql.PoolOptions = {
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

export const pool = mysql.createPool(config);

/** Run a query; returns first element of result (rows). */
export async function query<T = unknown>(
  sql: string,
  params?: (string | number | null)[]
): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return (Array.isArray(rows) ? rows : [rows]) as T;
}

/** Run a query and return the first row or null. */
export async function queryOne<T = unknown>(
  sql: string,
  params?: (string | number | null)[]
): Promise<T | null> {
  const rows = await query<unknown[]>(sql, params);
  return (rows && rows[0]) ? (rows[0] as T) : null;
}
