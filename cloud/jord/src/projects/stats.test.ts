import { randomBytes } from "node:crypto";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import {
  createAesGcmSecretPort,
  createJordClient,
  fsPathToFileUrl,
  type JordDriverPort,
} from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { aggregateRequestLogs, percentile, templatePath } from "../logs/aggregate.js";
import { createWriteQueue } from "../queue.js";
import { RealtimeBus } from "../realtime/bus.js";
import {
  collectProjectStats,
  PROJECT_STATS_OPENAPI,
  LOG_ROW_CAP,
} from "./stats.js";
import { attachRealtimeCounters } from "./stats-counters.js";

const temps: string[] = [];
afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: "jwt-previous-secret",
  jwtIss: "jord",
  jwtAud: "jord",
};
const hdr = (role: string) => ({
  authorization: `Bearer ${signSessionToken(role as "admin", AUTH.secret)}`,
  "content-type": "application/json",
});

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-stats-"));
  temps.push(dir);
  const jord = await createJordClient({ url: fsPathToFileUrl(path.join(dir, "c.db")) });
  const queue = createWriteQueue();
  const app = createJordApp({
    jord,
    enqueueWrite: queue,
    auth: AUTH,
    secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
    projectConnectTest: async () => ({ ok: true }),
    projectBaseline: async () => undefined,
  });
  const res = await app.request("/admin/projects", {
    method: "POST",
    headers: hdr("admin"),
    body: JSON.stringify({ slug: "stats-proj", engine: "libsql-file", target: "./data/s.db" }),
  });
  const { project } = (await res.json()) as { project: { id: string } };
  return { app, jord, id: project.id };
}

async function seedHttp(
  jord: JordDriverPort,
  rows: Array<{ at: number; method: string; status: number; ms: number }>,
) {
  let i = 0;
  for (const r of rows) {
    await jord.query(
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json) VALUES (?, ?, 'info', 'http', 'm', ?)`,
      [
        `seed-${r.at}-${i++}`,
        r.at,
        JSON.stringify({ method: r.method, path: "/x", status: r.status, ms: r.ms }),
      ],
    );
  }
}

describe("S0095 aggregate (pure)", () => {
  it("nearest-rank percentiles are exact", () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(sorted, 50)).toBe(50);
    expect(percentile(sorted, 95)).toBe(95);
    expect(percentile([], 50)).toBeNull();
  });

  it("fixed fixture gives exact counts", () => {
    const now = 1_000_000_000_000;
    const mk = (s: number, m: string, status: number, ms: number) => ({
      at: now - s * 1000,
      meta_json: JSON.stringify({ method: m, path: "/p", status, ms }),
    });
    const out = aggregateRequestLogs(
      [mk(10, "GET", 200, 10), mk(20, "GET", 404, 20), mk(30, "POST", 500, 30), mk(40, "POST", 500, 40)],
      { now, window: "1h", truncated: false },
    );
    expect(out.requests.total).toBe(4);
    expect(out.requests.byStatus).toEqual({ "2xx": 1, "4xx": 1, "5xx": 2 });
    expect(out.requests.byMethod).toEqual({ GET: 2, POST: 2 });
    expect(out.requests.errorRate).toBe(0.5);
    expect(out.latency).toMatchObject({ p50: 20, p95: 40 });
    expect(out.errors[0]).toMatchObject({ method: "POST", status: 500, count: 2 });
    expect(out.requests.series.reduce((a, s) => a + s.total, 0)).toBe(4);
  });

  it("window selection drops older rows", () => {
    const now = 1_000_000_000_000;
    const rows = [
      { at: now - 30 * 60_000, meta_json: '{"method":"GET","path":"/","status":200,"ms":1}' },
      { at: now - 2 * 3_600_000, meta_json: '{"method":"GET","path":"/","status":200,"ms":1}' },
      { at: now - 2 * 86_400_000, meta_json: '{"method":"GET","path":"/","status":200,"ms":1}' },
    ];
    const n = (w: "1h" | "24h" | "7d") =>
      aggregateRequestLogs(rows, { now, window: w, truncated: false }).requests.total;
    expect([n("1h"), n("24h"), n("7d")]).toEqual([1, 2, 3]);
  });
});

describe("S0095 GET /admin/projects/:id/stats", () => {
  it("returns versioned stats reconciled with seeded logs", async () => {
    const { app, jord, id } = await boot();
    const now = Date.now();
    await seedHttp(
      jord,
      Array.from({ length: 100 }, (_, i) => ({
        at: now - 1000 - i,
        method: i % 4 === 0 ? "POST" : "GET",
        status: i < 10 ? 500 : 200,
        ms: i + 1,
      })),
    );
    await seedHttp(jord, [{ at: now - 2 * 3_600_000, method: "GET", status: 200, ms: 5 }]);

    const res = await app.request(`/admin/projects/${id}/stats?window=1h`, { headers: hdr("admin") });
    expect(res.status).toBe(200);
    const b = (await res.json()) as any;
    expect(b.version).toBe(1);
    expect(b.window).toBe("1h");
    expect(b.partial).toBe(false);
    expect(b.partial_sections).toEqual([]);
    expect(b.requests.total).toBeGreaterThanOrEqual(100);
    expect(b.requests.byMethod.POST).toBe(25);
    expect(b.requests.byStatus["5xx"]).toBe(10);
    expect(b.db.tables).toBeGreaterThan(5);
    expect(b.db.sizeBytes).toBeGreaterThan(0);
    expect(b.queue.depth).toBe(0);
    expect(b.blobs).toEqual({ bytes: 0, objects: 0 });
    expect(b.realtime).toEqual({ subscribers: 0, eventsPerMin: 0 });

    const day = (await (await app.request(`/admin/projects/${id}/stats?window=24h`, { headers: hdr("admin") })).json()) as any;
    expect(day.requests.total).toBe(b.requests.total + 1);

    // by slug works too; bad window is 400
    expect((await app.request(`/admin/projects/stats-proj/stats`, { headers: hdr("admin") })).status).toBe(200);
    expect((await app.request(`/admin/projects/${id}/stats?window=9y`, { headers: hdr("admin") })).status).toBe(400);
  });

  it("is admin-only and 404 for unknown project", async () => {
    const { app, id } = await boot();
    expect((await app.request(`/admin/projects/${id}/stats`, { headers: hdr("editor") })).status).toBe(403);
    expect((await app.request(`/admin/projects/${id}/stats`)).status).toBe(401);
    const nf = await app.request(`/admin/projects/nope/stats`, { headers: hdr("admin") });
    expect(nf.status).toBe(404);
  });

  it("large window is bounded: 100k-row logs table capped at LOG_ROW_CAP", async () => {
    const { app, jord, id } = await boot();
    const now = Date.now();
    await jord.query(
      `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 100000)
       INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       SELECT 'bulk-' || i, ${now} - (i % 600000), 'info', 'http', 'm',
              '{"method":"GET","path":"/x","status":200,"ms":' || (i % 100) || '}'
       FROM n`,
    );
    const t0 = Date.now();
    const res = await app.request(`/admin/projects/${id}/stats?window=7d`, { headers: hdr("admin") });
    const elapsed = Date.now() - t0;
    const b = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(b.requests.sampled).toBeLessThanOrEqual(LOG_ROW_CAP);
    expect(b.requests.total).toBeLessThanOrEqual(LOG_ROW_CAP);
    expect(b.requests.truncated).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  }, 60_000);
});

describe("S0095 partial + unreachable", () => {
  it("one slow section becomes null with partial:true, rest intact", async () => {
    const { jord } = await boot();
    const slow = new Proxy(jord, {
      get(t, k, r) {
        if (k !== "query") return Reflect.get(t, k, r);
        return async (sql: string, args?: unknown[]) => {
          if (sql.includes("FROM jord_policies ")) await new Promise((res) => setTimeout(res, 400));
          return t.query(sql, args as never);
        };
      },
    }) as JordDriverPort;
    const { body, unreachable } = await collectProjectStats(slow, "1h", { sectionTimeoutMs: 50 });
    expect(unreachable).toBe(false);
    expect(body.partial).toBe(true);
    expect(body.partial_sections).toEqual(["policies", "realtime"]);
    expect(body.policies).toBeNull();
    expect(body.db).not.toBeNull();
    expect(body.requests).not.toBeNull();
  });

  it("all DB sections failing is unreachable (route answers 503 stats_unavailable)", async () => {
    const { jord } = await boot();
    const dead = new Proxy(jord, {
      get(t, k, r) {
        if (k !== "query") return Reflect.get(t, k, r);
        return async () => {
          throw new Error("connection refused");
        };
      },
    }) as JordDriverPort;
    const { body, unreachable } = await collectProjectStats(dead, "1h");
    expect(unreachable).toBe(true);
    expect(body.partial_sections).toContain("db");
  });
});

describe("S0095 counters + openapi", () => {
  it("realtime counters count events and exclude their own listener", () => {
    const bus = new RealtimeBus();
    let t = 1_000_000;
    const c = attachRealtimeCounters(bus, () => t);
    const off = bus.trySubscribe(() => undefined)!;
    expect(c.subscribers()).toBe(1);
    for (let i = 0; i < 7; i++) bus.publish({ table: "a", op: "insert", id: String(i) } as never);
    expect(c.eventsPerMin()).toBe(7);
    t += 61_000;
    expect(c.eventsPerMin()).toBe(0);
    off();
  });

  it("OpenAPI fragment documents the route", () => {
    expect(Object.keys(PROJECT_STATS_OPENAPI)).toEqual(["/admin/projects/{id}/stats"]);
  });
});

describe("S0095 error path templating (review fix)", () => {
  it("collapses ids and user-chosen object keys", () => {
    expect(templatePath("/blobs/photos/objects/ada@lab.test/avatar.png")).toBe("/blobs/photos/objects/:key");
    expect(templatePath("/api/v1/posts/123")).toBe("/api/v1/posts/:id");
    expect(templatePath("/records/0b9d6f2c-1c1e-4b6e-9d3a-5f2f7c1a8e44")).toBe("/records/:id");
    expect(templatePath("/api/v1/posts?select=*")).toBe("/api/v1/posts");
    expect(templatePath("/admin/projects/abc/stats")).toBe("/admin/projects/abc/stats");
  });
});
