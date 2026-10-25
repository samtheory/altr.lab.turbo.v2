export type PgIdentity = {
  host: string;
  port: string;
  database: string;
  user: string;
};

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function databaseName(pathname: string): string {
  const stripped = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  try {
    return decodeURIComponent(stripped);
  } catch {
    return stripped;
  }
}

/** Identity of a postgres URL, ignoring password, query, hash, and trailing slashes. */
export function postgresConnectionIdentity(raw: string): PgIdentity | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol)) return null;

  return {
    host: url.hostname.toLowerCase(),
    port: url.port === "" ? "5432" : url.port,
    database: databaseName(url.pathname),
    user: url.username,
  };
}

/** True only when both URLs are postgres and host, port, database, and user match. */
export function samePostgresConnection(a: string, b: string): boolean {
  const left = postgresConnectionIdentity(a);
  const right = postgresConnectionIdentity(b);
  if (!left || !right) return false;
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.database === right.database &&
    left.user === right.user
  );
}
