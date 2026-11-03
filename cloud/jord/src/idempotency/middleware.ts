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

/**
 * Read a request body (from a clone) as text, counting bytes as they stream.
 * Returns `null` once more than `maxBytes` arrive (the stream is cancelled),
 * so a chunked body cannot bypass the Content-Length based body-limit
 * middleware. `maxBytes: null` = unbounded (blob routes, exempt from the JSON cap).
 */
export async function readBodyTextCapped(
  req: Request,
  maxBytes: number | null,
): Promise<string | null> {
  const stream = req.body;
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (maxBytes !== null && total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Idempotency namespace for a caller. Anon callers all share uid/role, so
 * their key also carries a hash of the client IP (first x-forwarded-for hop,
 * else "local"); the raw IP is never stored.
 */
export function idempotencyPrincipalKey(
  principal: { kind: string; uid?: string; role: string },
  forwardedFor: string | undefined,
): string {
  const base = `${principal.kind}:${principal.uid ?? principal.role}`;
  if (principal.kind !== "anon") return base;
  const ip = forwardedFor?.split(",")[0]?.trim() || "local";
  const digest = createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 32);
  return `${base}:${digest}`;
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
