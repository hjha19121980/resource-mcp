import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/utils/config.js";
import { MemoryCache } from "../src/utils/cache.js";
import { Metrics } from "../src/utils/metrics.js";

describe("utility components", () => {
  afterEach(() => vi.useRealTimers());

  it("loads defaults and rejects invalid configuration", () => {
    expect(loadConfig({})).toMatchObject({ PORT: 3000, LOG_LEVEL: "info", CACHE_TTL_SECONDS: 60 });
    expect(() => loadConfig({ PORT: "70000" })).toThrow("Invalid configuration");
  });

  it("expires cache entries, respects disabled caching, and bounds stored keys", () => {
    vi.useFakeTimers();
    const cache = new MemoryCache(100, 1);
    cache.set("first", "value");
    vi.advanceTimersByTime(101);
    expect(cache.get("first")).toBeUndefined();
    cache.set("first", "value");
    cache.set("second", "next");
    expect(cache.get("first")).toBeUndefined();
    expect(cache.get("second")).toBe("next");
    const disabled = new MemoryCache(0);
    disabled.set("key", "value");
    expect(disabled.get("key")).toBeUndefined();
  });

  it("tracks tool and database metrics without exposing mutable state", () => {
    const metrics = new Metrics();
    metrics.recordTool(12, true);
    metrics.recordTool(8, false);
    metrics.recordDatabaseQuery(4);
    const snapshot = metrics.snapshot();
    expect(snapshot).toEqual({
      toolInvocations: 2,
      toolErrors: 1,
      databaseQueries: 1,
      toolDurationMilliseconds: 20,
      databaseDurationMilliseconds: 4
    });
    snapshot.toolErrors = 99;
    expect(metrics.snapshot().toolErrors).toBe(1);
  });
});
