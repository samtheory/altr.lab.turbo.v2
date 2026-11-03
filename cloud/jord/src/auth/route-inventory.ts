function normalizePath(path: string): string {
  const noQuery = path.split("?")[0] ?? path;
  if (noQuery.length > 1 && noQuery.endsWith("/")) return noQuery.slice(0, -1);
  return noQuery;
}

const SCHEMA_ROWS = /^\/schema\/tables\/[^/]+\/rows(?:\/[^/]+)?$/;
const SCHEMA_ONE_TABLE = /^\/schema\/tables\/[^/]+$/;

/**
 * Declared HTTP surface for a mounted route, or null when the path is undeclared.
 */
export function surfaceFor(method: string, path: string): string | null {
  const normalized = normalizePath(path);
  const verb = method.toUpperCase();

  if (normalized === "/health" || normalized.startsWith("/health/")) {
    return "health";
  }
  if (normalized === "/api/v1" || normalized.startsWith("/api/v1/")) {
    return "api/v1";
  }
  if (normalized === "/auth" || normalized.startsWith("/auth/")) return "auth";
  if (
    normalized === "/realtime/ws" ||
    normalized.startsWith("/realtime/ws/")
  ) {
    return "realtime/ws";
  }
  if (normalized === "/realtime" || normalized.startsWith("/realtime/")) {
    return "realtime";
  }
  // S0084: publishable-key app realtime (own handshake, not operator auth).
  if (/^\/p\/[^/]+\/realtime$/.test(normalized)) return "p/:project/realtime";
  if (normalized === "/records" || normalized.startsWith("/records/")) {
    return "records";
  }

  if (normalized.startsWith("/schema/")) {
    if (SCHEMA_ROWS.test(normalized)) return "schema rows";
    const read = verb === "GET" || verb === "HEAD";
    if (
      read &&
      (normalized === "/schema/schemas" ||
        normalized === "/schema/tables" ||
        SCHEMA_ONE_TABLE.test(normalized))
    ) {
      return "schema tables";
    }
    if (
      normalized === "/schema/tables" ||
      normalized.startsWith("/schema/tables/")
    ) {
      return "schema DDL";
    }
    return null;
  }

  if (
    normalized === "/apis/generated" ||
    normalized.startsWith("/apis/generated/")
  ) {
    return "apis/generated";
  }
  if (normalized === "/jobs" || normalized.startsWith("/jobs/")) return "jobs";
  if (normalized === "/logs" || normalized.startsWith("/logs/")) return "logs";
  if (normalized === "/sql" || normalized.startsWith("/sql/")) return "sql";
  if (normalized === "/migrate" || normalized.startsWith("/migrate/")) {
    return "migrate";
  }
  if (normalized.startsWith("/admin/auth/")) return "admin auth";
  if (normalized === "/admin" || normalized.startsWith("/admin/")) return "admin";
  if (normalized === "/functions" || normalized.startsWith("/functions/")) {
    return "functions";
  }
  if (
    normalized === "/custom-apis" ||
    normalized.startsWith("/custom-apis/")
  ) {
    return "custom-apis";
  }
  if (/^\/x\/[^/]+$/.test(normalized)) return "x/:slug";
  if (normalized === "/policies" || normalized.startsWith("/policies/")) {
    return "policies";
  }
  if (normalized === "/triggers" || normalized.startsWith("/triggers/")) {
    return "triggers";
  }
  if (normalized === "/blobs" || normalized.startsWith("/blobs/")) {
    return "blobs";
  }
  if (normalized === "/vectors" || normalized.startsWith("/vectors/")) {
    return "vectors";
  }
  return null;
}

/** Routes whose method+path match no declared surface. */
export function undeclared(
  routes: Array<{ method: string; path: string }>,
): string[] {
  return routes
    .filter((route) => surfaceFor(route.method, route.path) == null)
    .map((route) => `${route.method.toUpperCase()} ${route.path}`);
}
