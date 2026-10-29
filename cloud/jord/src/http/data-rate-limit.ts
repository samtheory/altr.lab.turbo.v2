import type { MiddlewareHandler } from "hono";

import {
  createMemoryRateLimitStore,
  type RateLimitStore,
} from "./rate-limit-store.js";

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

export function createDataRateLimitMiddleware(
  opts: DataRateLimitOptions,
  store: RateLimitStore = createMemoryRateLimitStore(),
): MiddlewareHandler {
  return async (c, next) => {
    const bucket = dataRouteBucket(c.req.path);
    if (!bucket) {
      await next();
      return;
    }

    const key = `${bucket}:${clientKey(c.req.header("x-forwarded-for"))}`;
    let count: number;
    try {
      count = await store.hit(key, opts.windowMs);
    } catch (err) {
      // A limiter outage must not take the data API down with it.
      console.error("[@altr/jord-server] rate-limit store failed, allowing", err);
      await next();
      return;
    }
    if (count > opts.maxHits) {
      return c.json({ error: "too_many_requests" }, 429);
    }

    await next();
  };
}
