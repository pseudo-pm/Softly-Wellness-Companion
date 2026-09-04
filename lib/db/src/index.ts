import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const rootEnv = path.resolve(process.cwd(), ".env");
if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(rootEnv);
  } catch {
    // ignore
  }
}

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl:
    connectionString &&
    (connectionString.includes("sslmode=require") ||
      connectionString.includes("neon.tech"))
      ? { rejectUnauthorized: false }
      : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";


