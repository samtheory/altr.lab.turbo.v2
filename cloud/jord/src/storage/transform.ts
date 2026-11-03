import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";

import {
  isValidBlobKey,
  MAX_BLOB_KEY_LENGTH,
  type JordBlob,
  type JordDriverPort,
} from "@altr/jord";

import type { WriteQueue } from "../queue.js";
import type { JordStoragePort } from "./port.js";

/**
 * S0082 image transforms. Pure JS (jpeg-js + pngjs) inside a worker_thread;
 * no native binary. Output formats: jpeg, png. Input: jpeg, png (magic-byte
 * sniffed, content-type is never trusted; SVG and everything else is 415).
 */

export const TRANSFORM_LIMITS = {
  maxDimension: 4096,
  minQuality: 1,
  maxQuality: 100,
  defaultQuality: 80,
  maxSourceBytes: 20 * 1024 * 1024,
  /** 16 MP: decoded RGBA is 4 B/px (~64 MB) plus resize buffers. */
  maxSourcePixels: 16_000_000,
  /**
   * 16-bit and interlaced PNGs cost 2-4x more to decode (pngjs expands to
   * 16-bit samples / holds the full Adam7 pass buffers), so they get half the
   * pixel budget. Checked from the IHDR header, before any decode.
   */
  maxExpensivePngPixels: 8_000_000,
  maxConcurrentRenders: 2,
  maxQueuedRenders: 8,
  renderTimeoutMs: 15_000,
} as const;

export const TRANSFORM_FITS = ["cover", "contain", "fill"] as const;
export type TransformFit = (typeof TRANSFORM_FITS)[number];
export type ImageFormat = "jpeg" | "png";

/** Query params that carry a transform (everything else is rejected). */
export const TRANSFORM_QUERY_KEYS = ["w", "h", "fit", "q", "fm"] as const;

export type TransformParams = {
  /** 0 = derive from the other axis. */
  w: number;
  h: number;
  fit: TransformFit;
  q: number;
  /** "auto" = same format as the source. */
  fm: ImageFormat | "auto";
};

export class TransformError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 413 | 415 | 422 | 502 | 503 | 504,
    message: string,
  ) {
    super(message);
    this.name = "TransformError";
  }
}

function parseDim(raw: string | undefined, name: string): number {
  if (raw === undefined || raw === "") return 0;
  if (!/^\d{1,5}$/.test(raw)) throw new TransformError(400, `invalid ${name}`);
  const n = Number(raw);
  if (n < 1 || n > TRANSFORM_LIMITS.maxDimension) {
    throw new TransformError(
      400,
      `${name} must be 1..${TRANSFORM_LIMITS.maxDimension}`,
    );
  }
  return n;
}

/** Validate + normalise raw query values into canonical params. */
export function parseTransformParams(
  raw: Partial<Record<(typeof TRANSFORM_QUERY_KEYS)[number], string>>,
): TransformParams {
  const w = parseDim(raw.w, "w");
  const h = parseDim(raw.h, "h");
  if (w === 0 && h === 0) {
    throw new TransformError(400, "w or h is required");
  }
  let fit: TransformFit = "cover";
  if (raw.fit !== undefined && raw.fit !== "") {
    if (!(TRANSFORM_FITS as readonly string[]).includes(raw.fit)) {
      throw new TransformError(400, "fit must be cover, contain or fill");
    }
    fit = raw.fit as TransformFit;
  }
  // One axis only: aspect is preserved, fit is meaningless -> canonical value.
  if (w === 0 || h === 0) fit = "contain";
  let q: number = TRANSFORM_LIMITS.defaultQuality;
  if (raw.q !== undefined && raw.q !== "") {
    if (!/^\d{1,3}$/.test(raw.q)) throw new TransformError(400, "invalid q");
    q = Number(raw.q);
    if (q < TRANSFORM_LIMITS.minQuality || q > TRANSFORM_LIMITS.maxQuality) {
      throw new TransformError(
        400,
        `q must be ${TRANSFORM_LIMITS.minQuality}..${TRANSFORM_LIMITS.maxQuality}`,
      );
    }
  }
  let fm: TransformParams["fm"] = "auto";
  if (raw.fm !== undefined && raw.fm !== "") {
    const v = raw.fm.toLowerCase();
    if (v === "jpeg" || v === "jpg") fm = "jpeg";
    else if (v === "png") fm = "png";
    else throw new TransformError(400, "fm must be jpeg or png");
  }
  return { w, h, fit, q, fm };
}

/** Exact string that is mixed into the HMAC (`Transform` canonical line). */
export function canonicalTransform(p: TransformParams): string {
  return `w=${p.w};h=${p.h};fit=${p.fit};q=${p.q};fm=${p.fm}`;
}

export function transformToQuery(p: TransformParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.w) out.w = String(p.w);
  if (p.h) out.h = String(p.h);
  out.fit = p.fit;
  out.q = String(p.q);
  if (p.fm !== "auto") out.fm = p.fm;
  return out;
}

/**
 * Key SHAPE only. NOT authoritative: a user object may legitimately be named
 * like this. Whether a row is a derivative is decided by `jord_blobs.derived_from`
 * (set only by this service). Kept for tooling/tests.
 */
const DERIVATIVE_RE = /^(.+)\.([0-9a-f]{16})\.(jpg|png)$/;

/** Parse a stored key back to its original key, or null if not a derivative. */
export function parseDerivativeKey(
  key: string,
): { original: string; hash: string; ext: "jpg" | "png" } | null {
  const m = DERIVATIVE_RE.exec(key);
  if (!m) return null;
  return { original: m[1]!, hash: m[2]!, ext: m[3] as "jpg" | "png" };
}

export function derivativeKey(
  original: string,
  params: TransformParams,
  format: ImageFormat,
  /** Etag of the original: overwriting the original yields a new key. */
  srcEtag = "",
): string {
  const resolved = { ...params, fm: format, q: format === "png" ? 0 : params.q };
  const hash = createHash("sha256")
    .update(`${canonicalTransform(resolved)}|src=${srcEtag}`)
    .digest("hex")
    .slice(0, 16);
  const key = `${original}.${hash}.${format === "jpeg" ? "jpg" : "png"}`;
  if (key.length > MAX_BLOB_KEY_LENGTH || !isValidBlobKey(key)) {
    throw new TransformError(400, "derivative key too long");
  }
  return key;
}

/* ---------------------------- header probing ---------------------------- */

export type ImageProbe = {
  format: ImageFormat;
  width: number;
  height: number;
  /** PNG only (IHDR). */
  bitDepth?: number;
  interlaced?: boolean;
};

/** Sniff magic bytes and read dimensions from the header only (no decode). */
export function probeImage(bytes: Uint8Array): ImageProbe {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(12) !== 0x49484452) {
      throw new TransformError(422, "corrupt png header");
    }
    return {
      format: "png",
      width: dv.getUint32(16),
      height: dv.getUint32(20),
      bitDepth: bytes.length >= 25 ? bytes[24] : undefined,
      interlaced: bytes.length >= 29 ? bytes[28] === 1 : undefined,
    };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = bytes[i + 1]!;
      if (marker === 0xff) {
        i += 1;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        const height = (bytes[i + 5]! << 8) | bytes[i + 6]!;
        const width = (bytes[i + 7]! << 8) | bytes[i + 8]!;
        return { format: "jpeg", width, height };
      }
      if (marker === 0xda) break;
      i += 2 + len;
    }
    throw new TransformError(422, "corrupt jpeg header");
  }
  throw new TransformError(415, "only jpeg and png images can be transformed");
}

/* -------------------------------- renderer ------------------------------- */

export type RenderInput = {
  bytes: Uint8Array;
  format: ImageFormat;
  params: TransformParams & { fm: ImageFormat };
  timeoutMs: number;
};
export type RenderOutput = { bytes: Uint8Array; width: number; height: number };
export type Renderer = (input: RenderInput) => Promise<RenderOutput>;

const WORKER_URL = new URL("./transform-worker.cjs", import.meta.url);

/** Default renderer: one short-lived worker_thread per render, hard timeout. */
export const workerRenderer: Renderer = (input) =>
  new Promise<RenderOutput>((resolve, reject) => {
    const worker = new Worker(WORKER_URL, {
      workerData: {
        bytes: input.bytes,
        format: input.format,
        params: input.params,
      },
      resourceLimits: { maxOldGenerationSizeMb: 512 },
    });
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      fn();
    };
    const timer = setTimeout(
      () => done(() => reject(new TransformError(504, "render_timeout"))),
      input.timeoutMs,
    );
    worker.once(
      "message",
      (msg: {
        ok: boolean;
        bytes?: Uint8Array;
        width?: number;
        height?: number;
        error?: string;
        stage?: string;
      }) =>
        done(() => {
          if (msg.ok && msg.bytes) {
            resolve({ bytes: msg.bytes, width: msg.width ?? 0, height: msg.height ?? 0 });
          } else {
            // Details are logged, never returned to the client.
            console.error("[@altr/jord-server] transform worker failed:", msg.error);
            reject(
              msg.stage === "decode"
                ? new TransformError(422, "source_invalid")
                : new TransformError(502, "render_failed"),
            );
          }
        }),
    );
    worker.once("error", (err) =>
      done(() => {
        console.error("[@altr/jord-server] transform worker crashed:", err.message);
        reject(new TransformError(502, "render_failed"));
      }),
    );
    worker.once("exit", (code) =>
      done(() => {
        console.error(`[@altr/jord-server] transform worker exited (${code})`);
        reject(new TransformError(502, "render_failed"));
      }),
    );
  });

/* --------------------------------- service -------------------------------- */

export type TransformResult = {
  bytes: Uint8Array;
  contentType: string;
  etag: string;
  /** bypass = rendered and served inline but NOT cached (key occupied). */
  cache: "hit" | "miss" | "bypass";
  key: string;
};

export type TransformHead = { contentType: string; etag: string; size: number };

export type TransformService = {
  serve(input: {
    bucket: string;
    key: string;
    port: JordStoragePort;
    params: TransformParams;
  }): Promise<TransformResult>;
  /** Cache-only lookup for HEAD: never renders. null = not cached. */
  head(input: {
    bucket: string;
    key: string;
    params: TransformParams;
  }): Promise<TransformHead | null>;
  /**
   * Delete derivatives (bytes + meta) whose `derived_from` is `key`. With
   * `keepEtag`, derivatives rendered from that original etag are kept (used
   * after an overwrite). Returns count.
   */
  deleteDerivatives(input: {
    bucket: string;
    key: string;
    port: JordStoragePort;
    keepEtag?: string;
  }): Promise<number>;
  stats(): { renders: number; active: number; queued: number };
};

export type TransformServiceOptions = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  render?: Renderer;
  maxConcurrent?: number;
  maxQueued?: number;
  timeoutMs?: number;
  maxSourceBytes?: number;
  maxSourcePixels?: number;
};

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** True when a metadata row exists at `key` and is a transform derivative. */
export async function isDerivativeRow(
  jord: JordDriverPort,
  bucket: string,
  key: string,
): Promise<boolean> {
  const meta = await jord.getBlobMeta(bucket, key);
  return meta?.derivedFrom != null;
}

export const DERIVATIVE_RESERVED_MESSAGE =
  "key is reserved for a generated image derivative";

const contentTypeOf = (f: ImageFormat) => (f === "jpeg" ? "image/jpeg" : "image/png");

function hintFormat(contentType: string): ImageFormat | null {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  return null;
}

export function createTransformService(
  opts: TransformServiceOptions,
): TransformService {
  const render = opts.render ?? workerRenderer;
  const maxConcurrent = opts.maxConcurrent ?? TRANSFORM_LIMITS.maxConcurrentRenders;
  const maxQueued = opts.maxQueued ?? TRANSFORM_LIMITS.maxQueuedRenders;
  const timeoutMs = opts.timeoutMs ?? TRANSFORM_LIMITS.renderTimeoutMs;
  const maxSourceBytes = opts.maxSourceBytes ?? TRANSFORM_LIMITS.maxSourceBytes;
  const maxSourcePixels = opts.maxSourcePixels ?? TRANSFORM_LIMITS.maxSourcePixels;

  let active = 0;
  let renders = 0;
  const waiters: Array<() => void> = [];
  const inflight = new Map<string, Promise<TransformResult>>();

  async function acquire(): Promise<void> {
    if (active < maxConcurrent) {
      active += 1;
      return;
    }
    if (waiters.length >= maxQueued) {
      throw new TransformError(503, "too many concurrent renders; retry shortly");
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  function release(): void {
    const next = waiters.shift();
    if (next) next(); // slot handed over; active stays the same
    else active -= 1;
  }

  /** A row is a servable derivative only if the DB says so and it is fresh. */
  function isFreshDerivative(
    meta: JordBlob | null,
    original: string,
    srcEtag: string,
  ): meta is JordBlob {
    return (
      meta !== null &&
      meta.status === "ready" &&
      meta.derivedFrom === original &&
      meta.derivedSrcEtag === srcEtag
    );
  }

  async function readHit(
    port: JordStoragePort,
    bucket: string,
    original: string,
    srcEtag: string,
    dKey: string,
    format: ImageFormat,
  ): Promise<TransformResult | null> {
    const meta = await opts.jord.getBlobMeta(bucket, dKey);
    if (!isFreshDerivative(meta, original, srcEtag)) return null;
    const bytes = await port.getObject(bucket, dKey);
    if (!bytes) return null;
    return {
      bytes,
      // Never the stored content type: always what the output format is.
      contentType: contentTypeOf(format),
      etag: meta.etag,
      cache: "hit",
      key: dKey,
    };
  }

  async function renderMiss(
    input: { bucket: string; key: string; port: JordStoragePort; params: TransformParams },
    original: JordBlob,
  ): Promise<TransformResult> {
    const { bucket, key, port, params } = input;
    const srcEtag = original.etag;
    if (original.size > maxSourceBytes) {
      throw new TransformError(413, "source image too large");
    }
    await acquire();
    try {
      const src = await port.getObject(bucket, key);
      if (!src) throw new TransformError(404, "object bytes missing");
      if (src.byteLength > maxSourceBytes) {
        throw new TransformError(413, "source image too large");
      }
      const probe = probeImage(src);
      const pixels = probe.width * probe.height;
      if (probe.width < 1 || probe.height < 1 || pixels > maxSourcePixels) {
        throw new TransformError(
          413,
          `source image exceeds pixel budget (${maxSourcePixels} px)`,
        );
      }
      if (
        probe.format === "png" &&
        (probe.bitDepth === 16 || probe.interlaced === true) &&
        pixels > TRANSFORM_LIMITS.maxExpensivePngPixels
      ) {
        throw new TransformError(
          413,
          `16-bit or interlaced png exceeds pixel budget (${TRANSFORM_LIMITS.maxExpensivePngPixels} px)`,
        );
      }
      const format = params.fm === "auto" ? probe.format : params.fm;
      const dKey = derivativeKey(key, params, format, srcEtag);

      // Another request may have finished while we waited for a slot.
      const raced = await readHit(port, bucket, key, srcEtag, dKey, format);
      if (raced) return raced;

      const contentType = contentTypeOf(format);
      // Claim the derivative key atomically on the serial write queue. A row
      // that is not a derivative of this original is NEVER touched.
      const claim = await opts.enqueueWrite(async () => {
        const cur = await opts.jord.getBlobMeta(bucket, dKey);
        if (cur) {
          return cur.derivedFrom === key ? ("existing" as const) : ("occupied" as const);
        }
        await opts.jord.upsertBlobMeta({
          bucket,
          key: dKey,
          contentType,
          size: 0,
          etag: "",
          status: "pending",
          pendingExpiresAt: Date.now() + 5 * 60_000,
          uploadId: null,
          derivedFrom: key,
          derivedSrcEtag: srcEtag,
        });
        return "created" as const;
      });
      try {
        renders += 1;
        const out = await render({
          bytes: src,
          format: probe.format,
          params: { ...params, fm: format },
          timeoutMs,
        });
        if (claim === "occupied") {
          // A user object sits on the derivative key: serve inline, store nothing.
          return {
            bytes: out.bytes,
            contentType,
            etag: sha(out.bytes),
            cache: "bypass",
            key: dKey,
          };
        }
        await port.ensureBucket(bucket);
        const written = await port.putObject(bucket, dKey, out.bytes, contentType);
        const etag = written.etag || sha(out.bytes);
        const stored = await opts.enqueueWrite(async () => {
          const cur = await opts.jord.getBlobMeta(bucket, dKey);
          if (!cur || cur.derivedFrom !== key) return false; // not ours any more
          await opts.jord.upsertBlobMeta({
            bucket,
            key: dKey,
            contentType,
            size: written.size,
            etag,
            status: "ready",
            pendingExpiresAt: null,
            uploadId: null,
            derivedFrom: key,
            derivedSrcEtag: srcEtag,
          });
          return true;
        });
        return {
          bytes: out.bytes,
          contentType,
          etag,
          cache: stored ? "miss" : "bypass",
          key: dKey,
        };
      } catch (err) {
        if (claim === "created") {
          // Only the row this render created, and only while still ours+pending.
          await opts
            .enqueueWrite(async () => {
              const cur = await opts.jord.getBlobMeta(bucket, dKey);
              if (cur && cur.derivedFrom === key && cur.status === "pending") {
                await opts.jord.deleteBlobMeta(bucket, dKey);
              }
            })
            .catch(() => undefined);
        }
        throw err;
      }
    } finally {
      release();
    }
  }

  async function loadOriginal(bucket: string, key: string): Promise<JordBlob> {
    const original = await opts.jord.getBlobMeta(bucket, key);
    if (!original || original.status !== "ready") {
      throw new TransformError(404, "object not found");
    }
    if (original.derivedFrom != null) {
      throw new TransformError(400, "cannot transform a derivative");
    }
    return original;
  }

  return {
    async serve(input) {
      const { bucket, key, port, params } = input;
      const original = await loadOriginal(bucket, key);
      // Content type of the original is only a lookup hint for fm=auto; the
      // derivative row is validated from the DB, so a wrong hint just misses.
      const hit = params.fm !== "auto" ? params.fm : hintFormat(original.contentType);
      if (hit) {
        const found = await readHit(
          port,
          bucket,
          key,
          original.etag,
          derivativeKey(key, params, hit, original.etag),
          hit,
        );
        if (found) return found;
      }
      const flightKey = `${bucket}\n${key}\n${original.etag}\n${canonicalTransform(params)}`;
      const existing = inflight.get(flightKey);
      if (existing) return existing;
      const p = renderMiss(input, original).finally(() => inflight.delete(flightKey));
      inflight.set(flightKey, p);
      return p;
    },

    async head({ bucket, key, params }) {
      const original = await loadOriginal(bucket, key);
      const fmt = params.fm !== "auto" ? params.fm : hintFormat(original.contentType);
      if (!fmt) return null;
      const meta = await opts.jord.getBlobMeta(
        bucket,
        derivativeKey(key, params, fmt, original.etag),
      );
      if (!isFreshDerivative(meta, key, original.etag)) return null;
      return { contentType: contentTypeOf(fmt), etag: meta.etag, size: meta.size };
    },

    async deleteDerivatives({ bucket, key, port, keepEtag }) {
      const rows = await opts.jord.listBlobs(bucket);
      let n = 0;
      for (const row of rows) {
        if (row.derivedFrom !== key) continue;
        if (keepEtag !== undefined && row.derivedSrcEtag === keepEtag) continue;
        await port.deleteObject(bucket, row.key);
        await opts.enqueueWrite(() => opts.jord.deleteBlobMeta(bucket, row.key));
        n += 1;
      }
      return n;
    },

    stats: () => ({ renders, active, queued: waiters.length }),
  };
}

/**
 * blobs_gc hook. Sweeps rows marked `derived_from` (never key-shape matches)
 * whose original is gone, or whose original's current etag differs from the
 * etag the derivative was rendered from (stale after an overwrite). A pending
 * original (re-upload in flight) is left alone.
 */
export async function gcOrphanDerivatives(input: {
  jord: JordDriverPort;
  resolveStorage: (bucket: string) => Promise<JordStoragePort>;
}): Promise<{ orphanDerivatives: number; errors: string[] }> {
  const all = await input.jord.listAllBlobMeta();
  const byKey = new Map(all.map((r) => [`${r.bucket}\n${r.key}`, r]));
  let orphanDerivatives = 0;
  const errors: string[] = [];
  for (const row of all) {
    if (row.derivedFrom == null || row.status === "pending") continue;
    const orig = byKey.get(`${row.bucket}\n${row.derivedFrom}`);
    const stale =
      !orig || (orig.status === "ready" && orig.etag !== row.derivedSrcEtag);
    if (!stale) continue;
    try {
      const port = await input.resolveStorage(row.bucket);
      await port.deleteObject(row.bucket, row.key);
      await input.jord.deleteBlobMeta(row.bucket, row.key);
      orphanDerivatives += 1;
    } catch (err) {
      errors.push(`${row.bucket}/${row.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { orphanDerivatives, errors };
}
