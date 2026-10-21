import path from "node:path";
import { fileURLToPath } from "node:url";

import { JordSlice0UrlError } from "./errors.js";

export const DEFAULT_DATABASE_URL = "file:./data/jord.db";

/** Resolve DATABASE_URL; Slice 0 allows only `file:`. */
export function resolveDatabaseUrl(url?: string): string {
  const resolved =
    url ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  if (!resolved.startsWith("file:")) {
    throw new JordSlice0UrlError(resolved);
  }
  return resolved;
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
