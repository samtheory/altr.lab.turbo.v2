import type { Pool } from "pg";

import { runPostgresMigrations } from "./migrations/runner.js";

/**
 * Boot-time schema for Postgres.
 * Forward-only `jord_migrations` (S0021-A). The runner takes `pg_advisory_lock`
 * so two processes cannot apply the same migration together.
 */
export async function ensurePostgresSchema(
  pool: Pool,
  lockKey?: string,
): Promise<void> {
  await runPostgresMigrations(pool, { lockKey });
}
