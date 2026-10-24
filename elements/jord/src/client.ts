import { LibSqlAdapter } from "./adapter/libsql.js";
import { PostgresAdapter } from "./adapter/postgres.js";
import type { JordDriverPort } from "./port.js";
import { resolveDatabaseUrl } from "./url.js";

export type CreateJordClientOptions = {
  /** Defaults to `process.env.DATABASE_URL` or `file:./data/jord.db`. */
  url?: string;
};

/**
 * Open a Jord client from DATABASE_URL scheme.
 * - `file:` → LibSqlAdapter (mkdir + WAL)
 * - `postgres://` / `postgresql://` → PostgresAdapter (pooled)
 * - `libsql://` → rejected until a later slice
 */
export async function createJordClient(
  options: CreateJordClientOptions = {},
): Promise<JordDriverPort> {
  const resolved = resolveDatabaseUrl(options.url);
  if (resolved.scheme === "file") {
    return LibSqlAdapter.open(resolved.url);
  }
  return PostgresAdapter.open(resolved.url);
}
