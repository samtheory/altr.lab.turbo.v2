import { LibSqlAdapter } from "./adapter/libsql.js";
import type { JordDriverPort } from "./port.js";
import { resolveDatabaseUrl } from "./url.js";

export type CreateJordClientOptions = {
  /** Defaults to `process.env.DATABASE_URL` or `file:./data/jord.db`. */
  url?: string;
};

/**
 * Open a Slice 0 Jord client. Only `file:` URLs are accepted.
 * Creates the parent directory, applies WAL pragmas, ensures `records`.
 */
export async function createJordClient(
  options: CreateJordClientOptions = {},
): Promise<JordDriverPort> {
  const url = resolveDatabaseUrl(options.url);
  return LibSqlAdapter.open(url);
}
