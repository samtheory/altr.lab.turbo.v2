import path from "node:path";
import { fileURLToPath } from "node:url";

import { JordSlice0UrlError, JordUrlError } from "./errors.js";

export const DEFAULT_DATABASE_URL = "file:./data/jord.db";

export type JordUrlScheme = "file" | "postgres" | "postgresql";

export type ResolvedJordUrl =
  | { scheme: "file"; url: string }
  | { scheme: "postgres"; url: string };

/** Classify and validate DATABASE_URL. Accepts file: and postgres:/postgresql:. */
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
    throw new JordUrlError(
      resolved,
      "hosted libsql: DATABASE_URL is reserved for a later slice; use file: or postgres:/postgresql:",
    );
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
