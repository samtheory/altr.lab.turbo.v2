import { randomBytes } from "node:crypto";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createAesGcmSecretPort, createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { RealtimeBus } from "../realtime/bus.js";
import { Hono } from "hono";
import type { JordAuthVariables } from "../auth/middleware.js";
import { createProjectStatsRoutes, PROJECT_REALTIME_STATS_OPENAPI } from "./stats.js";
import { attachRealtimeCounters, MAX_TRACKED_TABLES } from "./stats-counters.js";

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
const ev = (table: string, i = 0) => ({ type: "jord.change", table, op: "insert", id: String(i), at: 0, dialect: "libsql" }) as never;

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-rtstats-"));
  temps.push(dir);
  const jord = await createJordClient({ url: fsPathToFileUrl(path.join(dir, "c.db")) });
  const bus = new RealtimeBus();
  const sharedSecrets = createAesGcmSecretPort({ masterKey: randomBytes(32) });
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    secrets: sharedSecrets,
    projectConnectTest: async () => ({ ok: true }),
    projectBaseline: async () => undefined,
    realtime: bus,
  });
  const res = await app.request("/admin/projects", {
    method: "POST",
    headers: hdr("admin"),
    body: JSON.stringify({ slug: "rt-proj", engine: "libsql-file", target: "./data/r.db" }),
  });
  const { project } = (await res.json()) as { project: { id: string } };
  return { app, bus, jord, secrets: sharedSecrets, id: project.id };
}

describe("S0086 counters", () => {
  it("lastEventAt, topTables ordering, jord_* exclusion", () => {
    const bus = new RealtimeBus();
    let t = 5_000_000;
    const c = attachRealtimeCounters(bus, () => t);
    expect(c.lastEventAt()).toBeNull();
    for (let i = 0; i < 3; i++) bus.publish(ev("posts", i));
    for (let i = 0; i < 5; i++) bus.publish(ev("users", i));
    bus.publish(ev("jord_logs"));
    t += 1000;
    bus.publish(ev("a"));
    expect(c.lastEventAt()).toBe(t);
    expect(c.eventsPerMin()).toBe(10);
    expect(c.topTables(10)).toEqual([
      { table: "users", events: 5 },
      { table: "posts", events: 3 },
      { table: "a", events: 1 },
    ]);
    expect(c.topTables(1)).toHaveLength(1);
    t += 61_000;
    expect(c.topTables(10)).toEqual([]);
  });

  it("caps distinct tracked tables per window", () => {
    const bus = new RealtimeBus();
    const c = attachRealtimeCounters(bus, () => 9_000_000);
    for (let i = 0; i < 100; i++) bus.publish(ev(`t${i}`));
    expect(c.eventsPerMin()).toBe(100);
    expect(c.topTables(1000)).toHaveLength(MAX_TRACKED_TABLES);
  });
});

describe("S0086 GET /admin/projects/:id/realtime-stats", () => {
  it("admin-only, 401, unknown 404", async () => {
    const { app, id } = await boot();
    const p = `/admin/projects/${id}/realtime-stats`;
    expect((await app.request(p, { headers: hdr("editor") })).status).toBe(403);
    expect((await app.request(p)).status).toBe(401);
    expect((await app.request(`/admin/projects/nope/realtime-stats`, { headers: hdr("admin") })).status).toBe(404);
  });

  it("returns counts for published events and caches 2 s", async () => {
    const { app, bus, id } = await boot();
    const p = `/admin/projects/${id}/realtime-stats`;
    const empty = (await (await app.request(p, { headers: hdr("admin") })).json()) as Record<string, unknown>;
    expect(empty).toMatchObject({ version: 1, eventsPerMin: 0, lastEventAt: null, lastEventAgeMs: null, tables: [] });
    // still cached: new events are not visible yet
    bus.publish(ev("posts"));
    const cached = (await (await app.request(p, { headers: hdr("admin") })).json()) as Record<string, unknown>;
    expect(cached.generated_at).toBe(empty.generated_at);
    expect(cached.eventsPerMin).toBe(0);
  });

  it("shape with events, injected clock, cache expiry", async () => {
    const { jord, secrets, id } = await boot();
    const bus = new RealtimeBus();
    let t = 10_000_000;
    const counters = attachRealtimeCounters(bus, () => t);
    const sub = bus.trySubscribe(() => undefined)!;
    const routes = createProjectStatsRoutes(
      { jord, secrets, enqueueWrite: (w) => w() },
      { realtime: counters, now: () => t },
    );
    const app = new Hono<{ Variables: JordAuthVariables }>();
    app.use("*", async (c, next) => {
      c.set("principal", { kind: "operator", role: "admin" } as never);
      await next();
    });
    app.route("/admin", routes);
    const get = async () =>
      (await (await app.request(`/admin/projects/${id}/realtime-stats`)).json()) as Record<string, unknown>;
    bus.publish(ev("posts"));
    bus.publish(ev("posts"));
    bus.publish(ev("jord_logs"));
    t += 500;
    const a = await get();
    expect(a).toEqual({
      version: 1,
      generated_at: t,
      subscribers: 1,
      eventsPerMin: 3,
      lastEventAt: 10_000_000,
      lastEventAgeMs: 500,
      tables: [{ table: "posts", events: 2 }],
    });
    t += 1000; // within 2 s: cached
    expect(await get()).toEqual(a);
    t += 1500; // expired
    const b = await get();
    expect(b.lastEventAgeMs).toBe(3000);
    expect(b.generated_at).toBe(t);
    sub();
  });

  it("OpenAPI fragment", () => {
    expect(Object.keys(PROJECT_REALTIME_STATS_OPENAPI)).toEqual(["/admin/projects/{id}/realtime-stats"]);
  });
});
