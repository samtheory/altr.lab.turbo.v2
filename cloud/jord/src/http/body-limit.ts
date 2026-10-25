import type { MiddlewareHandler } from "hono";

export const DEFAULT_MAX_JSON_BYTES = 1 * 1024 * 1024;

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function resolveMaxJsonBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.JORD_MAX_JSON_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_JSON_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_JSON_BYTES;
  }
  return parsed;
}

export function createJsonBodyLimitMiddleware(
  maxBytes: number,
): MiddlewareHandler {
  return async (c, next) => {
    const path = c.req.path;
    if (path.startsWith("/blobs/")) {
      await next();
      return;
    }

    if (!BODY_METHODS.has(c.req.method)) {
      await next();
      return;
    }

    const lengthHeader = c.req.header("Content-Length");
    if (lengthHeader !== undefined) {
      const length = Number.parseInt(lengthHeader, 10);
      if (Number.isFinite(length) && length > maxBytes) {
        return c.json({ error: "payload_too_large" }, 413);
      }
    }

    await next();
  };
}
