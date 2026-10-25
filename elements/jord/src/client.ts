import { LibSqlAdapter } from "./adapter/libsql.js";
import { PostgresAdapter } from "./adapter/postgres.js";
import type { JordDriverPort } from "./port.js";
import { resolveDatabaseUrl } from "./url.js";

export type CreateJordClientOptions = {
  /** Defaults to `process.env.DATABASE_URL` or `file:./data/jord.db`. */
  url?: string;
  /**
   * Hosted `libsql://` auth token.
   * Defaults to `LIBSQL_AUTH_TOKEN` or `TURSO_AUTH_TOKEN`.
   * Ignored for `file:` and Postgres.
   */
  authToken?: string;
  /**
   * Postgres runtime pool. When false, skip owner DDL. The owner step is
   * `runOwnerMigration` on `JORD_MIGRATE_URL`. Ignored for libSQL.
   */
  postgresDdl?: boolean;
};

/**
 * Open a Jord client from DATABASE_URL scheme.
 * - `file:` → LibSqlAdapter (mkdir + WAL)
 * - `libsql://` → LibSqlAdapter (remote; auth token required)
 * - `postgres://` / `postgresql://` → PostgresAdapter (pooled)
 */
export async function createJordClient(
  options: CreateJordClientOptions = {},
): Promise<JordDriverPort> {
  const resolved = resolveDatabaseUrl(options.url);
  if (resolved.scheme === "file" || resolved.scheme === "libsql") {
    return LibSqlAdapter.open(resolved.url, { authToken: options.authToken });
  }
  return PostgresAdapter.open(resolved.url, {
    ddl: options.postgresDdl !== false,
  });
}
