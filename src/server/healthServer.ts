import { createServer, type Server as HttpServer } from "node:http";
import type { Pool } from "pg";
import type { Metrics } from "../utils/metrics.js";
import { logger } from "../utils/logger.js";

export function startHealthServer(port: number, pool: Pool, metrics: Metrics): HttpServer {
  const server = createServer((request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405).end();
      return;
    }
    if (request.url === "/health") {
      void pool.query("SELECT 1").then(
        () => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ status: "ok" }));
        },
        (error: unknown) => {
          logger.error({ err: error }, "Health check database query failed");
          response.writeHead(503, { "content-type": "application/json" });
          response.end(JSON.stringify({ status: "unhealthy" }));
        }
      );
      return;
    }
    if (request.url === "/metrics") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(metrics.snapshot()));
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(port, "0.0.0.0", () => logger.info({ port }, "Health and metrics listener started"));
  return server;
}
