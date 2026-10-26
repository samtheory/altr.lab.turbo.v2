import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../testing/harness.js";

/**
 * B11: SQL console engine guards over HTTP. One statement per call (read-only
 * cannot escape its transaction), and a write that outlives its timeout keeps
 * its write-queue slot until it settles, reports `committed: true`, and still
 * emits the B4 resync.
 */

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
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
  });
  return { app, db };
}

const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
};

function insertSql(id: string): string {
  return `INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('${id}','lab','{}',1,1,1)`;
}

function execute(
  app: ReturnType<typeof createJordApp>,
  body: { sql: string; readOnly: boolean; timeoutMs?: number },
) {
  return app.request("/sql/execute", {
    method: "POST",
    headers: admin,
    body: JSON.stringify(body),
  });
}

async function rowCount(db: TestDb, id: string): Promise<number> {
  const rows = await db.ddl.query(`SELECT count(*) AS n FROM records WHERE id = ${db.ph(1)}`, [id]);
  return Number(rows[0]?.n ?? 0);
}

async function resyncCount(db: TestDb): Promise<number> {
  const rows = await db.ddl.query(`SELECT count(*) AS n FROM jord_changes WHERE op = 'resync'`);
  return Number(rows[0]?.n ?? 0);
}

type ErrorBody = { error: string; message: string; code?: string; committed: boolean };

describe.each(TEST_BACKENDS)("B11 sql console guards (%s)", (backend) => {
  it("read-only multi-statement is rejected with a clear message and lands nothing", async () => {
    const { app, db } = await boot(backend);
    const id = `b11-${randomUUID()}`;
    for (const sql of [`SELECT 1; COMMIT; ${insertSql(id)}`, `COMMIT; ${insertSql(id)}`]) {
      const res = await execute(app, { sql, readOnly: true });
      expect(res.status, sql).toBe(400);
      const body = (await res.json()) as ErrorBody;
      expect(body.committed).toBe(false);
      expect(body.message).not.toMatch(/Cannot read properties/);
    }
    const res = await execute(app, { sql: `SELECT 1; COMMIT; ${insertSql(id)}`, readOnly: true });
    expect(await res.json()).toMatchObject({
      error: "sql_failed",
      code: "JORD_SQL_MULTI_STATEMENT",
      committed: false,
      message: expect.stringMatching(/one statement per call/),
    });
    expect(await rowCount(db, id)).toBe(0);
    expect(await resyncCount(db)).toBe(0);
  });

  it("write multi-statement is rejected, commits nothing, emits no resync", async () => {
    const { app, db } = await boot(backend);
    const a = `b11-${randomUUID()}`;
    const b = `b11-${randomUUID()}`;
    const res = await execute(app, { sql: `${insertSql(a)}; ${insertSql(b)}`, readOnly: false });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "JORD_SQL_MULTI_STATEMENT", committed: false });
    expect(await rowCount(db, a)).toBe(0);
    expect(await rowCount(db, b)).toBe(0);
    expect(await resyncCount(db)).toBe(0);
  });

  it("a single write still succeeds", async () => {
    const { app, db } = await boot(backend);
    const id = `b11-${randomUUID()}`;
    const res = await execute(app, { sql: `${insertSql(id)};`, readOnly: false });
    expect(res.status).toBe(200);
    expect(await rowCount(db, id)).toBe(1);
  });

  it.runIf(backend === "postgres")(
    "a write past statement_timeout is cancelled: committed false, no resync",
    async () => {
      const { app, db } = await boot(backend);
      const id = `b11-${randomUUID()}`;
      const res = await execute(app, {
        sql: `INSERT INTO records (id, bucket, body, version, created_at, updated_at)
              SELECT '${id}', 'lab', '{}', 1, 1, 1 FROM pg_sleep(2)`,
        readOnly: false,
        timeoutMs: 100,
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({
        error: "sql_timeout",
        code: "JORD_SQL_TIMEOUT",
        committed: false,
      });
      expect(await rowCount(db, id)).toBe(0);
      expect(await resyncCount(db)).toBe(0);
    },
  );

  it.runIf(backend === "file")(
    "a timed-out write keeps the queue slot until it settles, reports committed, and resyncs",
    async () => {
      const { app, db } = await boot(backend);
      type RawExecute = (...args: unknown[]) => Promise<unknown>;
      const raw = (db.jord as unknown as { rawClient: { execute: RawExecute } }).rawClient;
      const original = raw.execute;
      const real = original.bind(raw);
      const slowId = `b11-slow-${randomUUID()}`;
      const nextId = `b11-next-${randomUUID()}`;
      let slowSettledAt = 0;
      let nextStartedAt = 0;
      // Model a hosted round trip for the slow statement only.
      raw.execute = async (...args: unknown[]) => {
        const stmt = args[0];
        const sql = typeof stmt === "string" ? stmt : (stmt as { sql?: string } | null)?.sql ?? "";
        if (sql.includes(slowId)) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const value = await real(...args);
          slowSettledAt = Date.now();
          return value;
        }
        if (sql.includes(nextId)) nextStartedAt = Date.now();
        return real(...args);
      };
      try {
        const [slow, next] = await Promise.all([
          execute(app, { sql: insertSql(slowId), readOnly: false, timeoutMs: 100 }),
          execute(app, { sql: insertSql(nextId), readOnly: false }),
        ]);
        expect(slow.status).toBe(400);
        expect(await slow.json()).toMatchObject({
          error: "sql_timeout",
          code: "JORD_SQL_TIMEOUT",
          committed: true,
          message: expect.stringMatching(/changes were committed/),
        });
        expect(next.status).toBe(200);
        expect(slowSettledAt).toBeGreaterThan(0);
        expect(nextStartedAt).toBeGreaterThanOrEqual(slowSettledAt);
      } finally {
        raw.execute = original;
      }
      expect(await rowCount(db, slowId)).toBe(1);
      expect(await rowCount(db, nextId)).toBe(1);
      // `records` is tracked by default: one resync per write, the timed-out one included.
      expect(await resyncCount(db)).toBe(2);
    },
  );
});
