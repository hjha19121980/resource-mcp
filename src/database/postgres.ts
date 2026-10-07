import pg from "pg";
import type { Metrics } from "../utils/metrics.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

export function createDatabase(databaseUrl: string, poolMax: number, metrics: Metrics): pg.Pool {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
  pool.on("error", (error: Error) => logger.error({ err: error }, "Unexpected PostgreSQL pool error"));

  const originalQuery = pool.query.bind(pool) as (
    text: string,
    values?: unknown[]
  ) => Promise<pg.QueryResult>;
  pool.query = ((text: string, values?: unknown[]) => {
    const startedAt = performance.now();
    const query = values === undefined ? originalQuery(text) : originalQuery(text, values);
    return query.finally(() => {
      const durationMilliseconds = performance.now() - startedAt;
      metrics.recordDatabaseQuery(durationMilliseconds);
      logger.debug({ durationMilliseconds, query: text }, "Database query completed");
    });
  }) as typeof pool.query;

  return pool;
}
