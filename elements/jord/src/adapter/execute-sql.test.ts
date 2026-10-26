import path from "node:path";
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createJordClient } from "../client.js";
import type { JordDriverPort } from "../port.js";
import {
  countSqliteStatements,
  isSqlTransactionControl,
} from "../schema/sql-console.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";

/**
 * B11: the SQL console runs exactly one statement per call on both engines,
 * read-only cannot commit anything, and a write that outlives its timeout
 * holds its caller until it settles and reports what really happened.
 */

const liveUrl = process.env.JORD_TEST_POSTGRES_URL?.trim();
const temps: string[] = [];
const open: JordDriverPort[] = [];

afterEach(async () => {
  vi.useRealTimers();
  while (open.length > 0) await open.pop()!.close();
  while (temps.length > 0) await rmTempDir(temps.pop()!);
});

type Backend = "file" | "postgres";

async function openBackend(backend: Backend): Promise<JordDriverPort> {
  let jord: JordDriverPort;
  if (backend === "postgres") {
    jord = await createJordClient({ url: liveUrl });
  } else {
    const dir = await makeTempDir("jord-b11-");
    temps.push(dir);
    jord = await createJordClient({ url: fsPathToFileUrl(path.join(dir, "jord.db")) });
  }
  open.push(jord);
  return jord;
}

function newId(): string {
  return `b11-${randomUUID()}`;
}

function insertSql(id: string): string {
  return `INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('${id}','lab','{}',1,1,1)`;
}

async function rowCount(jord: JordDriverPort, id: string): Promise<number> {
  const ph = jord.dialect === "postgres" ? "$1" : "?";
  const rows = await jord.query(`SELECT count(*) AS n FROM records WHERE id = ${ph}`, [id]);
  return Number(rows[0]?.n ?? 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("B11 statement guards (pure)", () => {
  it("counts SQLite statements like sqlite3_complete", () => {
    expect(countSqliteStatements("SELECT 1")).toBe(1);
    expect(countSqliteStatements("SELECT 1;")).toBe(1);
    expect(countSqliteStatements("SELECT 1; -- trailing\n")).toBe(1);
    expect(countSqliteStatements(";; SELECT 1 ;; /* c */")).toBe(1);
    expect(countSqliteStatements("SELECT 1; SELECT 2")).toBe(2);
    expect(countSqliteStatements("COMMIT; INSERT INTO t VALUES (1)")).toBe(2);
    expect(countSqliteStatements("SELECT ';' AS a, \"x;y\", [p;q], `r;s`")).toBe(1);
    expect(countSqliteStatements("SELECT 'it''s; fine'")).toBe(1);
    expect(countSqliteStatements("SELECT 1 /* ; */ -- ;\n")).toBe(1);
    expect(
      countSqliteStatements(
        "CREATE TEMP TRIGGER t AFTER INSERT ON x BEGIN UPDATE y SET a = CASE WHEN 1 THEN 2 END; DELETE FROM z; END;",
      ),
    ).toBe(1);
    expect(
      countSqliteStatements("CREATE TRIGGER t AFTER INSERT ON x BEGIN SELECT 1; END; SELECT 2"),
    ).toBe(2);
    expect(countSqliteStatements("-- only a comment")).toBe(0);
  });

  it("spots transaction control after comments, not inside other statements", () => {
    for (const sql of [
      "BEGIN",
      "begin immediate",
      "  /* x */ -- y\n COMMIT",
      "END TRANSACTION",
      "ROLLBACK TO SAVEPOINT a",
      "SAVEPOINT a",
      "RELEASE a",
      "ABORT",
      "START TRANSACTION READ WRITE",
      "PREPARE TRANSACTION 'x'",
    ]) {
      expect(isSqlTransactionControl(sql), sql).toBe(true);
    }
    for (const sql of [
      "SELECT 'COMMIT'",
      "CREATE TRIGGER t AFTER INSERT ON x BEGIN SELECT 1; END",
      "PREPARE q AS SELECT 1",
      "START",
      "UPDATE t SET commit = 1",
    ]) {
      expect(isSqlTransactionControl(sql), sql).toBe(false);
    }
  });
});

const BACKENDS: Backend[] = liveUrl ? ["file", "postgres"] : ["file"];

describe.each(BACKENDS)("B11 executeSql guards (%s)", (backend) => {
  it("(a) read-only multi-statement cannot escape and commit", async () => {
    const jord = await openBackend(backend);
    const id = newId();
    // Leading SELECT gets past the transaction-control check, so only the
    // one-statement rule stands between this and a committed INSERT.
    for (const sql of [`SELECT 1; COMMIT; ${insertSql(id)}`, `COMMIT; ${insertSql(id)}`]) {
      const err = await jord.executeSql({ sql, readOnly: true }).catch((e: unknown) => e);
      expect(err, sql).toBeInstanceOf(Error);
      expect((err as Error).message).not.toMatch(/Cannot read properties/);
      expect(await rowCount(jord, id)).toBe(0);
    }
    await expect(
      jord.executeSql({ sql: `SELECT 1; COMMIT; ${insertSql(id)}`, readOnly: true }),
    ).rejects.toMatchObject({
      code: "JORD_SQL_MULTI_STATEMENT",
      committed: false,
      message: expect.stringMatching(/one statement per call/),
    });
  });

  it("(b) write multi-statement is rejected and commits nothing", async () => {
    const a = newId();
    const b = newId();
    const jord = await openBackend(backend);
    await expect(
      jord.executeSql({ sql: `${insertSql(a)}; ${insertSql(b)}`, readOnly: false }),
    ).rejects.toMatchObject({ code: "JORD_SQL_MULTI_STATEMENT", committed: false });
    expect(await rowCount(jord, a)).toBe(0);
    expect(await rowCount(jord, b)).toBe(0);
  });

  it("(c) single statements still work: read, write, DDL, trailing ; and comments", async () => {
    const jord = await openBackend(backend);
    const id = newId();
    const read = await jord.executeSql({ sql: "SELECT 1 AS n; -- trailing", readOnly: true });
    expect(read.columns).toEqual(["n"]);
    expect(Number(read.rows[0]?.n)).toBe(1);

    const write = await jord.executeSql({ sql: `${insertSql(id)};`, readOnly: false });
    expect(write.rowCount).toBe(0);
    expect(await rowCount(jord, id)).toBe(1);

    const table = `b11_probe_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    await jord.executeSql({ sql: `CREATE TABLE ${table} (x INTEGER)`, readOnly: false });
    await jord.executeSql({ sql: `ALTER TABLE ${table} ADD COLUMN y TEXT`, readOnly: false });
    await jord.executeSql({ sql: `INSERT INTO ${table} (x, y) VALUES (1, 'a;b')`, readOnly: false });
    const rows = await jord.executeSql({ sql: `SELECT x, y FROM ${table}`, readOnly: true });
    expect(rows.rows.map((r) => [Number(r.x), r.y])).toEqual([[1, "a;b"]]);

    if (backend === "file") {
      // One statement with inner semicolons (BEGIN … END body).
      await jord.executeSql({
        sql: `CREATE TRIGGER ${table}_t AFTER INSERT ON ${table} BEGIN UPDATE ${table} SET y = 'trg' WHERE x = NEW.x; END;`,
        readOnly: false,
      });
      await jord.executeSql({ sql: `INSERT INTO ${table} (x) VALUES (2)`, readOnly: false });
      const fired = await jord.executeSql({
        sql: `SELECT y FROM ${table} WHERE x = 2`,
        readOnly: true,
      });
      expect(fired.rows).toEqual([{ y: "trg" }]);
    } else {
      // One statement with inner semicolons (dollar-quoted body).
      await jord.executeSql({
        sql: `DO $$ BEGIN PERFORM 1; PERFORM 2; END $$`,
        readOnly: false,
      });
    }
    await jord.executeSql({ sql: `DROP TABLE ${table}`, readOnly: false });
    await jord.executeSql({ sql: `DELETE FROM records WHERE id = '${id}'`, readOnly: false });
  });

  it("(c) rejects transaction control on both paths", async () => {
    const jord = await openBackend(backend);
    for (const sql of ["BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT b11"]) {
      for (const readOnly of [true, false]) {
        await expect(jord.executeSql({ sql, readOnly }), `${sql} ro=${readOnly}`).rejects.toMatchObject({
          code: "JORD_SQL_TX_CONTROL",
        });
      }
    }
    // The connection is not left inside a transaction: a plain write commits.
    const id = newId();
    await jord.executeSql({ sql: insertSql(id), readOnly: false });
    expect(await rowCount(jord, id)).toBe(1);
  });

  it("(d) clears the timeout timer on success", async () => {
    const jord = await openBackend(backend);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const before = vi.getTimerCount();
    await jord.executeSql({ sql: "SELECT 1 AS n", readOnly: false, timeoutMs: 30_000 });
    if (backend === "file") {
      await jord.executeSql({ sql: "SELECT 1 AS n", readOnly: true, timeoutMs: 30_000 });
    }
    expect(vi.getTimerCount()).toBe(before);
  });
});

describe("B11 libSQL write timeout", () => {
  type RawExecute = (...args: unknown[]) => Promise<unknown>;
  function rawClient(jord: JordDriverPort): { execute: RawExecute } {
    return (jord as unknown as { rawClient: { execute: RawExecute } }).rawClient;
  }

  it("a timed-out write holds the caller until it settles, then reports it committed", async () => {
    const jord = await openBackend("file");
    const raw = rawClient(jord);
    const original = raw.execute;
    const real = original.bind(raw);
    let settledAt = 0;
    // Model a hosted libsql:// round trip: async, slower than the timeout.
    raw.execute = async (...args: unknown[]) => {
      await sleep(400);
      const value = await real(...args);
      settledAt = Date.now();
      return value;
    };
    const id = newId();
    try {
      const started = Date.now();
      const err = await jord
        .executeSql({ sql: insertSql(id), readOnly: false, timeoutMs: 100 })
        .catch((e: unknown) => e);
      const rejectedAt = Date.now();
      expect(err).toMatchObject({
        code: "JORD_SQL_TIMEOUT",
        committed: true,
        message: expect.stringMatching(/changes were committed/),
      });
      expect(settledAt).toBeGreaterThan(0);
      expect(rejectedAt).toBeGreaterThanOrEqual(settledAt);
      expect(rejectedAt - started).toBeGreaterThanOrEqual(390);
    } finally {
      raw.execute = original;
    }
    expect(await rowCount(jord, id)).toBe(1);
  });

  it("a timed-out write that then fails rethrows the real error, not committed", async () => {
    const jord = await openBackend("file");
    const raw = rawClient(jord);
    const original = raw.execute;
    raw.execute = async () => {
      await sleep(300);
      throw new Error("SQLITE_CONSTRAINT: late failure");
    };
    try {
      const err = await jord
        .executeSql({ sql: insertSql(newId()), readOnly: false, timeoutMs: 100 })
        .catch((e: unknown) => e);
      expect((err as Error).message).toMatch(/late failure/);
      expect((err as { committed?: unknown }).committed).toBeUndefined();
    } finally {
      raw.execute = original;
    }
  });

  it("file: a slow write runs to completion (the engine is synchronous) and leaves no timer", async () => {
    const jord = await openBackend("file");
    const id = newId();
    const before = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    const result = await jord.executeSql({
      sql: `INSERT INTO records (id, bucket, body, version, created_at, updated_at)
            SELECT '${id}', 'lab', '{}', 1, 1, n FROM (
              WITH RECURSIVE r(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM r WHERE i < 1500000)
              SELECT max(i) AS n FROM r
            )`,
      readOnly: false,
      timeoutMs: 100,
    });
    expect(result.rowCount).toBe(0);
    expect(await rowCount(jord, id)).toBe(1);
    const after = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe.runIf(Boolean(liveUrl))("B11 Postgres timeout and session hygiene", () => {
  it("(d) statement_timeout cancels a slow write server-side; nothing committed", async () => {
    const jord = await openBackend("postgres");
    const id = newId();
    const started = Date.now();
    await expect(
      jord.executeSql({
        sql: `INSERT INTO records (id, bucket, body, version, created_at, updated_at)
              SELECT '${id}', 'lab', '{}', 1, 1, 1 FROM pg_sleep(2)`,
        readOnly: false,
        timeoutMs: 100,
      }),
    ).rejects.toMatchObject({
      code: "JORD_SQL_TIMEOUT",
      committed: false,
      message: expect.stringMatching(/Nothing was committed/),
    });
    expect(Date.now() - started).toBeLessThan(1500);
    expect(await rowCount(jord, id)).toBe(0);
  });

  it("session settings from the console never reach pooled connections", async () => {
    const jord = await openBackend("postgres");
    await jord.executeSql({ sql: "SET SESSION application_name = 'b11-leak'", readOnly: true });
    for (let i = 0; i < 5; i++) {
      const rows = await jord.query("SELECT current_setting('application_name') AS name");
      expect(rows[0]?.name).not.toBe("b11-leak");
    }
  });
});
