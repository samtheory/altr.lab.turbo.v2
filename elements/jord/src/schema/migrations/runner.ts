import { createHash } from "node:crypto";

import type { Client, ResultSet } from "@libsql/client";
import type { Pool, PoolClient, QueryResult } from "pg";

import { JordMigrationChecksumError } from "../../errors.js";
import { migrationChecksum } from "./checksum.js";
import {
  loadSqlMigrations,
  type MigrationDialect,
  type SqlMigration,
} from "./catalog.js";
import { withRunnerMutex } from "./mutex.js";
import { splitSqlStatements } from "./split-sql.js";

/**
 * Cluster-local advisory lock key (per database). Session-level so it covers
 * the whole runner, not one transaction.
 */
export const JORD_MIGRATION_ADVISORY_LOCK_KEY = "872021001";

export type MigrationRunResult = {
  /** Ids applied during this call, in order. */
  applied: string[];
  /** Ids already present with a matching checksum. */
  skipped: string[];
};

/** Mutex key that does not retain a raw connection string. */
export function migrationLockKey(databaseUrl: string): string {
  return createHash("sha256").update(databaseUrl).digest("hex");
}

export type MigrationRunOptions = {
  /**
   * In-process mutex key. Adapters pass a hash of the database URL.
   * Tests that must race on the Postgres advisory lock pass distinct keys.
   */
  lockKey?: string;
  /** Overrides on-disk files. Tests use this to simulate an edited baseline. */
  migrations?: SqlMigration[];
};

const LIBSQL_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS jord_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at INTEGER NOT NULL
)
`;

const POSTGRES_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS jord_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at BIGINT NOT NULL
)
`;

function migrationsFor(
  dialect: MigrationDialect,
  override: SqlMigration[] | undefined,
): SqlMigration[] {
  return override ?? loadSqlMigrations(dialect);
}

type AppliedRow = { id: string; checksum: string };

function libsqlApplied(result: ResultSet): AppliedRow[] {
  return result.rows.map((row) => ({
    id: String(row.id),
    checksum: String(row.checksum),
  }));
}

function pgApplied(result: QueryResult): AppliedRow[] {
  return result.rows.map((row) => ({
    id: String(row.id),
    checksum: String(row.checksum),
  }));
}

function planStep(
  migration: SqlMigration,
  applied: Map<string, string>,
): { checksum: string; skip: boolean } {
  const checksum = migrationChecksum(migration.sql);
  const existing = applied.get(migration.id);
  if (existing === undefined) return { checksum, skip: false };
  if (existing !== checksum) {
    throw new JordMigrationChecksumError(migration.id, migration.name);
  }
  return { checksum, skip: true };
}

async function applyLibsql(
  client: Client,
  migrations: SqlMigration[],
): Promise<MigrationRunResult> {
  await client.execute(LIBSQL_MIGRATIONS_DDL);
  const existing = libsqlApplied(
    await client.execute("SELECT id, checksum FROM jord_migrations"),
  );
  const applied = new Map(existing.map((row) => [row.id, row.checksum]));
  const result: MigrationRunResult = { applied: [], skipped: [] };

  for (const migration of migrations) {
    const step = planStep(migration, applied);
    if (step.skip) {
      result.skipped.push(migration.id);
      continue;
    }
    const statements = splitSqlStatements(migration.sql);
    await client.execute("BEGIN IMMEDIATE");
    try {
      for (const statement of statements) {
        await client.execute(statement);
      }
      await client.execute({
        sql: `INSERT INTO jord_migrations (id, name, checksum, applied_at)
              VALUES (?, ?, ?, ?)`,
        args: [migration.id, migration.name, step.checksum, Date.now()],
      });
      await client.execute("COMMIT");
    } catch (err) {
      await client.execute("ROLLBACK").catch(() => undefined);
      throw err;
    }
    applied.set(migration.id, step.checksum);
    result.applied.push(migration.id);
  }
  return result;
}

async function applyPostgres(
  client: PoolClient,
  migrations: SqlMigration[],
): Promise<MigrationRunResult> {
  await client.query(POSTGRES_MIGRATIONS_DDL);
  const existing = pgApplied(
    await client.query("SELECT id, checksum FROM jord_migrations"),
  );
  const applied = new Map(existing.map((row) => [row.id, row.checksum]));
  const result: MigrationRunResult = { applied: [], skipped: [] };

  for (const migration of migrations) {
    const step = planStep(migration, applied);
    if (step.skip) {
      result.skipped.push(migration.id);
      continue;
    }
    const statements = splitSqlStatements(migration.sql);
    await client.query("BEGIN");
    try {
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query(
        `INSERT INTO jord_migrations (id, name, checksum, applied_at)
         VALUES ($1, $2, $3, $4)`,
        [migration.id, migration.name, step.checksum, Date.now()],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    applied.set(migration.id, step.checksum);
    result.applied.push(migration.id);
  }
  return result;
}

/** Forward-only libSQL migrations. One in-process mutex per lock key. */
export async function runLibsqlMigrations(
  client: Client,
  options: MigrationRunOptions = {},
): Promise<MigrationRunResult> {
  const migrations = migrationsFor("libsql", options.migrations);
  const lockKey = options.lockKey ?? "libsql";
  return withRunnerMutex(lockKey, () => applyLibsql(client, migrations));
}

/**
 * Forward-only Postgres migrations.
 * Holds `pg_advisory_lock` on one pooled connection for the whole run.
 */
export async function runPostgresMigrations(
  pool: Pool,
  options: MigrationRunOptions = {},
): Promise<MigrationRunResult> {
  const migrations = migrationsFor("postgres", options.migrations);
  const lockKey = options.lockKey ?? "postgres";
  return withRunnerMutex(lockKey, async () => {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1::bigint)", [
        JORD_MIGRATION_ADVISORY_LOCK_KEY,
      ]);
      try {
        return await applyPostgres(client, migrations);
      } finally {
        await client.query("SELECT pg_advisory_unlock($1::bigint)", [
          JORD_MIGRATION_ADVISORY_LOCK_KEY,
        ]);
      }
    } finally {
      client.release();
    }
  });
}
