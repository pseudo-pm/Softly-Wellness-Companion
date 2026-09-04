import path from "node:path";
import fs from "node:fs";

// Automatically load root .env file if present
const rootEnvPath = path.resolve(process.cwd(), ".env");
const fallbackEnvPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(rootEnvPath);
  } catch {
    // ignore
  }
} else if (fs.existsSync(fallbackEnvPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(fallbackEnvPath);
  } catch {
    // ignore
  }
}

import app from "./app";
import { logger } from "./lib/logger";

let rawPort = process.env["API_PORT"] || "5001";
if (rawPort === "5000") {
  rawPort = "5001";
}

const port = Number(rawPort);


if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}



app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
