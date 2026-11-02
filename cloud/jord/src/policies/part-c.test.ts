import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { ConsoleMailer } from "../auth/mailer.js";
import { assertPostgresMigrateUrl } from "../auth/pg-url.js";
import { surfaceFor, undeclared } from "../auth/route-inventory.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import {
  openTestDb,
  TEST_BACKENDS,
  type TestBackend,
  type TestDb,
  type TestDbOptions,
} from "../testing/harness.js";

const open: TestDb[] = [];

const JWT = "jwt-current-secret";
const JWT_PREV = "jwt-previous-secret";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: JWT_PREV,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

let backend: TestBackend = "file";

async function boot(options?: TestDbOptions) {
  const db = await openTestDb(backend, options);
  open.push(db);
  const mailer = new ConsoleMailer();
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer,
  });
  return { app, jord: db.jord, db, mailer, auth: AUTH };
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function userToken(extra?: { email?: string }): string {
  return signAccessToken({
    secret: JWT,
    iss: "jord",
    aud: "jord",
    sub: "user-1",
    role: "user",
    email: extra?.email,
  }).token;
}

function adminToken(): string {
  return signSessionToken("admin", AUTH.secret);
}

type App = Awaited<ReturnType<typeof boot>>["app"];
type Row = { id: unknown };
type Rule = { kind: string; config?: Record<string, unknown> };

const rowIds = (rows: Row[]) => rows.map((row) => row.id);

const DEFAULT_ROWS: Array<[string, string, string]> = [
  ["1", "user-1", "a@x.test"],
  ["2", "user-2", "b@x.test"],
  ["3", "user-3", "c@x.test"],
];

async function seedRows(app: App, rows: Array<[string, string, string]>): Promise<void> {
  for (const [id, owner, email] of rows) {
    const seeded = await app.request("/schema/tables/lab_notes/rows", {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(adminToken()) },
      body: JSON.stringify({ values: { id, title: id, owner_id: owner, owner_email: email } }),
    });
    expect(seeded.status).toBe(201);
  }
}

/** `lab_notes` with RLS on and one allow policy per rule set on every operation. */
async function scopedTable(
  app: App,
  allows: Rule[][],
  rows: Array<[string, string, string]> = DEFAULT_ROWS,
): Promise<void> {
  const headers = { "content-type": "application/json", ...bearer(adminToken()) };
  const created = await app.request("/schema/tables", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "lab_notes",
      columns: [
        { name: "title", type: "TEXT" },
        { name: "owner_id", type: "TEXT" },
        { name: "owner_email", type: "TEXT" },
      ],
    }),
  });
  expect(created.status).toBe(201);
  const rls = await app.request("/schema/tables/lab_notes/rls", {
    method: "PUT",
    headers,
    body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
  });
  expect(rls.status).toBe(200);
  for (const [i, rules] of allows.entries()) {
    for (const operation of ["select", "insert", "update", "delete"]) {
      const policy = await app.request("/policies", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `allow ${i} ${operation}`,
          table_name: "lab_notes",
          operation,
          effect: "allow",
          rules: JSON.stringify(rules),
        }),
      });
      expect(policy.status).toBe(201);
    }
  }
  await seedRows(app, rows);
}

async function readSseUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  pattern: string,
  ms: number,
): Promise<string> {
  const decoder = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + ms;
  while (Date.now() < deadline && !buf.includes(pattern)) {
    const remaining = Math.max(1, deadline - Date.now());
    const chunk = await Promise.race([
      reader.read(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining)),
    ]);
    if (chunk === null || chunk.done) break;
    buf += decoder.decode(chunk.value, { stream: true });
  }
  return buf;
}

const MOUNTED: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/health/live" },
  { method: "GET", path: "/health/ready" },
  { method: "POST", path: "/auth/signup" },
  { method: "GET", path: "/auth/me" },
  { method: "GET", path: "/records" },
  { method: "POST", path: "/records" },
  { method: "GET", path: "/records/abc" },
  { method: "GET", path: "/schema/schemas" },
  { method: "GET", path: "/schema/tables" },
  { method: "GET", path: "/schema/tables/notes" },
  { method: "GET", path: "/schema/tables/notes/rows" },
  { method: "POST", path: "/schema/tables/notes/rows" },
  { method: "PATCH", path: "/schema/tables/notes/rows/1" },
  { method: "DELETE", path: "/schema/tables/notes/rows/1" },
  { method: "POST", path: "/schema/tables" },
  { method: "PUT", path: "/schema/tables/records/rls" },
  { method: "POST", path: "/schema/tables/records/columns" },
  { method: "GET", path: "/apis/generated" },
  { method: "GET", path: "/jobs" },
  { method: "GET", path: "/logs" },
  { method: "GET", path: "/functions" },
  { method: "GET", path: "/custom-apis" },
  { method: "POST", path: "/x/echo" },
  { method: "GET", path: "/policies" },
  { method: "GET", path: "/triggers" },
  { method: "GET", path: "/realtime" },
  { method: "GET", path: "/realtime/ws" },
  { method: "GET", path: "/blobs/buckets" },
  { method: "GET", path: "/vectors/namespaces" },
  { method: "GET", path: "/api/v1" },
  { method: "GET", path: "/api/v1/records" },
  { method: "POST", path: "/sql/execute" },
  { method: "GET", path: "/sql/history" },
  { method: "POST", path: "/migrate/jobs" },
  { method: "GET", path: "/migrate/jobs/abc" },
  { method: "GET", path: "/admin/users" },
  { method: "POST", path: "/admin/users/abc/disable" },
  { method: "POST", path: "/admin/users/abc/revoke" },
  { method: "GET", path: "/admin/projects" },
  { method: "POST", path: "/admin/projects" },
  { method: "POST", path: "/admin/projects/test" },
  { method: "GET", path: "/admin/projects/abc" },
  { method: "PATCH", path: "/admin/projects/abc" },
  { method: "DELETE", path: "/admin/projects/abc" },
  { method: "POST", path: "/admin/projects/abc/rotate-keys" },
  { method: "GET", path: "/admin/projects/abc/layout" },
  { method: "PUT", path: "/admin/projects/abc/layout" },
];

describe.each(TEST_BACKENDS)("S0021-C server enforcement (%s)", (name) => {
  beforeEach(() => {
    backend = name;
  });

  it("denies a user access token on GET /records when RLS is off", async () => {
    const ctx = await boot();
    const denied = await ctx.app.request("/records", {
      headers: bearer(userToken()),
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "policy_denied" });
  });

  it("allows a user select after RLS is enabled and an allow policy matches", async () => {
    const ctx = await boot();
    const admin = adminToken();
    const enabled = await ctx.app.request("/schema/tables/records/rls", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({ rls_enabled: true }),
    });
    expect(enabled.status).toBe(200);

    const policy = await ctx.app.request("/policies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({
        name: "users may select",
        table_name: "records",
        operation: "select",
        effect: "allow",
        rules: JSON.stringify([
          { kind: "role_in", config: { roles: ["user"] } },
        ]),
      }),
    });
    expect(policy.status).toBe(201);

    const list = await ctx.app.request("/records?bucket=lab", {
      headers: bearer(userToken()),
    });
    expect(list.status).toBe(200);
  });

  it("lets a matching deny override a matching allow", async () => {
    const ctx = await boot();
    const admin = adminToken();
    const enabled = await ctx.app.request("/schema/tables/records/rls", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({ rls_enabled: true }),
    });
    expect(enabled.status).toBe(200);

    const allow = await ctx.app.request("/policies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({
        name: "users may select",
        table_name: "records",
        operation: "select",
        effect: "allow",
        priority: 100,
        rules: JSON.stringify([
          { kind: "role_in", config: { roles: ["user"] } },
        ]),
      }),
    });
    expect(allow.status).toBe(201);

    const deny = await ctx.app.request("/policies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({
        name: "users may not select",
        table_name: "records",
        operation: "select",
        effect: "deny",
        priority: 1,
        rules: JSON.stringify([
          { kind: "role_in", config: { roles: ["user"] } },
        ]),
      }),
    });
    expect(deny.status).toBe(201);
    const denyBody = (await deny.json()) as { id: string };

    const list = await ctx.app.request("/records?bucket=lab", {
      headers: bearer(userToken()),
    });
    expect(list.status).toBe(403);
    expect(await list.json()).toMatchObject({
      error: "policy_denied",
      policyId: denyBody.id,
    });
  });

  it("fails the inventory on an undeclared route and accepts mounted paths", () => {
    expect(undeclared([{ method: "GET", path: "/secret-extra" }]).length).toBeGreaterThan(
      0,
    );
    expect(surfaceFor("PUT", "/schema/tables/records/rls")).toBe("schema DDL");
    expect(surfaceFor("GET", "/api/v1")).toBe("api/v1");
    expect(surfaceFor("GET", "/schema/schemas")).toBe("schema tables");
    for (const route of MOUNTED) {
      expect(surfaceFor(route.method, route.path), `${route.method} ${route.path}`).not.toBeNull();
    }
    expect(undeclared(MOUNTED)).toEqual([]);
  });

  it("still lets the service raw bearer insert a record", async () => {
    const ctx = await boot();
    const created = await ctx.app.request("/records", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(AUTH.secret),
      },
      body: JSON.stringify({ bucket: "lab", body: "{}" }),
    });
    expect(created.status).toBe(201);
  });

  it("refuses a non-service update that changes the owner column", async () => {
    const ctx = await boot();
    const admin = adminToken();
    const created = await ctx.app.request("/schema/tables", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({
        name: "lab_notes",
        columns: [
          { name: "title", type: "TEXT" },
          { name: "owner_id", type: "TEXT" },
        ],
      }),
    });
    expect(created.status).toBe(201);

    const enabled = await ctx.app.request("/schema/tables/lab_notes/rls", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...bearer(admin),
      },
      body: JSON.stringify({
        rls_enabled: true,
        owner_column: "owner_id",
      }),
    });
    expect(enabled.status).toBe(200);

    for (const operation of ["insert", "update"] as const) {
      const policy = await ctx.app.request("/policies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          name: `owner ${operation}`,
          table_name: "lab_notes",
          operation,
          effect: "allow",
          rules: JSON.stringify([
            { kind: "owner_eq", config: { column: "owner_id" } },
          ]),
        }),
      });
      expect(policy.status).toBe(201);
    }

    const inserted = await ctx.app.request("/schema/tables/lab_notes/rows", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(userToken()),
      },
      body: JSON.stringify({
        values: { id: "1", title: "mine", owner_id: "other" },
      }),
    });
    expect(inserted.status).toBe(201);

    const stolen = await ctx.app.request("/schema/tables/lab_notes/rows/1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...bearer(userToken()),
      },
      body: JSON.stringify({ values: { owner_id: "other" } }),
    });
    expect(stolen.status).toBe(403);
    expect(await stolen.json()).toMatchObject({ reason: "owner_changed" });
  });

  it("scopes owner_eq reads and writes to the caller's rows on every row route", async () => {
    const ctx = await boot();
    const admin = bearer(adminToken());
    const json = { "content-type": "application/json" };
    await ctx.app.request("/schema/tables", {
      method: "POST",
      headers: { ...json, ...admin },
      body: JSON.stringify({
        name: "lab_notes",
        columns: [
          { name: "title", type: "TEXT" },
          { name: "owner_id", type: "TEXT" },
        ],
      }),
    });
    await ctx.app.request("/schema/tables/lab_notes/rls", {
      method: "PUT",
      headers: { ...json, ...admin },
      body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
    });
    for (const operation of ["select", "update", "delete"] as const) {
      const policy = await ctx.app.request("/policies", {
        method: "POST",
        headers: { ...json, ...admin },
        body: JSON.stringify({
          name: `owner ${operation}`,
          table_name: "lab_notes",
          operation,
          effect: "allow",
          rules: JSON.stringify([
            { kind: "owner_eq", config: { column: "owner_id" } },
          ]),
        }),
      });
      expect(policy.status).toBe(201);
    }
    for (const [id, owner] of [
      ["1", "user-1"],
      ["2", "user-2"],
    ]) {
      const seeded = await ctx.app.request("/schema/tables/lab_notes/rows", {
        method: "POST",
        headers: { ...json, ...admin },
        body: JSON.stringify({ values: { id, title: id, owner_id: owner } }),
      });
      expect(seeded.status).toBe(201);
    }

    const user1 = bearer(userToken());
    const ids = (rows: Array<{ id: unknown }>) => rows.map((row) => row.id);

    const tableApi = await ctx.app.request("/api/v1/lab_notes", {
      headers: { ...user1, prefer: "count=exact" },
    });
    expect(tableApi.status).toBe(200);
    const listed = (await tableApi.json()) as {
      data: Array<{ id: unknown }>;
      count: number;
    };
    expect(ids(listed.data)).toEqual(["1"]);
    expect(listed.count).toBe(1);

    const studio = await ctx.app.request("/schema/tables/lab_notes/rows", {
      headers: user1,
    });
    expect(studio.status).toBe(200);
    expect(ids(((await studio.json()) as { rows: Array<{ id: unknown }> }).rows)).toEqual(["1"]);

    const patched = await ctx.app.request("/api/v1/lab_notes?id=eq.2", {
      method: "PATCH",
      headers: { ...json, ...user1 },
      body: JSON.stringify({ title: "hijacked" }),
    });
    expect(await patched.json()).toMatchObject({ affected: 0 });

    const deleted = await ctx.app.request("/api/v1/lab_notes?id=eq.2", {
      method: "DELETE",
      headers: user1,
    });
    expect(await deleted.json()).toMatchObject({ affected: 0 });

    const rows = await ctx.db.ddl.query(
      "SELECT id, title FROM lab_notes WHERE id = '2'",
    );
    expect(rows[0]).toMatchObject({ id: "2", title: "2" });
  });

  it("no mounted row-returning route leaks a row outside the caller's scope", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]]);
    const user = { ...bearer(userToken()), "content-type": "application/json" };
    const streams = new Set(["/realtime", "/realtime/ws"]);
    const probes = MOUNTED.filter((route) => !streams.has(route.path)).map((route) => ({
      method: route.method,
      path: route.path.replace("/tables/notes", "/tables/lab_notes").replace(/\/rows\/1$/, "/rows/2"),
    }));
    probes.push(
      { method: "GET", path: "/api/v1/lab_notes" },
      { method: "GET", path: "/api/v1/lab_notes?id=eq.2" },
      { method: "GET", path: "/api/v1/lab_notes?or=(id.eq.2,id.eq.3)" },
      { method: "GET", path: "/schema/tables/lab_notes/rows?limit=100" },
      { method: "PATCH", path: "/api/v1/lab_notes?id=eq.2" },
      { method: "DELETE", path: "/api/v1/lab_notes?id=eq.3" },
    );
    const bodies: Record<string, unknown> = {
      "POST /sql/execute": { sql: "SELECT * FROM lab_notes" },
      "PATCH /api/v1/lab_notes?id=eq.2": { title: "x" },
      "PATCH /schema/tables/lab_notes/rows/2": { values: { title: "x" } },
    };
    for (const probe of probes) {
      const key = `${probe.method} ${probe.path}`;
      const res = await ctx.app.request(probe.path, {
        method: probe.method,
        headers: user,
        ...(probe.method === "GET" ? {} : { body: JSON.stringify(bodies[key] ?? {}) }),
      });
      const text = await res.text();
      expect(res.status, key).toBeLessThan(500);
      expect(text, key).not.toContain("b@x.test");
      expect(text, key).not.toContain("c@x.test");
    }
    const left = await ctx.db.ddl.query("SELECT id, title FROM lab_notes ORDER BY id");
    expect(left).toEqual([
      { id: "1", title: "1" },
      { id: "2", title: "2" },
      { id: "3", title: "3" },
    ]);
  });

  it("scopes claim_eq reads to the caller's claim value", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [[{ kind: "claim_eq", config: { claim: "email", column: "owner_email" } }]]);
    const user = bearer(userToken({ email: "a@x.test" }));

    const api = await ctx.app.request("/api/v1/lab_notes?order=id.asc", { headers: user });
    expect(api.status).toBe(200);
    expect(rowIds(((await api.json()) as { data: Row[] }).data)).toEqual(["1"]);

    const studio = await ctx.app.request("/schema/tables/lab_notes/rows", { headers: user });
    expect(rowIds(((await studio.json()) as { rows: Row[] }).rows)).toEqual(["1"]);

    const stolen = await ctx.app.request("/api/v1/lab_notes?id=eq.1", {
      method: "PATCH",
      headers: { ...user, "content-type": "application/json" },
      body: JSON.stringify({ owner_email: "b@x.test" }),
    });
    expect(stolen.status).toBe(403);
  });

  it("ORs two allow policies: owner OR claim widens to the union", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [
      [{ kind: "owner_eq", config: { column: "owner_id" } }],
      [{ kind: "claim_eq", config: { claim: "email", column: "owner_email" } }],
    ]);
    const user = bearer(userToken({ email: "b@x.test" }));
    const api = await ctx.app.request("/api/v1/lab_notes?order=id.asc", {
      headers: { ...user, prefer: "count=exact" },
    });
    const body = (await api.json()) as { data: Row[]; count: number };
    expect(rowIds(body.data)).toEqual(["1", "2"]);
    expect(body.count).toBe(2);
  });

  it("ORs two allow policies: owner OR role allows every row", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [
      [{ kind: "owner_eq", config: { column: "owner_id" } }],
      [{ kind: "role_in", config: { roles: ["user"] } }],
    ]);
    const api = await ctx.app.request("/api/v1/lab_notes?order=id.asc", {
      headers: bearer(userToken()),
    });
    expect(rowIds(((await api.json()) as { data: Row[] }).data)).toEqual(["1", "2", "3"]);
  });

  it("delivers realtime changes only for rows in the caller's scope", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]], []);
    const stream = await ctx.app.request("/realtime?table=lab_notes", {
      headers: { Accept: "text/event-stream", ...bearer(userToken()) },
    });
    expect(stream.status).toBe(200);
    const reader = stream.body!.getReader();
    await seedRows(ctx.app, [["9", "user-2", "z@x.test"], ["8", "user-1", "a@x.test"]]);
    const buf = await readSseUntil(reader, '"id":"8"', 3000);
    await reader.cancel();
    expect(buf).toContain('"id":"8"');
    expect(buf).not.toContain('"id":"9"');
  });

  it("a column retype (table rebuild) keeps every row and the row scope", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]]);
    const retyped = await ctx.app.request("/schema/tables/lab_notes/columns/title", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...bearer(adminToken()) },
      body: JSON.stringify({ type: "REAL", confirm: true }),
    });
    expect(retyped.status).toBe(200);
    expect(await ctx.db.ddl.query("SELECT id FROM lab_notes ORDER BY id")).toEqual([
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ]);
    const api = await ctx.app.request("/api/v1/lab_notes", { headers: bearer(userToken()) });
    expect(rowIds(((await api.json()) as { data: Row[] }).data)).toEqual(["1"]);
    if (name === "postgres") {
      const asUser = await new Promise<Row[]>((resolve, reject) => {
        setImmediate(() => {
          ctx.jord.bindRlsSession?.({ role: "user", uid: "user-1" });
          ctx.jord.query("SELECT id FROM lab_notes").then((rows) => resolve(rows as Row[]), reject);
        });
      });
      expect(rowIds(asUser)).toEqual(["1"]);
    }
  });

  it("a table rename keeps RLS, policies, outbox tracking and the row scope", async () => {
    const ctx = await boot();
    await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]]);
    const admin = { "content-type": "application/json", ...bearer(adminToken()) };
    const renamed = await ctx.app.request("/schema/tables/lab_notes", {
      method: "PATCH",
      headers: admin,
      body: JSON.stringify({ name: "lab_notes2" }),
    });
    expect(renamed.status).toBe(200);

    for (const meta of ["jord_table_rls", "jord_policies", "jord_tracked_tables"]) {
      const at = (table: string) =>
        ctx.db.ddl.query(`SELECT 1 AS hit FROM ${meta} WHERE table_name = ${ctx.db.ph(1)}`, [
          table,
        ]);
      expect(await at("lab_notes"), meta).toEqual([]);
      expect((await at("lab_notes2")).length, meta).toBeGreaterThan(0);
    }

    const api = await ctx.app.request("/api/v1/lab_notes2", { headers: bearer(userToken()) });
    expect(api.status).toBe(200);
    expect(rowIds(((await api.json()) as { data: Row[] }).data)).toEqual(["1"]);

    const before = await ctx.db.ddl.query(
      "SELECT COUNT(*) AS n FROM jord_changes WHERE table_name = 'lab_notes2'",
    );
    const inserted = await ctx.app.request("/schema/tables/lab_notes2/rows", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ values: { id: "4", title: "4", owner_id: "user-1" } }),
    });
    expect(inserted.status).toBe(201);
    const after = await ctx.db.ddl.query(
      "SELECT COUNT(*) AS n FROM jord_changes WHERE table_name = 'lab_notes2'",
    );
    expect(Number((after[0] as { n: unknown }).n)).toBe(
      Number((before[0] as { n: unknown }).n) + 1,
    );

    if (name === "postgres") {
      const policies = (await ctx.db.ddl.query(
        "SELECT policyname FROM pg_policies WHERE tablename = 'lab_notes2' ORDER BY policyname",
      )) as Array<{ policyname: string }>;
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.every((p) => p.policyname.startsWith("jord_rls_lab_notes2_"))).toBe(true);
      const asUser = await new Promise<Row[]>((resolve, reject) => {
        setImmediate(() => {
          ctx.jord.bindRlsSession?.({ role: "user", uid: "user-1" });
          ctx.jord
            .query("SELECT id FROM lab_notes2 ORDER BY id")
            .then((rows) => resolve(rows as Row[]), reject);
        });
      });
      expect(rowIds(asUser)).toEqual(["1", "4"]);
    }
  });

  it.runIf(name === "postgres")(
    "a non-superuser table owner keeps every row through retype and rename",
    async () => {
      const ctx = await boot({ owner: "plain" });
      const [who] = (await ctx.db.ddl.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      expect(who).toEqual({ rolsuper: false, rolbypassrls: false });

      await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]]);
      const admin = { "content-type": "application/json", ...bearer(adminToken()) };
      const retyped = await ctx.app.request("/schema/tables/lab_notes/columns/title", {
        method: "PATCH",
        headers: admin,
        body: JSON.stringify({ type: "REAL", confirm: true }),
      });
      expect(retyped.status).toBe(200);
      const renamed = await ctx.app.request("/schema/tables/lab_notes", {
        method: "PATCH",
        headers: admin,
        body: JSON.stringify({ name: "lab_notes2" }),
      });
      expect(renamed.status).toBe(200);

      const as = (session: { role: string; uid?: string }) =>
        new Promise<Row[]>((resolve, reject) => {
          setImmediate(() => {
            ctx.jord.bindRlsSession?.(session);
            ctx.jord
              .query("SELECT id FROM lab_notes2 ORDER BY id")
              .then((rows) => resolve(rows as Row[]), reject);
          });
        });
      expect(rowIds(await as({ role: "admin" }))).toEqual(["1", "2", "3"]);
      expect(rowIds(await as({ role: "user", uid: "user-1" }))).toEqual(["1"]);
      const [forced] = (await ctx.db.ddl.query(
        "SELECT relforcerowsecurity FROM pg_class WHERE relname = 'lab_notes2'",
      )) as Array<{ relforcerowsecurity: boolean }>;
      expect(forced?.relforcerowsecurity).toBe(true);
      const api = await ctx.app.request("/api/v1/lab_notes2", { headers: bearer(userToken()) });
      expect(rowIds(((await api.json()) as { data: Row[] }).data)).toEqual(["1"]);
    },
  );

  it.runIf(name === "postgres")(
    "enforces FORCE RLS in the database for jord_app, not only in the server",
    async () => {
      const ctx = await boot();
      await scopedTable(ctx.app, [[{ kind: "owner_eq", config: { column: "owner_id" } }]]);
      const raw = "SELECT id FROM lab_notes ORDER BY id";
      const as = (session: { role: string; uid?: string }) =>
        new Promise<Row[]>((resolve, reject) => {
          setImmediate(() => {
            ctx.jord.bindRlsSession?.(session);
            ctx.jord.query(raw).then((rows) => resolve(rows as Row[]), reject);
          });
        });
      expect(await as({ role: "user", uid: "nobody" })).toEqual([]);
      expect(rowIds(await as({ role: "user", uid: "user-1" }))).toEqual(["1"]);
      expect(rowIds(await as({ role: "anon" }))).toEqual([]);
      expect(rowIds(await as({ role: "admin" }))).toEqual(["1", "2", "3"]);
    },
  );

  it("reads one record by id and still 403s a user the policy denies", async () => {
    const ctx = await boot();
    const admin = { "content-type": "application/json", ...bearer(adminToken()) };
    const created = await ctx.app.request("/records", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ bucket: "lab", body: "{\"n\":1}" }),
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const one = await ctx.app.request(`/records/${id}`, { headers: admin });
    expect(one.status).toBe(200);
    expect(await one.json()).toMatchObject({ id, bucket: "lab" });

    await ctx.app.request("/schema/tables/records/rls", {
      method: "PUT",
      headers: admin,
      body: JSON.stringify({ rls_enabled: true }),
    });
    const denied = await ctx.app.request(`/records/${id}`, { headers: bearer(userToken()) });
    expect(denied.status).toBe(403);
    const again = await ctx.app.request(`/records/${id}`, { headers: admin });
    expect(again.status).toBe(200);
  });

  it("still accepts an HMAC admin operator token", async () => {
    const ctx = await boot();
    const created = await ctx.app.request("/records", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...bearer(adminToken()),
      },
      body: JSON.stringify({ bucket: "lab", body: "{\"n\":1}" }),
    });
    expect(created.status).toBe(201);
    const list = await ctx.app.request("/records?bucket=lab", {
      headers: bearer(adminToken()),
    });
    expect(list.status).toBe(200);
  });

  it("refuses a postgres runtime URL without a distinct migrate URL", () => {
    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgres://jord_app@localhost:5432/jord",
      }),
    ).toThrow(/JORD_MIGRATE_URL/);

    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgresql://jord_app@localhost/jord",
        JORD_MIGRATE_URL:
          "postgres://jord_app:secret@localhost:5432/jord?sslmode=require",
      }),
    ).toThrow(/same connection/);

    expect(() =>
      assertPostgresMigrateUrl({ DATABASE_URL: "file:./jord.db" }),
    ).not.toThrow();
    expect(() =>
      assertPostgresMigrateUrl({ DATABASE_URL: "libsql://example.turso.io" }),
    ).not.toThrow();
    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgres://jord_app@localhost/jord",
        JORD_MIGRATE_URL: "postgres://owner@localhost/jord",
      }),
    ).not.toThrow();
  });
});
