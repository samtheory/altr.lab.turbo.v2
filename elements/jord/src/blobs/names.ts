/** Bucket: `[a-z0-9][a-z0-9_-]{0,62}` — 1–63 chars. */
const BUCKET_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export const MAX_BLOB_KEY_LENGTH = 512;
export const MAX_CONTENT_TYPE_LENGTH = 128;
/** Default max object size (10 MiB). */
export const DEFAULT_MAX_BLOB_BYTES = 10 * 1024 * 1024;

export function isValidBlobBucket(name: string): boolean {
  return BUCKET_RE.test(name);
}

/**
 * Relative object key: no leading `/`, no `..`, no empty segments, max length.
 */
export function isValidBlobKey(key: string): boolean {
  if (key.length === 0 || key.length > MAX_BLOB_KEY_LENGTH) return false;
  if (key.startsWith("/") || key.includes("\\")) return false;
  // Control chars (incl. NUL and newline) are rejected so they can never shift
  // the HMAC canonical string (fields are newline-joined).
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  const parts = key.split("/");
  for (const part of parts) {
    if (part.length === 0 || part === "." || part === "..") return false;
  }
  return true;
}

export function normalizeContentType(raw: string | null | undefined): string {
  const value = (raw ?? "application/octet-stream").trim();
  if (value.length === 0 || value.length > MAX_CONTENT_TYPE_LENGTH) {
    return "application/octet-stream";
  }
  return value;
}
