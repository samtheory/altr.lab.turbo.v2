import type { MiddlewareHandler } from "hono";

export const DEFAULT_DATA_MAX_HITS = 120;
export const WINDOW_MS = 60_000;

const SCHEMA_ROWS = /^\/schema\/tables\/[^/]+\/rows/;

export type DataRateLimitOptions = {
  maxHits: number;
  windowMs: number;
};

export function resolveDataRateLimit(
  env: NodeJS.ProcessEnv = process.env,
): DataRateLimitOptions {
  let maxHits = DEFAULT_DATA_MAX_HITS;
  const hitsRaw = env.JORD_DATA_RATE_LIMIT?.trim();
  if (hitsRaw) {
    const parsed = Number.parseInt(hitsRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxHits = parsed;
    }
  }

  let windowMs = WINDOW_MS;
  const windowRaw = env.JORD_DATA_RATE_WINDOW_MS?.trim();
  if (windowRaw) {
    const parsed = Number.parseInt(windowRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      windowMs = parsed;
    }
  }

  return { maxHits, windowMs };
}

function dataRouteBucket(path: string): string | null {
  if (path.startsWith("/api/v1")) return "api-v1";
  if (path.startsWith("/records")) return "records";
  if (SCHEMA_ROWS.test(path)) return "schema-rows";
  if (path.startsWith("/vectors")) return "vectors";
  if (path.startsWith("/blobs")) return "blobs";
  if (path.startsWith("/apis/generated")) return "apis-generated";
  if (path === "/x" || path.startsWith("/x/")) return "x";
  return null;
}

function clientKey(header: string | undefined): string {
  return header?.split(",")[0]?.trim() || "local";
}

function allowHit(
  store: Map<string, { count: number; reset: number }>,
  key: string,
  maxHits: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const slot = store.get(key);
  if (!slot || slot.reset <= now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  slot.count += 1;
  return slot.count <= maxHits;
}

export function createDataRateLimitMiddleware(
  opts: DataRateLimitOptions,
): MiddlewareHandler {
  const store = new Map<string, { count: number; reset: number }>();

  return async (c, next) => {
    const bucket = dataRouteBucket(c.req.path);
    if (!bucket) {
      await next();
      return;
    }

    const key = `${bucket}:${clientKey(c.req.header("x-forwarded-for"))}`;
    if (!allowHit(store, key, opts.maxHits, opts.windowMs)) {
      return c.json({ error: "too_many_requests" }, 429);
    }

    await next();
  };
}
