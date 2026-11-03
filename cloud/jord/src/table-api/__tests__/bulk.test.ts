import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../../app.js";
import type { JordAuthConfig } from "../../auth/config.js";
import { signAccessToken } from "../../auth/jwt.js";
import { signSessionToken } from "../../auth/token.js";
import { createWriteQueue } from "../../queue.js";
import { RealtimeBus, type JordChangeEvent } from "../../realtime/index.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../../testing/harness.js";
import { mapDriverError, PG_UNIQUE_INDEX_SQL } from "../bulk.js";
import { compilePriorSelect } from "../sql.js";

const open: TestDb[] = [];
const JWT = "jwt-current-secret";
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const JSON_CT = { "content-type": "application/json" };
const SERVICE = { ...bearer(AUTH.secret), ...JSON_CT };
const ADMIN = { ...bearer(signSessionToken("admin", AUTH.secret)), ...JSON_CT };
const asUser = (sub: string) => ({
  ...bearer(signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub, role: "user" }).token),
  ...JSON_CT,
});

type Row = Record<string, unknown>;
type BulkBody = {
  inserted: number;
  updated: number;
  ignored: number;
  failed: number;
  results: Array<Row & { index: number; status: number }>;
  error?: string;
  index?: number;
};

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  const realtime = new RealtimeBus();
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    realtime,
  });
  return { app, db, realtime };
}

type App = Awaited<ReturnType<typeof boot>>["app"];

async function bulk(app: App, path: string, rows: unknown, headers: Record<string, string> = SERVICE) {
  const res = await app.request(`/api/v1/${path}`, { method: "POST", headers, body: JSON.stringify(rows) });
  return { res, body: (await res.json()) as BulkBody };
}

async function track(app: App, table: string) {
  const res = await app.request(`/schema/tables/${table}/track`, {
    method: "PUT",
    headers: ADMIN,
    body: JSON.stringify({ tracked: true }),
  });
  expect(res.status).toBe(200);
}

async function policy(app: App, table: string, operation: string, rules: unknown[]) {
  const res = await app.request("/policies", {
    method: "POST",
    headers: ADMIN,
    body: JSON.stringify({
      name: `${table} ${operation}`,
      table_name: table,
      operation,
      effect: "allow",
      rules: JSON.stringify(rules),
    }),
  });
  expect(res.status).toBe(201);
}

async function ownerScoped(app: App, table: string, ops: string[]) {
  const res = await app.request(`/schema/tables/${table}/rls`, {
    method: "PUT",
    headers: ADMIN,
    body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
  });
  expect(res.status).toBe(200);
  for (const op of ops) await policy(app, table, op, [{ kind: "owner_eq", config: { column: "owner_id" } }]);
}

async function rows(db: TestDb, sql: string): Promise<Row[]> {
  return db.ddl.query(sql);
}

describe("S0080 bulk driver-error mapping", () => {
  const info = { name: "t", columns: [{ name: "title", type: "TEXT", notnull: true, pk: false, dflt_value: null }] };
  it("maps unique / not-null / unknown without leaking driver text", () => {
    const sqlite = mapDriverError(0, new Error("SQLITE_CONSTRAINT_PRIMARYKEY: UNIQUE constraint failed: t.id"), info);
    expect(sqlite).toMatchObject({ status: 409, error: "conflict" });
    expect(JSON.stringify(sqlite)).not.toContain("t.id");
    const pg = mapDriverError(1, Object.assign(new Error('duplicate key value violates unique constraint "t_pkey"'), { code: "23505" }), info);
    expect(pg).toMatchObject({ status: 409, error: "conflict" });
    expect(JSON.stringify(pg)).not.toContain("t_pkey");
    const nn = mapDriverError(2, new Error("NOT NULL constraint failed: t.title"), info);
    expect(nn).toMatchObject({ status: 422, error: "not_null_violation", field: "title" });
    const secret = mapDriverError(3, Object.assign(new Error("NOT NULL constraint failed: other.hidden"), {}), info);
    expect(secret).not.toHaveProperty("field");
    const original = console.error;
    console.error = () => undefined;
    try {
      const unknown = mapDriverError(4, new Error("connection to 10.0.0.5 refused"), info);
      expect(unknown).toMatchObject({ status: 500, error: "write_failed", message: "row could not be written" });
    } finally {
      console.error = original;
    }
  });
});

describe.each(TEST_BACKENDS)("S0080 bulk insert / upsert (%s)", (backend) => {
  async function seedNotes(app: App, db: TestDb) {
    await db.ownerSql(
      "CREATE TABLE notes (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, owner_id TEXT)",
    );
    await db.ownerSql("CREATE UNIQUE INDEX notes_slug ON notes (slug)");
    await track(app, "notes");
  }

  it("per-row partial success by default: duplicate key and bad row fail alone", async () => {
    const { app, db } = await boot(backend);
    await seedNotes(app, db);
    await db.ownerSql("INSERT INTO notes (id, slug, title) VALUES (1, 'a', 'existing')");
    const { res, body } = await bulk(app, "notes/bulk", [
      { id: 2, slug: "b", title: "two" },
      { id: 1, slug: "dup", title: "dup pk" },
      { id: 3, slug: "c", nope: "x" },
      { id: 4, slug: "b", title: "dup slug" },
      { id: 5, slug: "e", title: "five" },
      "not-an-object",
    ]);
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ inserted: 2, updated: 0, failed: 4 });
    expect(body.results.map((r) => [r.index, r.status, r.error ?? r.op])).toEqual([
      [0, 201, "insert"],
      [1, 409, "conflict"],
      [2, 400, "bad_column"],
      [3, 409, "conflict"],
      [4, 201, "insert"],
      [5, 400, "bad_row"],
    ]);
    expect(body.results[0]).toMatchObject({ id: "2" });
    expect(body.results[0]).not.toHaveProperty("data");
    // No driver text in per-row errors.
    expect(JSON.stringify(body)).not.toMatch(/constraint|SQLITE|duplicate key value|notes_slug|pkey/i);
    const stored = await rows(db, "SELECT id FROM notes ORDER BY id");
    expect(stored.map((r) => Number(r.id))).toEqual([1, 2, 5]);
  });

  it("atomic=true rolls back everything on the first failure and reports its index", async () => {
    const { app, db, realtime } = await boot(backend);
    await seedNotes(app, db);
    const events: JordChangeEvent[] = [];
    realtime.trySubscribe((e) => events.push(e));
    await db.ownerSql("INSERT INTO notes (id, slug, title) VALUES (1, 'a', 'existing')");
    const conflict = await bulk(app, "notes/bulk?atomic=true", [
      { id: 2, slug: "b", title: "two" },
      { id: 3, slug: "c", title: "three" },
      { id: 1, slug: "z", title: "dup" },
      { id: 4, slug: "d", title: "four" },
    ]);
    expect(conflict.res.status).toBe(409);
    expect(conflict.body).toMatchObject({ error: "conflict", index: 2 });
    const invalid = await bulk(app, "notes/bulk?atomic=true", [{ id: 7, slug: "q", title: "ok" }, { id: 8 }]);
    expect(invalid.res.status).toBe(422);
    expect(invalid.body).toMatchObject({ error: "not_null_violation", index: 1 });
    expect((await rows(db, "SELECT id FROM notes ORDER BY id")).map((r) => Number(r.id))).toEqual([1]);
    expect(events.filter((e) => e.table === "notes")).toEqual([]);

    const ok = await bulk(app, "notes/bulk?atomic=true", [
      { id: 2, slug: "b", title: "two" },
      { id: 3, slug: "c", title: "three" },
    ]);
    expect(ok.res.status).toBe(200);
    expect(ok.body).toMatchObject({ inserted: 2, failed: 0 });
  });

  it("upsert merges on the PK or a unique index, ignore leaves rows untouched, and emits one event per written row", async () => {
    const { app, db, realtime } = await boot(backend);
    await seedNotes(app, db);
    const events: JordChangeEvent[] = [];
    realtime.trySubscribe((e) => events.push(e));
    await db.ownerSql("INSERT INTO notes (id, slug, title) VALUES (1, 'a', 'old')");

    const merged = await bulk(
      app,
      "notes/bulk?on_conflict=id",
      [
        { id: 1, slug: "a", title: "new" },
        { id: 2, slug: "b", title: "two" },
        { id: 2, slug: "b", title: "two again" },
        { id: 3, slug: "a", title: "slug clash" },
      ],
      { ...SERVICE, prefer: "return=representation" },
    );
    expect(merged.res.status).toBe(200);
    expect(merged.body).toMatchObject({ inserted: 1, updated: 2, failed: 1 });
    expect(merged.body.results.map((r) => r.op ?? r.error)).toEqual(["update", "insert", "update", "conflict"]);
    expect(merged.body.results[0]!.data).toMatchObject({ id: 1, title: "new" });

    const bySlug = await bulk(app, "notes/bulk?on_conflict=slug", [{ slug: "a", title: "via slug" }]);
    expect(bySlug.body.results[0]).toMatchObject({ status: 200, op: "update", id: "1" });

    const ignored = await bulk(app, "notes/bulk?on_conflict=slug&resolution=ignore", [
      { slug: "a", title: "ignored" },
      { id: 9, slug: "i", title: "nine" },
    ]);
    expect(ignored.body).toMatchObject({ inserted: 1, updated: 0, ignored: 1, failed: 0 });
    expect(ignored.body.results[0]).toEqual({ index: 0, status: 200, op: "ignore" });

    const stored = await rows(db, "SELECT id, title FROM notes ORDER BY id");
    expect(stored.map((r) => [Number(r.id), r.title])).toEqual([
      [1, "via slug"],
      [2, "two again"],
      [9, "nine"],
    ]);
    const changes = await rows(db, "SELECT op, pk FROM jord_changes WHERE table_name = 'notes' ORDER BY seq");
    expect(changes.map((r) => [r.op, r.pk])).toEqual([
      ["update", "1"],
      ["insert", "2"],
      ["update", "2"],
      ["update", "1"],
      ["insert", "9"],
    ]);
    expect(events.filter((e) => e.table === "notes").map((e) => `${e.op}:${e.id}`)).toEqual([
      "update:1",
      "insert:2",
      "update:2",
      "update:1",
      "insert:9",
    ]);
  });

  it("validates on_conflict against real unique keys and the other params", async () => {
    const { app, db } = await boot(backend);
    await seedNotes(app, db);
    const one = [{ id: 1, slug: "a", title: "t" }];
    for (const [query, status, error] of [
      ["on_conflict=title", 400, "bad_on_conflict"],
      ["on_conflict=id,slug", 400, "bad_on_conflict"],
      ["on_conflict=ghost", 400, "bad_column"],
      ["resolution=ignore", 400, "bad_resolution"],
      ["on_conflict=id&resolution=replace", 400, "bad_resolution"],
      ["atomic=maybe", 400, "bad_atomic"],
      ["id=eq.1", 400, "bad_param"],
    ] as const) {
      const r = await bulk(app, `notes/bulk?${query}`, one);
      expect(r.res.status, query).toBe(status);
      expect(r.body.error, query).toBe(error);
    }
    const missing = await bulk(app, "notes/bulk?on_conflict=slug", [{ title: "no slug" }]);
    expect(missing.body.results[0]).toMatchObject({ status: 422, error: "missing_conflict_value", field: "slug" });
    expect((await bulk(app, "notes/bulk?on_conflict=slug", one)).res.status).toBe(200);
    expect((await bulk(app, "notes/bulk", { id: 1 })).body.error).toBe("bad_body");
    expect((await bulk(app, "notes/bulk", [])).body.error).toBe("bad_body");
    expect((await bulk(app, "ghost/bulk", one)).res.status).toBe(404);
    expect((await bulk(app, "jord_policies/bulk", one)).res.status).toBe(404);
  });

  it("caps rows at 500 and the body at the JSON cap (413)", async () => {
    const { app, db } = await boot(backend);
    await seedNotes(app, db);
    const many = Array.from({ length: 501 }, (_, i) => ({ id: i + 1, slug: `s${i}`, title: "t" }));
    const tooMany = await bulk(app, "notes/bulk", many);
    expect(tooMany.res.status).toBe(413);
    expect(tooMany.body.error).toBe("too_many_rows");
    const ok = await bulk(app, "notes/bulk", many.slice(0, 500));
    expect(ok.body.inserted).toBe(500);

    const huge = JSON.stringify([{ id: 9999, slug: "big", title: "x".repeat(1024 * 1024) }]);
    const declared = await app.request("/api/v1/notes/bulk", { method: "POST", headers: SERVICE, body: huge });
    expect(declared.status).toBe(413);
    // Chunked body with no Content-Length is capped while streaming.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(huge));
        controller.close();
      },
    });
    const chunked = await app.request("/api/v1/notes/bulk", {
      method: "POST",
      headers: SERVICE,
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(chunked.status).toBe(413);
    expect(await rows(db, "SELECT id FROM notes WHERE id = 9999")).toEqual([]);
  });

  it("owner-scoped user cannot overwrite another owner's row via on_conflict (both branches)", async () => {
    const { app, db } = await boot(backend);
    await seedNotes(app, db);
    await ownerScoped(app, "notes", ["select", "insert", "update"]);
    await db.ownerSql(
      "INSERT INTO notes (id, slug, title, owner_id) VALUES (1, 'mine', 'm', 'user-1'), (2, 'theirs', 't', 'user-2')",
    );
    const u1 = asUser("user-1");

    // Update branch: target exists and belongs to user-2.
    const hijack = await bulk(
      app,
      "notes/bulk?on_conflict=id",
      [
        { id: 2, slug: "theirs", title: "pwned" },
        { id: 2, slug: "theirs", title: "pwned", owner_id: "user-1" },
        { id: 1, slug: "mine", title: "mine v2" },
        { id: 1, slug: "mine", title: "give away", owner_id: "user-2" },
      ],
      u1,
    );
    expect(hijack.res.status).toBe(200);
    const statuses = hijack.body.results.map((r) => [r.status, r.error ?? r.op]);
    // Postgres FORCE RLS may hide row 2 first → the insert collides (409); never written.
    expect([403, 409]).toContain(statuses[0]![0]);
    expect([403, 409]).toContain(statuses[1]![0]);
    expect(statuses[2]).toEqual([200, "update"]);
    expect(statuses[3]).toEqual([403, "policy_denied"]);
    // Failed rows carry no row data (nothing about user-2's row leaks).
    for (const r of hijack.body.results.slice(0, 2)) {
      expect(Object.keys(r).sort()).toEqual(["error", "index", "message", "status"]);
    }

    // Insert branch: owner column is stamped to the caller, never another principal.
    const inserted = await bulk(
      app,
      "notes/bulk?on_conflict=id",
      [{ id: 3, slug: "new", title: "n", owner_id: "user-2" }],
      { ...u1, prefer: "return=representation" },
    );
    expect(inserted.body.results[0]).toMatchObject({ status: 201, op: "insert" });
    expect((inserted.body.results[0]!.data as Row).owner_id).toBe("user-1");

    // Same rules in insert mode and atomic mode.
    const atomic = await bulk(app, "notes/bulk?on_conflict=id&atomic=true", [
      { id: 4, slug: "four", title: "x" },
      { id: 2, slug: "theirs", title: "pwned" },
    ], u1);
    expect([403, 409]).toContain(atomic.res.status);
    expect(atomic.body.index).toBe(1);

    const stored = await rows(db, "SELECT id, title, owner_id FROM notes ORDER BY id");
    expect(stored.map((r) => [Number(r.id), r.title, r.owner_id])).toEqual([
      [1, "mine v2", "user-1"],
      [2, "t", "user-2"],
      [3, "n", "user-1"],
    ]);
  });

  it("insert-only permission: update-branch rows are denied per row; no permission at all is 403", async () => {
    const { app, db } = await boot(backend);
    await seedNotes(app, db);
    await ownerScoped(app, "notes", ["select", "insert"]);
    await db.ownerSql("INSERT INTO notes (id, slug, title, owner_id) VALUES (1, 'mine', 'm', 'user-1')");
    const u1 = asUser("user-1");
    const r = await bulk(app, "notes/bulk?on_conflict=id", [
      { id: 1, slug: "mine", title: "changed" },
      { id: 5, slug: "five", title: "new" },
    ], u1);
    expect(r.body.results.map((x) => [x.status, x.error ?? x.op])).toEqual([
      [403, "policy_denied"],
      [201, "insert"],
    ]);
    expect((await rows(db, "SELECT title FROM notes WHERE id = 1"))[0]!.title).toBe("m");

    await db.ownerSql("CREATE TABLE locked (id INTEGER PRIMARY KEY, owner_id TEXT)");
    const rls = await app.request("/schema/tables/locked/rls", {
      method: "PUT",
      headers: ADMIN,
      body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
    });
    expect(rls.status).toBe(200);
    const denied = await bulk(app, "locked/bulk", [{ id: 1 }], u1);
    expect(denied.res.status).toBe(403);
    expect(denied.body.error).toBe("policy_denied");
  });
});

describe("S0080 hardening (SQL shape)", () => {
  it("PG unique-index introspection only accepts valid, ready, immediate indexes", () => {
    for (const flag of ["i.indisvalid", "i.indisready", "i.indimmediate", "i.indisunique"]) {
      expect(PG_UNIQUE_INDEX_SQL).toContain(flag);
    }
    expect(PG_UNIQUE_INDEX_SQL).toContain("i.indpred IS NULL");
    expect(PG_UNIQUE_INDEX_SQL).toContain("i.indexprs IS NULL");
  });

  it("the PG existence probe selects key columns without FOR UPDATE; the scoped read still locks", () => {
    const info = {
      name: "notes",
      schema: "public",
      columns: [
        { name: "id", type: "INTEGER", notnull: true, pk: true, dflt_value: null },
        { name: "owner", type: "TEXT", notnull: false, pk: false, dflt_value: null },
      ],
    } as Parameters<typeof compilePriorSelect>[0];
    const filters = [{ column: "id", op: "eq" as const, values: [1] }];
    const probe = compilePriorSelect(info, filters, "postgres", false, undefined, {
      lock: false,
      columns: ["id"],
    });
    expect(probe.sql).toMatch(/^SELECT "id" FROM /);
    expect(probe.sql).not.toContain("FOR UPDATE");
    const locked = compilePriorSelect(info, filters, "postgres", false, undefined);
    expect(locked.sql).toMatch(/^SELECT \* FROM .* FOR UPDATE$/);
    expect(compilePriorSelect(info, filters, "libsql", false, undefined).sql).not.toContain("FOR UPDATE");
  });
});
