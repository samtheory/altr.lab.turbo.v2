import { createHash } from "node:crypto";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const SCHEMA_ROWS = /^\/schema\/tables\/[^/]+\/rows/;
const RECORDS_ITEM = /^\/records\/[^/]+$/;
const BLOB_OBJECT = /^\/blobs\/[^/]+\/objects\//;

type HeaderContext = {
  req: { header: (name: string) => string | undefined };
};

export function readIdempotencyKey(c: HeaderContext): string | null {
  const raw = c.req.header("Idempotency-Key");
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

/** True when a present key exceeds the max length (respond 400). */
export function isIdempotencyKeyBadRequest(key: string | null): boolean {
  return key !== null && key.length > IDEMPOTENCY_KEY_MAX_LENGTH;
}

export function hashBodyText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const IDEMPOTENT_WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isIdempotentWriteMethod(method: string): boolean {
  return IDEMPOTENT_WRITE_METHODS.has(method.toUpperCase());
}

export function isIdempotentWritePath(path: string): boolean {
  if (path.startsWith("/api/v1")) return true;
  if (path === "/records" || RECORDS_ITEM.test(path)) return true;
  if (SCHEMA_ROWS.test(path)) return true;
  if (BLOB_OBJECT.test(path)) return true;
  return false;
}
