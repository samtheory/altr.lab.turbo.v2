import { isValidBlobBucket, isValidBlobKey, type JordDriverPort } from "@altr/jord";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { WriteQueue } from "../queue.js";
import { verifyLocalSignature, type HmacSecret } from "../storage/hmac.js";
import type { BucketResolver } from "../storage/resolve-bucket.js";
import {
  canonicalTransform,
  createTransformService,
  parseTransformParams,
  TRANSFORM_QUERY_KEYS,
  TransformError,
  type TransformService,
} from "../storage/transform.js";

/** Pick the transform keys out of a loose record (JSON body or query). */
export function pickTransformInput(
  src: Record<string, unknown>,
): Partial<Record<(typeof TRANSFORM_QUERY_KEYS)[number], string>> {
  const out: Partial<Record<(typeof TRANSFORM_QUERY_KEYS)[number], string>> = {};
  for (const k of TRANSFORM_QUERY_KEYS) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string" && typeof v !== "number") {
      throw new HTTPException(400, { message: `invalid ${k}` });
    }
    out[k] = String(v);
  }
  return out;
}

export function toHttp(err: unknown): never {
  if (err instanceof TransformError) {
    throw new HTTPException(err.status, { message: err.message });
  }
  throw err;
}

function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new HTTPException(400, { message: "invalid object key encoding" });
  }
}

/**
 * Public signed transform route (S0082):
 *   GET /blobs/signed/:bucket/transform/:key?w=&h=&fit=&q=&fm=&X-Jord-*
 * Works for local and S3 buckets: the server reads the original through the
 * bucket port, renders (bounded) and stores the derivative beside it.
 */
export function registerSignedTransformRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any>,
  deps: {
    jord: JordDriverPort;
    enqueueWrite: WriteQueue;
    resolveBucket: BucketResolver["resolveBucket"];
    hmacSecret: HmacSecret;
    transform?: TransformService;
  },
): TransformService {
  const service =
    deps.transform ??
    createTransformService({ jord: deps.jord, enqueueWrite: deps.enqueueWrite });

  app.on(["GET", "HEAD"], "/blobs/signed/:bucket/transform/:key", async (c) => {
    const bucket = c.req.param("bucket");
    const key = decodeKey(c.req.param("key"));
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid bucket or key" });
    }
    const url = new URL(c.req.url);
    const q = url.searchParams;
    const expiresRaw = q.get("X-Jord-Expires");
    const signature = q.get("X-Jord-Signature");
    if (q.get("X-Jord-Algorithm") !== "JORD1-HMAC-SHA256" || !expiresRaw || !signature) {
      throw new HTTPException(403, { message: "invalid signature params" });
    }
    const expiresAt = Number.parseInt(expiresRaw, 10);
    if (!Number.isFinite(expiresAt)) {
      throw new HTTPException(403, { message: "invalid signature params" });
    }

    const raw: Record<string, string> = {};
    for (const [k, v] of q.entries()) {
      if (k.startsWith("X-Jord-")) continue;
      if (!(TRANSFORM_QUERY_KEYS as readonly string[]).includes(k)) {
        // Unknown params are refused rather than silently ignored.
        throw new HTTPException(400, { message: `unknown parameter "${k}"` });
      }
      if (k in raw) throw new HTTPException(400, { message: `duplicate "${k}"` });
      raw[k] = v;
    }
    let params;
    try {
      params = parseTransformParams(raw);
    } catch (err) {
      return toHttp(err);
    }

    const ok = verifyLocalSignature(
      deps.hmacSecret,
      {
        bucket,
        key,
        method: "GET",
        expiresAt,
        transform: canonicalTransform(params),
      },
      signature,
    );
    if (!ok) {
      throw new HTTPException(403, { message: "invalid or expired signature" });
    }

    const resolved = await deps.resolveBucket(bucket);
    if (resolved.row?.status === "paused") {
      throw new HTTPException(503, { message: `bucket "${bucket}" is paused` });
    }
    // Derivatives are always served with a type derived from the output
    // format (never stored metadata), nosniff, and inline (jpeg/png only).
    const baseHeaders = (contentType: string) => ({
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    });
    try {
      if (c.req.method === "HEAD") {
        // HEAD never renders (that would be a CPU-amplification vector with no
        // body to show for it). Cached derivative: 200 + headers from metadata.
        // Not cached: 405 with Allow: GET; the client should GET to warm it.
        const cached = await service.head({ bucket, key, params });
        if (!cached) {
          return new Response(null, { status: 405, headers: { Allow: "GET" } });
        }
        return new Response(null, {
          status: 200,
          headers: {
            ...baseHeaders(cached.contentType),
            "Content-Length": String(cached.size),
            ETag: `"${cached.etag}"`,
            "X-Jord-Transform-Cache": "hit",
          },
        });
      }
      const out = await service.serve({ bucket, key, port: resolved.port, params });
      return new Response(new Uint8Array(out.bytes), {
        status: 200,
        headers: {
          ...baseHeaders(out.contentType),
          "Content-Length": String(out.bytes.byteLength),
          ETag: `"${out.etag}"`,
          "X-Jord-Transform-Cache": out.cache,
        },
      });
    } catch (err) {
      return toHttp(err);
    }
  });

  return service;
}
