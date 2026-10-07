import "dotenv/config";
import pino from "pino";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    redact: ["DATABASE_URL", "password", "email"]
  },
  pino.destination(2)
);
