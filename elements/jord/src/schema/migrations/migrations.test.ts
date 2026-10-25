import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type Client } from "@libsql/client";
import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../../client.js";
import { JordMigrationChecksumError } from "../../errors.js";
import { makeTempDir, rmTempDir } from "../../test-temp.js";
import { fsPathToFileUrl } from "../../url.js";
import { JORD_TABLE_NAMES } from "../table-names.js";
import { migrationChecksum } from "./checksum.js";
import { loadSqlMigrations, migrationFilePath } from "./catalog.js";
import { splitSqlStatements } from "./split-sql.js";
import {
  JORD_MIGRATION_ADVISORY_LOCK_KEY,
  runLibsqlMigrations,
  runPostgresMigrations,
} from "./runner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  "../../../../../cloud/jord/fixtures/phase-01-baseline.sql",
);
const SEED_ID = "phase-01-seed";
const SOURCE_COMMIT = "eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

function requireClient(jord: { client?: Client }): Client {
  if (!jord.client) throw new Error("expected libsql client");
  return jord.client;
}

async function tempFileUrl(name = "jord.db"): Promise<string> {
  const dir = await makeTempDir("jord-mig-");
  temps.push(dir);
  return fsPathToFileUrl(path.join(dir, name));
}

describe("migration checksum", () => {
  it("hashes LF and CRLF to the same lowercase sha256", () => {
    const lf = migrationChecksum("SELECT 1;\n");
    const crlf = migrationChecksum("SELECT 1;\r\n");
    expect(lf).toBe(crlf);
    expect(lf).toMatch(/^[0-9a-f]{64}$/);
  });

  it("splits the frozen baseline into statements", () => {
    const [baseline] = loadSqlMigrations("libsql");
    expect(baseline?.id).toBe("0001");
    expect(baseline?.name).toBe("baseline");
    const statements = splitSqlStatements(baseline?.sql ?? "");
    expect(statements.length).toBeGreaterThan(8);
    expect(statements.every((statement) => !statement.startsWith("--"))).toBe(
      true,
    );
  });
});

describe("libsql migration runner", () => {
  it("applies the full chain on a fresh file and does nothing on the second boot", async () => {
    const url = await tempFileUrl();
    const first = await createJordClient({ url });
    try {
      const client = requireClient(first);
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      const names = new Set(tables.rows.map((row) => String(row.name)));
      for (const name of JORD_TABLE_NAMES) {
        expect(names.has(name)).toBe(true);
      }
      expect(names.has("jord_migrations")).toBe(true);

      const stored = await client.execute(
        "SELECT checksum, applied_at FROM jord_migrations WHERE id = '0001'",
      );
      const fileSql = readFileSync(
        migrationFilePath("libsql", "0001_baseline.sql"),
        "utf8",
      );
      const checksum = String(stored.rows[0]?.checksum);
      expect(checksum).toBe(migrationChecksum(fileSql));
      const appliedAt = Number(stored.rows[0]?.applied_at);

      const second = await runLibsqlMigrations(client, {
        lockKey: url,
      });
      expect(second.applied).toEqual([]);
      expect(second.skipped).toEqual(
        loadSqlMigrations("libsql").map((m) => m.id),
      );
      const again = await client.execute(
        "SELECT applied_at FROM jord_migrations WHERE id = '0001'",
      );
      expect(Number(again.rows[0]?.applied_at)).toBe(appliedAt);
    } finally {
      await first.close();
    }
  });

  it("refuses boot when the frozen baseline checksum does not match", async () => {
    const url = await tempFileUrl();
    const jord = await createJordClient({ url });
    await jord.close();

    const raw = createClient({ url });
    await raw.execute(
      "UPDATE jord_migrations SET checksum = '00' WHERE id = '0001'",
    );
    raw.close();

    await expect(createJordClient({ url })).rejects.toBeInstanceOf(
      JordMigrationChecksumError,
    );
    await expect(createJordClient({ url })).rejects.toThrow(
      /0001_baseline/,
    );
  });

  it("refuses boot when the baseline file text changes after apply", async () => {
    const url = await tempFileUrl();
    const client = createClient({ url });
    try {
      const migrations = loadSqlMigrations("libsql");
      await runLibsqlMigrations(client, { migrations, lockKey: url });
      const edited = migrations.map((migration) =>
        migration.id === "0001"
          ? { ...migration, sql: `${migration.sql}\n-- edited\n` }
          : migration,
      );
      await expect(
        runLibsqlMigrations(client, { migrations: edited, lockKey: url }),
      ).rejects.toThrow(JordMigrationChecksumError);
      const row = await client.execute(
        "SELECT body FROM records WHERE id = 'missing'",
      );
      expect(row.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });

  it("serializes two concurrent opens so the baseline is applied once", async () => {
    const url = await tempFileUrl();
    const left = createClient({ url });
    const right = createClient({ url });
    try {
      const [a, b] = await Promise.all([
        runLibsqlMigrations(left, { lockKey: url }),
        runLibsqlMigrations(right, { lockKey: url }),
      ]);
      const applied = [...a.applied, ...b.applied];
      expect(applied).toEqual(loadSqlMigrations("libsql").map((m) => m.id));
      const count = await left.execute(
        "SELECT COUNT(*) AS n FROM jord_migrations WHERE id = '0001'",
      );
      expect(Number(count.rows[0]?.n)).toBe(1);
    } finally {
      left.close();
      right.close();
    }
  });

  it("keeps the phase-01 seed row when the baseline adopts the fixture", async () => {
    const fixture = readFileSync(fixturePath, "utf8");
    expect(fixture.startsWith(`-- source: ${SOURCE_COMMIT}`)).toBe(true);
    expect(fixture).toContain(SEED_ID);

    const url = await tempFileUrl("adopt.db");
    const raw = createClient({ url });
    await raw.executeMultiple(fixture);
    raw.close();

    const jord = await createJordClient({ url });
    try {
      const client = requireClient(jord);
      const seed = await client.execute({
        sql: "SELECT bucket, body, version FROM records WHERE id = ?",
        args: [SEED_ID],
      });
      expect(seed.rows).toHaveLength(1);
      expect(String(seed.rows[0]?.bucket)).toBe("baseline");
      expect(String(seed.rows[0]?.body)).toBe('{"ok":true}');
      expect(Number(seed.rows[0]?.version)).toBe(1);

      const history = await client.execute(
        "SELECT name, checksum FROM jord_migrations WHERE id = '0001'",
      );
      expect(String(history.rows[0]?.name)).toBe("baseline");
      const fileSql = readFileSync(
        migrationFilePath("libsql", "0001_baseline.sql"),
        "utf8",
      );
      expect(String(history.rows[0]?.checksum)).toBe(migrationChecksum(fileSql));
    } finally {
      await jord.close();
    }
  });
});

const liveUrl = process.env.JORD_TEST_POSTGRES_URL?.trim();

describe.runIf(Boolean(liveUrl))("postgres migration lock", () => {
  it("does not double-apply when two boots race", async () => {
    const pool = new Pool({ connectionString: liveUrl });
    try {
      const [a, b] = await Promise.all([
        runPostgresMigrations(pool, { lockKey: "pg-race-left" }),
        runPostgresMigrations(pool, { lockKey: "pg-race-right" }),
      ]);
      const applied = [...a.applied, ...b.applied];
      expect(applied.filter((id) => id === "0001").length).toBeLessThanOrEqual(
        1,
      );
      const count = await pool.query(
        "SELECT COUNT(*)::int AS n FROM jord_migrations WHERE id = '0001'",
      );
      expect(count.rows[0]?.n).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it("waits on the session advisory lock held by another connection", async () => {
    const pool = new Pool({ connectionString: liveUrl });
    const holder = await pool.connect();
    try {
      await holder.query("SELECT pg_advisory_lock($1::bigint)", [
        JORD_MIGRATION_ADVISORY_LOCK_KEY,
      ]);
      let finished = false;
      const pending = runPostgresMigrations(pool, {
        lockKey: "pg-blocked",
      }).then((result) => {
        finished = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(finished).toBe(false);
      await holder.query("SELECT pg_advisory_unlock($1::bigint)", [
        JORD_MIGRATION_ADVISORY_LOCK_KEY,
      ]);
      const result = await pending;
      expect(finished).toBe(true);
      expect(result.skipped.includes("0001") || result.applied.includes("0001")).toBe(
        true,
      );
    } finally {
      await holder
        .query("SELECT pg_advisory_unlock($1::bigint)", [
          JORD_MIGRATION_ADVISORY_LOCK_KEY,
        ])
        .catch(() => undefined);
      holder.release();
      await pool.end();
    }
  });
});
