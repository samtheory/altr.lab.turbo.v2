/** Project scoping for Studio routes, cookie, and BFF (S0045). */

export const PROJECT_COOKIE = "jord_project";
export const PROJECT_HEADER = "x-jord-project";
/** Env-backed zero-project install — maps to the primary `JORD_SERVER_URL` database. */
export const DEFAULT_PROJECT_SLUG = "default";

export const PROJECT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** Screen prefixes that live under `/p/[project]/…` (legacy roots redirect here). */
export const PROJECT_SCOPED_ROOTS = [
  "/tables",
  "/records",
  "/schema",
  "/storage",
  "/vectors",
  "/jobs",
  "/logs",
  "/apis",
  "/database",
  "/auth",
  "/help",
] as const;

export type StudioProjectSummary = {
  slug: string;
  engine: "libsql-file" | "libsql-turso" | "postgres" | "env";
  status: "active";
  target: string;
  isDefault: boolean;
};

export const DEFAULT_PROJECT_SUMMARY: StudioProjectSummary = {
  slug: DEFAULT_PROJECT_SLUG,
  engine: "env",
  status: "active",
  target: "JORD_SERVER_URL (primary)",
  isDefault: true,
};

export function projectHref(slug: string, path = ""): string {
  const base = `/p/${encodeURIComponent(slug)}`;
  if (!path || path === "/") return base;
  const q = path.indexOf("?");
  const pathOnly = q >= 0 ? path.slice(0, q) : path;
  const search = q >= 0 ? path.slice(q) : "";
  const suffix = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  return `${base}${suffix}${search}`;
}

/** Drop `?…` / `#…` before matching Studio paths. */
export function pathWithoutSearch(path: string): string {
  const q = path.search(/[?#]/);
  return q >= 0 ? path.slice(0, q) : path;
}

export function extractProjectSlug(pathname: string): string | null {
  const match = pathname.match(/^\/p\/([^/]+)(?:\/|$)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? null;
  }
}

/** Path after `/p/[project]` (e.g. `/tables/foo`). Empty string → project home. */
export function extractProjectRestPath(pathname: string): string {
  const match = pathname.match(/^\/p\/[^/]+(\/.*)?$/);
  if (!match) return pathname;
  return match[1] && match[1].length > 0 ? match[1] : "";
}

export function isProjectScopedPath(pathname: string): boolean {
  for (const root of PROJECT_SCOPED_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) return true;
  }
  return false;
}

/**
 * Fail closed when the caller claims a different project than the session cookie.
 * Missing header is allowed (cookie alone scopes). Missing both is allowed for
 * control-plane routes that do not send scope.
 */
export function assertProjectScopeMatch(
  cookieSlug: string | null | undefined,
  headerSlug: string | null | undefined,
): { ok: true; slug: string | null } | { ok: false; status: 403; error: string } {
  const cookie = cookieSlug?.trim() || null;
  const header = headerSlug?.trim() || null;
  if (cookie && header && cookie !== header) {
    return {
      ok: false,
      status: 403,
      error: "project_mismatch",
    };
  }
  return { ok: true, slug: header ?? cookie };
}
