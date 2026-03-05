/**
 * Run sql/seed.sql against DATABASE_URL (from .env).
 * Usage: node scripts/run-seed.js
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const u = new URL(url);
  const config = {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "defaultdb",
    ssl: u.searchParams.get("ssl-mode") === "REQUIRED" ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  };

  const seedPath = path.join(__dirname, "..", "sql", "seed.sql");
  const sql = fs.readFileSync(seedPath, "utf8");

  const conn = await mysql.createConnection(config);
  try {
    await conn.query(sql);
    console.log("Seed applied successfully to", config.database);
  } catch (err) {
    console.error("Seed run failed:", err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
