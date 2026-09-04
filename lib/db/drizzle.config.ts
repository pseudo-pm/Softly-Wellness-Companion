import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // ignore
  }
}

const connectionUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED must be set.");
}



export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
});

