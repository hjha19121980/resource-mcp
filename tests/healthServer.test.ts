import type { AddressInfo } from "node:net";
import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startHealthServer } from "../src/server/healthServer.js";
import { Metrics } from "../src/utils/metrics.js";

describe("health and metrics HTTP listener", () => {
  const servers: Array<ReturnType<typeof startHealthServer>> = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      })
    ));
  });

  async function start(query: ReturnType<typeof vi.fn>) {
    const server = startHealthServer(0, { query } as unknown as Pool, new Metrics());
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  it("reports database health and metrics and rejects unsupported paths/methods", async () => {
    const baseUrl = await start(vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }));
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ status: "ok" });

    const metrics = await fetch(`${baseUrl}/metrics`);
    expect(metrics.status).toBe(200);
    await expect(metrics.json()).resolves.toMatchObject({ databaseQueries: 0 });
    expect((await fetch(`${baseUrl}/missing`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/health`, { method: "POST" })).status).toBe(405);
  });

  it("returns an unhealthy response when PostgreSQL is unavailable", async () => {
    const baseUrl = await start(vi.fn().mockRejectedValue(new Error("connection failed")));
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unhealthy" });
  });
});
