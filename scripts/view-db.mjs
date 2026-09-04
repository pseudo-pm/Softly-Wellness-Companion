import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rootEnv = path.resolve(process.cwd(), ".env");
if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnv);
}

const requireDb = createRequire(path.resolve(process.cwd(), "lib/db/package.json"));
const pg = requireDb("pg");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});


async function main() {
  console.log("\n🌱 Connecting to your live Neon Database...");
  const users = await pool.query("SELECT * FROM softly_users ORDER BY created_at DESC LIMIT 5;");
  const tokens = await pool.query("SELECT * FROM softly_magic_link_tokens ORDER BY created_at DESC LIMIT 5;");
  const activityLogs = await pool.query("SELECT * FROM softly_activity_log ORDER BY created_at DESC LIMIT 10;");
  const sessions = await pool.query("SELECT * FROM softly_sessions ORDER BY created_at DESC LIMIT 5;");
  const entries = await pool.query("SELECT * FROM softly_entries ORDER BY created_at DESC LIMIT 5;");
  const messages = await pool.query("SELECT * FROM softly_chat_messages ORDER BY created_at DESC LIMIT 10;");

  console.log("\n================ [ 1. USERS (softly_users) ] ================");
  console.table(users.rows.map(u => ({
    id: u.id.slice(0, 8) + "...",
    email: u.email,
    createdAt: u.created_at
  })));

  console.log("\n================ [ 2. MAGIC LINK TOKENS (softly_magic_link_tokens) ] ==");
  console.table(tokens.rows.map(t => ({
    id: t.id.slice(0, 8) + "...",
    email: t.email,
    token: t.token.slice(0, 8) + "...",
    usedAt: t.used_at ? t.used_at : "Unused",
    expiresAt: t.expires_at
  })));

  console.log("\n================ [ 3. ACTIVITY LOG (softly_activity_log) ] ===========");
  console.table(activityLogs.rows.map(a => ({
    id: a.id.slice(0, 8) + "...",
    userId: a.user_id ? a.user_id.slice(0, 8) + "..." : "—",
    sessionId: a.session_id ? a.session_id.slice(0, 8) + "..." : "—",
    type: a.activity_type,
    status: a.status,
    createdAt: a.created_at
  })));

  console.log("\n================ [ 4. SESSIONS (softly_sessions) ] ===============");
  console.table(sessions.rows.map(s => ({
    id: s.id.slice(0, 8) + "...",
    userId: s.user_id ? s.user_id.slice(0, 8) + "..." : "—",
    username: s.username,
    createdAt: s.created_at
  })));

  await pool.end();
  console.log("\n✨ Done.\n");
}


main().catch((err) => {
  console.error("Database connection error:", err.message);
  process.exit(1);
});
