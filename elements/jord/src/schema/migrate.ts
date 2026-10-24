import type { Client } from "@libsql/client";

import { runLibsqlMigrations } from "./migrations/runner.js";

/**
 * Boot-time schema for libSQL.
 * Forward-only `jord_migrations` (S0021-A) replaces ad-hoc CREATE TABLE at boot.
 * `lockKey` should be `migrationLockKey(url)` so two opens of one database serialize.
 */
export async function ensureRecordsSchema(
  client: Client,
  lockKey?: string,
): Promise<void> {
  await runLibsqlMigrations(client, { lockKey });
}
