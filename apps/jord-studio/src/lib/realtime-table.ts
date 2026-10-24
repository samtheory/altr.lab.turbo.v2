const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Mirror jord-server `isRealtimeSubscribeTable` without importing the engine. */
export function isRealtimeSubscribeTable(name: string): boolean {
  if (name === "records") return true;
  if (!IDENT_RE.test(name)) return false;
  const lower = name.toLowerCase();
  if (
    lower.startsWith("jord_") ||
    lower.startsWith("sqlite_") ||
    lower.startsWith("pg_")
  ) {
    return false;
  }
  return true;
}
