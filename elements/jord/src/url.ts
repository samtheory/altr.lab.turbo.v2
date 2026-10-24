import path from "node:path";
import { fileURLToPath } from "node:url";

import { JordSlice0UrlError, JordUrlError } from "./errors.js";

export const DEFAULT_DATABASE_URL = "file:./data/jord.db";

/** Safe scheme label (no host/path). `postgresql://` normalizes to `postgres`. */
export type JordUrlScheme = "file" | "postgres" | "libsql";

export type ResolvedJordUrl =
  | { scheme: "file"; url: string }
  | { scheme: "postgres"; url: string }
  | { scheme: "libsql"; url: string };

/**
 * Auth token for hosted `libsql://`.
 * Primary: `LIBSQL_AUTH_TOKEN`. Alias: `TURSO_AUTH_TOKEN` if primary unset.
 */
export function resolveLibsqlAuthToken(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const primary = env.LIBSQL_AUTH_TOKEN?.trim();
  if (primary) return primary;
  const alias = env.TURSO_AUTH_TOKEN?.trim();
  if (alias) return alias;
  return undefined;
}

/** Classify and validate DATABASE_URL. */
export function resolveDatabaseUrl(url?: string): ResolvedJordUrl {
  const resolved =
    url ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  if (resolved.startsWith("file:")) {
    return { scheme: "file", url: resolved };
  }
  if (
    resolved.startsWith("postgres://") ||
    resolved.startsWith("postgresql://")
  ) {
    return { scheme: "postgres", url: resolved };
  }
  if (resolved.startsWith("libsql:")) {
    return { scheme: "libsql", url: resolved };
  }
  throw new JordSlice0UrlError(resolved);
}

/** @deprecated Use resolveDatabaseUrl().url for file: only callers. */
export function resolveFileDatabaseUrl(url?: string): string {
  const resolved = resolveDatabaseUrl(url);
  if (resolved.scheme !== "file") {
    throw new JordSlice0UrlError(resolved.url);
  }
  return resolved.url;
}

/** Filesystem path for a `file:` URL (mkdir / snapshot target parent). */
export function fileUrlToFsPath(fileUrl: string): string {
  if (!fileUrl.startsWith("file:")) {
    throw new JordSlice0UrlError(fileUrl);
  }
  const rest = fileUrl.slice("file:".length);
  // Absolute file URLs: file:///… or file://localhost/…
  if (rest.startsWith("//")) {
    return fileURLToPath(fileUrl);
  }
  return path.resolve(rest);
}

/** Build a `file:` URL from an absolute or relative filesystem path. */
export function fsPathToFileUrl(filePath: string): string {
  const abs = path.resolve(filePath);
  const normalized = abs.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return normalized.startsWith("/")
    ? `file://${normalized}`
    : `file:${normalized}`;
}

/** Require a non-empty auth token for hosted libsql URLs. */
export function requireLibsqlAuthToken(
  url: string,
  authToken?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const token = authToken?.trim() || resolveLibsqlAuthToken(env);
  if (!token) {
    throw new JordUrlError(
      url,
      "LIBSQL_AUTH_TOKEN (or TURSO_AUTH_TOKEN) is required for libsql://",
    );
  }
  return token;
}
