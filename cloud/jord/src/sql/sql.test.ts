import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../testing/harness.js";

const open: TestDb[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  let writes = 0;
  const base = createWriteQueue();
  const enqueueWrite = Object.assign(
    <T,>(task: () => Promise<T>) => {
      writes += 1;
      return base(task);
    },
    {
      drain: () => base.drain(),
      pending: () => base.pending(),
      inFlight: () => base.inFlight(),
    },
  );
  const app = createJordApp({ jord: db.jord, ddl: db.ddl, enqueueWrite, auth: AUTH });
  return { app, db, writes: () => writes };
}

const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
};

const INSERT_RECORD =
  "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('z','lab','{}',1,1,1)";

describe.each(TEST_BACKENDS)("S0024 sql console (%s)", (backend) => {
  it("enforces read-only at the engine and keeps reads off the write queue", async () => {
    const { app, writes } = await boot(backend);
    const denied = await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: INSERT_RECORD, readOnly: true }),
    });
    expect(denied.status).toBe(400);
    expect(writes()).toBe(0);

    const ok = await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: "SELECT 1 AS n", readOnly: true }),
    });
    expect(ok.status).toBe(200);
    expect(writes()).toBe(0);
    const body = (await ok.json()) as { rows: Array<{ n: number }> };
    expect(body.rows[0]?.n).toBe(1);

    const write = await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: INSERT_RECORD, readOnly: false }),
    });
    expect(write.status).toBe(200);
    expect(writes()).toBe(1);

    const read = await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: "SELECT id FROM records WHERE id = 'z'", readOnly: true }),
    });
    expect(((await read.json()) as { rows: unknown[] }).rows).toEqual([{ id: "z" }]);
  });

  it.runIf(backend === "postgres")("cancels a statement past timeoutMs", async () => {
    const { app } = await boot(backend);
    const started = Date.now();
    const slow = await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: "SELECT pg_sleep(5)", readOnly: true, timeoutMs: 200 }),
    });
    expect(slow.status).toBeGreaterThanOrEqual(400);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(JSON.stringify(await slow.json())).toMatch(/timeout|cancel/i);
  });
});

describe.each(TEST_BACKENDS)("S0064 sql tabs history + saved queries (%s)", (backend) => {
  it("reads history from jord_sql_audit and supports search / failed filter", async () => {
    const { app } = await boot(backend);

    await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: "SELECT 1 AS n", readOnly: true }),
    });
    await app.request("/sql/execute", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ sql: "SELECT * FROM missing_table_xyz", readOnly: true }),
    });

    const all = await app.request("/sql/history", { headers: admin });
    expect(all.status).toBe(200);
    const allBody = (await all.json()) as {
      history: Array<{ sql: string; ok: boolean }>;
    };
    expect(allBody.history.length).toBeGreaterThanOrEqual(2);

    const search = await app.request("/sql/history?q=missing_table", {
      headers: admin,
    });
    const searchBody = (await search.json()) as {
      history: Array<{ sql: string; ok: boolean }>;
    };
    expect(searchBody.history.some((h) => h.sql.includes("missing_table"))).toBe(
      true,
    );

    const failed = await app.request("/sql/history?failed=1", { headers: admin });
    const failedBody = (await failed.json()) as {
      history: Array<{ ok: boolean }>;
    };
    expect(failedBody.history.length).toBeGreaterThanOrEqual(1);
    expect(failedBody.history.every((h) => h.ok === false)).toBe(true);
  });

  it("creates, lists, updates, and deletes saved queries", async () => {
    const { app } = await boot(backend);

    const created = await app.request("/sql/saved-queries", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({
        name: "Count records",
        sql: "SELECT count(*) AS n FROM records",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      query: { id: string; name: string; sql: string };
    };
    expect(createdBody.query.name).toBe("Count records");
    const id = createdBody.query.id;

    const listed = await app.request("/sql/saved-queries?q=count", {
      headers: admin,
    });
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as {
      queries: Array<{ id: string }>;
    };
    expect(listBody.queries.some((q) => q.id === id)).toBe(true);

    const patched = await app.request(`/sql/saved-queries/${id}`, {
      method: "PATCH",
      headers: admin,
      body: JSON.stringify({ name: "Count all", sql: "SELECT 1" }),
    });
    expect(patched.status).toBe(200);
    const patchedBody = (await patched.json()) as {
      query: { name: string; sql: string };
    };
    expect(patchedBody.query.name).toBe("Count all");
    expect(patchedBody.query.sql).toBe("SELECT 1");

    const deleted = await app.request(`/sql/saved-queries/${id}`, {
      method: "DELETE",
      headers: admin,
    });
    expect(deleted.status).toBe(200);

    const gone = await app.request(`/sql/saved-queries/${id}`, {
      headers: admin,
    });
    expect(gone.status).toBe(404);
  });
});
