import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import {
  createMemoryRateLimitStore,
  createPostgresRateLimitStore,
} from "../http/rate-limit-store.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, PG_URL, type TestDb } from "../testing/harness.js";
import { hashBodyText } from "./middleware.js";
import { createPostgresIdempotencyStore } from "./pg-store.js";
import { createIdempotencyStore } from "./store.js";
import { sweepSharedState } from "./sweep.js";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: "jwt-previous-secret",
  jwtIss: "jord",
  jwtAud: "jord",
};

const dbs: TestDb[] = [];

afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
});

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
    "content-type": "application/json",
    ...extra,
  };
}

/** One "instance": its own app, queue, and (memory-free) stores on `db`. */
function instance(db: TestDb, env: NodeJS.ProcessEnv = {}) {
  return createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    env,
  });
}

describe("memory stores (libSQL path)", () => {
  it("memory rate-limit store counts within a window and resets after it", async () => {
    const store = createMemoryRateLimitStore();
    expect(store.hit("k", 20)).toBe(1);
    expect(store.hit("k", 20)).toBe(2);
    expect(store.hit("other", 20)).toBe(1);
    await new Promise((r) => setTimeout(r, 30));
    expect(store.hit("k", 20)).toBe(1);
  });

  it("a libSQL app keeps the memory path and the 429 body shape", async () => {
    const db = await openTestDb("file");
    dbs.push(db);
    const app = instance(db, { JORD_DATA_RATE_LIMIT: "2" });
    const hit = () =>
      app.request("/records?bucket=lab", { headers: headers() });
    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(200);
    const limited = await hit();
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "too_many_requests" });
    const tables = await db.jord.query(
      "SELECT COUNT(*) AS n FROM jord_rate_limits",
    );
    expect(Number(tables[0]?.n)).toBe(0);
  });

  it("sweep is a no-op on libSQL", async () => {
    const db = await openTestDb("file");
    dbs.push(db);
    expect(await sweepSharedState(db.jord, { rateRetainMs: 1 })).toEqual({
      skipped: "not_postgres",
      idempotency: 0,
      rateLimits: 0,
    });
    expect(() => createPostgresRateLimitStore(db.jord)).toThrow();
    expect(() => createPostgresIdempotencyStore(db.jord, 1000)).toThrow();
    expect(createIdempotencyStore(1000)).toBeDefined();
  });
});

describe.runIf(Boolean(PG_URL))("shared state on Postgres (S0036)", () => {
  it("two stores on one database share one rate-limit budget", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const a = createPostgresRateLimitStore(db.jord);
    const b = createPostgresRateLimitStore(db.jord);
    const windowMs = 60_000;
    expect(await a.hit("records:1.1.1.1", windowMs)).toBe(1);
    expect(await b.hit("records:1.1.1.1", windowMs)).toBe(2);
    expect(await a.hit("records:1.1.1.1", windowMs)).toBe(3);
    expect(await b.hit("records:2.2.2.2", windowMs)).toBe(1);
  });

  it("concurrent hits from two stores never lose a count", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const a = createPostgresRateLimitStore(db.jord);
    const b = createPostgresRateLimitStore(db.jord);
    const counts = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 === 0 ? a : b).hit("burst", 60_000),
      ),
    );
    expect([...counts].sort((x, y) => x - y)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it("two app instances enforce one budget and keep the 429 body", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const env = { JORD_DATA_RATE_LIMIT: "3" };
    const one = instance(db, env);
    const two = instance(db, env);
    const get = (app: typeof one) =>
      app.request("/records?bucket=lab", { headers: headers() });

    expect((await get(one)).status).toBe(200);
    expect((await get(two)).status).toBe(200);
    expect((await get(one)).status).toBe(200);
    const limited = await get(two);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "too_many_requests" });
    expect((await get(one)).status).toBe(429);
  });

  it("a new window starts a new count", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const store = createPostgresRateLimitStore(db.jord);
    expect(await store.hit("w", 50)).toBe(1);
    expect(await store.hit("w", 50)).toBe(2);
    await new Promise((r) => setTimeout(r, 120));
    expect(await store.hit("w", 50)).toBe(1);
  });

  it("replays an idempotent POST across two instances; no second row", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const one = instance(db);
    const two = instance(db);
    const body = JSON.stringify({ bucket: "lab", body: '{"n":1}' });

    const first = await one.request("/records", {
      method: "POST",
      headers: headers({ "Idempotency-Key": "shared-1" }),
      body,
    });
    expect(first.status).toBe(201);
    const firstJson = await first.json();

    const replay = await two.request("/records", {
      method: "POST",
      headers: headers({ "Idempotency-Key": "shared-1" }),
      body,
    });
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(firstJson);

    const list = await one.request("/records?bucket=lab", {
      headers: headers(),
    });
    expect(await list.json()).toHaveLength(1);

    const stored = await db.jord.query(
      "SELECT route, status FROM jord_idempotency WHERE key = 'shared-1'",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]?.route).toBe("POST /records");
    expect(Number(stored[0]?.status)).toBe(201);
  });

  it("same key with a different body → 409 on the other instance", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const one = instance(db);
    const two = instance(db);

    const first = await one.request("/records", {
      method: "POST",
      headers: headers({ "Idempotency-Key": "shared-2" }),
      body: JSON.stringify({ bucket: "lab", body: '{"n":1}' }),
    });
    expect(first.status).toBe(201);

    const conflict = await two.request("/records", {
      method: "POST",
      headers: headers({ "Idempotency-Key": "shared-2" }),
      body: JSON.stringify({ bucket: "lab", body: '{"n":2}' }),
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: "idempotency_conflict",
    });
  });

  it("store round-trips status + body, null bodies, and TTL expiry", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const a = createPostgresIdempotencyStore(db.jord, 60_000);
    const b = createPostgresIdempotencyStore(db.jord, 60_000);
    const hash = hashBodyText('{"x":1}');

    expect(await a.lookup("k", "user:alice", hash)).toEqual({ kind: "miss" });
    await a.remember("k", "user:alice", hash, {
      status: 201,
      body: { id: "abc" },
    });
    expect(await b.lookup("k", "user:alice", hash)).toEqual({
      kind: "hit",
      status: 201,
      body: { id: "abc" },
    });
    expect(await b.lookup("k", "user:alice", hashBodyText("other"))).toEqual({
      kind: "conflict",
    });
    expect(await b.lookup("k", "user:bob", hash)).toEqual({ kind: "miss" });

    await a.remember("nul", "user:alice", hash, { status: 204, body: null });
    expect(await b.lookup("nul", "user:alice", hash)).toEqual({
      kind: "hit",
      status: 204,
      body: null,
    });

    const short = createPostgresIdempotencyStore(db.jord, 10);
    await short.remember("ttl", "user:alice", hash, { status: 200, body: {} });
    await new Promise((r) => setTimeout(r, 40));
    expect(await short.lookup("ttl", "user:alice", hash)).toEqual({
      kind: "miss",
    });
    // An expired row is replaced by the next write.
    await a.remember("ttl", "user:alice", hashBodyText("new"), {
      status: 202,
      body: { again: true },
    });
    expect(
      await a.lookup("ttl", "user:alice", hashBodyText("new")),
    ).toMatchObject({ kind: "hit", status: 202 });
  });

  it("first writer wins while a row is live", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const store = createPostgresIdempotencyStore(db.jord, 60_000);
    const hash = hashBodyText("same");
    await store.remember("race", "p", hash, { status: 201, body: { w: 1 } });
    await store.remember("race", "p", hash, { status: 201, body: { w: 2 } });
    expect(await store.lookup("race", "p", hash)).toMatchObject({
      body: { w: 1 },
    });
  });

  it("sweeper removes expired idempotency rows and dead rate windows only", async () => {
    const db = await openTestDb("postgres");
    dbs.push(db);
    const live = createPostgresIdempotencyStore(db.jord, 60_000);
    const dead = createPostgresIdempotencyStore(db.jord, 5);
    const hash = hashBodyText("s");
    await live.remember("live", "p", hash, { status: 200, body: {} });
    await dead.remember("dead", "p", hash, { status: 200, body: {} });
    const rate = createPostgresRateLimitStore(db.jord);
    await db.jord.query(
      "INSERT INTO jord_rate_limits (bucket, window_start, count) VALUES ('old', 0, 5)",
    );
    await rate.hit("fresh", 60_000);
    await new Promise((r) => setTimeout(r, 80));

    // Retain > window, as the job does (2x window), so a live window survives.
    const result = await sweepSharedState(db.jord, { rateRetainMs: 120_000 });
    expect(result).toEqual({ idempotency: 1, rateLimits: 1 });

    const idem = await db.jord.query("SELECT key FROM jord_idempotency");
    expect(idem.map((r) => r.key)).toEqual(["live"]);
    const windows = await db.jord.query("SELECT bucket FROM jord_rate_limits");
    expect(windows.map((r) => r.bucket)).toEqual(["fresh"]);
  });
});
