import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(60),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10)
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse({
    DATABASE_URL: env.DATABASE_URL ?? "postgresql://resource_mcp:resource_mcp@localhost:5432/resource_mcp",
    PORT: env.PORT,
    LOG_LEVEL: env.LOG_LEVEL,
    CACHE_TTL_SECONDS: env.CACHE_TTL_SECONDS,
    DATABASE_POOL_MAX: env.DATABASE_POOL_MAX
  });
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  return parsed.data;
}
