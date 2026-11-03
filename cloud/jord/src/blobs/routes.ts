import {
  DEFAULT_MAX_BLOB_BYTES,
  isValidBlobBucket,
  isValidBlobKey,
  normalizeContentType,
  type JordBlob,
  type JordDriverPort,
} from "@altr/jord";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/index.js";
import {
  requireManageBlobs,
  requireWriteBlobs,
} from "../auth/middleware.js";
import type { WriteQueue } from "../queue.js";
import { MAX_LOCAL_PART_BYTES } from "../storage/local.js";
import { registerMultipartRoutes } from "./multipart-routes.js";
import {
  pickTransformInput,
  registerSignedTransformRoute,
  toHttp,
} from "./transform-routes.js";
import { buildLocalSignedUrl, type HmacSecret } from "../storage/hmac.js";
import { resolvePublicBaseUrl } from "../storage/factory.js";
import {
  canonicalTransform,
  createTransformService,
  DERIVATIVE_RESERVED_MESSAGE,
  isDerivativeRow,
  parseTransformParams,
  transformToQuery,
} from "../storage/transform.js";
import {
  assertBucketUploadLimits,
  assertSignAllowed,
  buildLocalToRemoteCopyPlan,
  clampSignTtlSeconds,
  createPendingBlobMeta,
  FinalizeError,
  finalizeBlob,
  getBucketRow,
  listBucketRows,
  materializeBucketRow,
  parseLocalSignedQuery,
  pendingExpiryFromSign,
  publicCopyPlanSummary,
  verifyLocalSignature,
  type BucketResolver,
  type JordStoragePort,
  type ResolvedBucket,
} from "../storage/index.js";

export type BlobRouteDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  /** Env-backed default port (copy-plan / signed fallback). */
  storage: JordStoragePort;
  /** Per-bucket resolution (S0066). Required for mixed providers. */
  resolveBucket: BucketResolver["resolveBucket"];
  /** HMAC secret for local signed-URL verification. */
  hmacSecret: HmacSecret;
  maxBytes?: number;
  env?: NodeJS.ProcessEnv;
  /** Local disk root — used only by the copy-plan dry-run. */
  localRoot?: string;
};

function publicBlob(row: JordBlob) {
  return {
    id: row.id,
    bucket: row.bucket,
    key: row.key,
    content_type: row.contentType,
    size: row.size,
    etag: row.etag,
    status: row.status,
    pending_expires_at: row.pendingExpiresAt,
    upload_id: row.uploadId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function decodeObjectKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    throw new HTTPException(400, { message: "invalid object key encoding" });
  }
}

function assertBucketActive(resolved: ResolvedBucket): void {
  if (resolved.row?.status === "paused") {
    throw new HTTPException(503, {
      message: `bucket "${resolved.name}" is paused`,
    });
  }
}

async function readUploadBytes(
  c: {
    req: {
      header: (name: string) => string | undefined;
      parseBody: () => Promise<Record<string, string | File>>;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
  },
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const contentTypeHeader = c.req.header("content-type") ?? "";
  if (contentTypeHeader.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      throw new HTTPException(400, {
        message: 'multipart upload requires a "file" field',
      });
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const ct =
      typeof body.content_type === "string"
        ? body.content_type
        : file.type || contentTypeHeader;
    return { bytes: buf, contentType: normalizeContentType(ct) };
  }
  const buf = new Uint8Array(await c.req.arrayBuffer());
  return {
    bytes: buf,
    contentType: normalizeContentType(contentTypeHeader || undefined),
  };
}

export function registerBlobRoutes(
  protectedRoutes: Hono<{ Variables: JordAuthVariables }>,
  deps: BlobRouteDeps,
): void {
  const env = deps.env ?? process.env;
  // S0082: derivative cleanup on delete (render path lives on the signed route).
  const transforms = createTransformService({
    jord: deps.jord,
    enqueueWrite: deps.enqueueWrite,
  });

  // S0081 — multipart / resumable upload sessions.
  registerMultipartRoutes(protectedRoutes, deps, publicBlob);

  protectedRoutes.get("/blobs/buckets", async (c) => {
    const fromMeta = await deps.jord.listBlobBuckets();
    const fromRegistry = await listBucketRows(deps.jord);
    const names = new Set<string>([
      ...fromMeta,
      ...fromRegistry.map((row) => row.name),
    ]);
    return c.json({ buckets: [...names].sort() });
  });

  protectedRoutes.post(
    "/blobs/buckets",
    requireManageBlobs(),
    async (c) => {
      const body = (await c.req.json().catch(() => null)) as {
        name?: unknown;
      } | null;
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (!isValidBlobBucket(name)) {
        throw new HTTPException(400, {
          message:
            "bucket name must match [a-z0-9][a-z0-9_-]{0,62}",
        });
      }
      const priorRow = await getBucketRow(deps.jord, name);
      const knownMeta = (await deps.jord.listBlobBuckets()).includes(name);
      const row = await deps.enqueueWrite(() =>
        materializeBucketRow({
          jord: deps.jord,
          name,
          env,
        }),
      );
      const resolved = await deps.resolveBucket(name);
      await resolved.port.ensureBucket(name);
      const existed = Boolean(priorRow) || knownMeta;
      return c.json(
        {
          ok: true as const,
          name,
          existed,
          provider: row.provider,
        },
        existed ? 200 : 201,
      );
    },
  );

  protectedRoutes.get("/blobs/:bucket", async (c) => {
    const bucket = c.req.param("bucket");
    if (!isValidBlobBucket(bucket)) {
      throw new HTTPException(400, { message: "invalid bucket name" });
    }
    const rows = await deps.jord.listBlobs(bucket);
    return c.json({
      bucket,
      objects: rows.filter((r) => r.status === "ready").map(publicBlob),
    });
  });

  /** Direct upload (phase-01 path): write bytes + ready meta on the write queue for meta only. */
  protectedRoutes.put(
    "/blobs/:bucket/objects/:key",
    requireWriteBlobs(),
    async (c) => {
      const bucket = c.req.param("bucket");
      const key = decodeObjectKey(c.req.param("key"));
      if (!isValidBlobBucket(bucket)) {
        throw new HTTPException(400, { message: "invalid bucket name" });
      }
      if (!isValidBlobKey(key)) {
        throw new HTTPException(400, { message: "invalid object key" });
      }

      const resolved = await deps.resolveBucket(bucket);
      assertBucketActive(resolved);
      const { bytes, contentType } = await readUploadBytes(c);
      const gate = assertBucketUploadLimits({
        size: bytes.byteLength,
        contentType,
        maxObjectBytes: resolved.limits.maxObjectBytes,
        allowedMimeTypes: resolved.limits.allowedMimeTypes,
      });
      if (!gate.ok) {
        throw new HTTPException(gate.status, { message: gate.message });
      }

      // Derivative rows are owned by the transform service; refuse to overwrite.
      if (await isDerivativeRow(deps.jord, bucket, key)) {
        throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
      }

      // Byte I/O is outside the serial SQL write queue.
      await resolved.port.ensureBucket(bucket);
      const written = await resolved.port.putObject(
        bucket,
        key,
        bytes,
        contentType,
      );
      const meta = await deps.enqueueWrite(async () => {
        // Re-check on the serial queue (a derivative may have claimed the key).
        if (await isDerivativeRow(deps.jord, bucket, key)) {
          throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
        }
        return deps.jord.upsertBlobMeta({
          bucket,
          key,
          contentType,
          size: written.size,
          etag: written.etag,
          status: "ready",
          pendingExpiresAt: null,
          uploadId: null,
        });
      });
      // Overwrite invalidates derivatives rendered from the previous bytes.
      await transforms
        .deleteDerivatives({
          bucket,
          key,
          port: resolved.port,
          keepEtag: meta.etag,
        })
        .catch((err) =>
          console.error(
            `[@altr/jord-server] stale derivative cleanup failed ${bucket}/${key}`,
            err,
          ),
        );

      return c.json(publicBlob(meta));
    },
  );

  /**
   * Sign an upload or download URL. Policy is evaluated here (sign time).
   * Response shape is identical for local HMAC and S3 presign.
   */
  protectedRoutes.post(
    "/blobs/:bucket/objects/:key/sign",
    async (c) => {
      const bucket = c.req.param("bucket");
      const key = decodeObjectKey(c.req.param("key"));
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new HTTPException(400, { message: "invalid bucket or key" });
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        intent?: unknown;
        content_type?: unknown;
        ttl_seconds?: unknown;
        multipart?: unknown;
        transform?: unknown;
      };
      const intent =
        body.intent === "download" || body.intent === "upload"
          ? body.intent
          : "upload";
      const contentType = normalizeContentType(
        typeof body.content_type === "string" ? body.content_type : undefined,
      );

      const resolved = await deps.resolveBucket(bucket);
      assertBucketActive(resolved);
      const ttl = clampSignTtlSeconds(
        body.ttl_seconds,
        resolved.limits.signTtlSeconds,
      );

      const principal = c.get("principal");
      const gate = await assertSignAllowed({
        jord: deps.jord,
        principal,
        bucket,
        intent,
        env,
      });
      if (!gate.allowed) {
        throw new HTTPException(gate.status, { message: gate.reason });
      }

      if (intent === "download") {
        const meta = await deps.jord.getBlobMeta(bucket, key);
        if (!meta || meta.status !== "ready") {
          throw new HTTPException(404, { message: "object not found" });
        }
        if (body.transform !== undefined) {
          // S0082: transform params are inside the HMAC, served by the
          // server (any bucket kind) at /blobs/signed/:bucket/transform/:key.
          if (
            typeof body.transform !== "object" ||
            body.transform === null ||
            Array.isArray(body.transform)
          ) {
            throw new HTTPException(400, { message: "invalid transform" });
          }
          if (meta.derivedFrom != null) {
            throw new HTTPException(400, {
              message: "cannot transform a derivative",
            });
          }
          let params;
          try {
            params = parseTransformParams(
              pickTransformInput(body.transform as Record<string, unknown>),
            );
          } catch (err) {
            return toHttp(err);
          }
          const expiresAt = Date.now() + ttl * 1000;
          const url = buildLocalSignedUrl({
            baseUrl: resolvePublicBaseUrl(env),
            secret: deps.hmacSecret,
            params: {
              bucket,
              key,
              method: "GET",
              expiresAt,
              transform: canonicalTransform(params),
            },
            transformQuery: transformToQuery(params),
          });
          return c.json({
            url,
            method: "GET" as const,
            headers: {},
            expires_at: expiresAt,
            object: publicBlob(meta),
            storage: resolved.port.kind,
            transform: transformToQuery(params),
          });
        }
        const signed = await resolved.port.presign({
          bucket,
          key,
          intent: "download",
          expiresInSeconds: ttl,
        });
        return c.json({
          url: signed.url,
          method: signed.method,
          headers: signed.headers,
          expires_at: signed.expiresAt,
          object: publicBlob(meta),
          storage: resolved.port.kind,
        });
      }

      if (await isDerivativeRow(deps.jord, bucket, key)) {
        throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
      }

      const uploadGate = assertBucketUploadLimits({
        size: 0,
        contentType,
        maxObjectBytes: resolved.limits.maxObjectBytes,
        allowedMimeTypes: resolved.limits.allowedMimeTypes,
      });
      if (!uploadGate.ok && uploadGate.status === 415) {
        throw new HTTPException(uploadGate.status, {
          message: uploadGate.message,
        });
      }

      let uploadId: string | null = null;
      if (body.multipart === true) {
        if (!resolved.port.createMultipartUpload) {
          throw new HTTPException(501, {
            message: "multipart not supported by storage backend",
          });
        }
        const created = await resolved.port.createMultipartUpload({
          bucket,
          key,
          contentType,
        });
        uploadId = created.uploadId;
      }

      const signed = await resolved.port.presign({
        bucket,
        key,
        intent: "upload",
        contentType,
        expiresInSeconds: ttl,
        uploadId: uploadId ?? undefined,
      });

      const pending = await deps.enqueueWrite(() =>
        createPendingBlobMeta({
          jord: deps.jord,
          bucket,
          key,
          contentType,
          pendingExpiresAt: pendingExpiryFromSign(signed.expiresAt),
          uploadId,
        }),
      );

      return c.json({
        url: signed.url,
        method: signed.method,
        headers: signed.headers,
        expires_at: signed.expiresAt,
        object: publicBlob(pending),
        storage: resolved.port.kind,
      });
    },
  );

  protectedRoutes.post(
    "/blobs/:bucket/objects/:key/finalize",
    requireWriteBlobs(),
    async (c) => {
      const bucket = c.req.param("bucket");
      const key = decodeObjectKey(c.req.param("key"));
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new HTTPException(400, { message: "invalid bucket or key" });
      }
      const body = (await c.req.json().catch(() => ({}))) as {
        upload_id?: unknown;
      };
      const uploadId =
        typeof body.upload_id === "string" ? body.upload_id : null;

      const resolved = await deps.resolveBucket(bucket);
      assertBucketActive(resolved);

      try {
        const meta = await deps.enqueueWrite(() =>
          finalizeBlob({
            jord: deps.jord,
            storage: resolved.port,
            bucket,
            key,
            uploadId,
          }),
        );
        await transforms
          .deleteDerivatives({
            bucket,
            key,
            port: resolved.port,
            keepEtag: meta.etag,
          })
          .catch((err) =>
            console.error(
              `[@altr/jord-server] stale derivative cleanup failed ${bucket}/${key}`,
              err,
            ),
          );
        return c.json(publicBlob(meta));
      } catch (err) {
        if (err instanceof FinalizeError) {
          const status =
            err.code === "not_found"
              ? 404
              : err.code === "bytes_missing"
                ? 409
                : 400;
          throw new HTTPException(status, { message: err.message });
        }
        throw err;
      }
    },
  );

  /** Dry-run local→remote copy plan. Never deletes source bytes. */
  protectedRoutes.post(
    "/blobs/copy-plan",
    requireManageBlobs(),
    async (c) => {
      if (!deps.localRoot) {
        throw new HTTPException(503, {
          message: "local blob root unavailable for copy plan",
        });
      }
      const plan = await buildLocalToRemoteCopyPlan({
        jord: deps.jord,
        localRoot: deps.localRoot,
      });
      return c.json(publicCopyPlanSummary(plan));
    },
  );

  protectedRoutes.get("/blobs/:bucket/objects/:key", async (c) => {
    const bucket = c.req.param("bucket");
    const key = decodeObjectKey(c.req.param("key"));
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid bucket or key" });
    }
    const meta = await deps.jord.getBlobMeta(bucket, key);
    if (!meta || meta.status !== "ready") {
      throw new HTTPException(404, { message: "object not found" });
    }
    const resolved = await deps.resolveBucket(bucket);
    const bytes = await resolved.port.getObject(bucket, key);
    if (!bytes) {
      throw new HTTPException(404, { message: "object bytes missing" });
    }
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": meta.contentType,
        "Content-Length": String(meta.size),
        ETag: `"${meta.etag}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  protectedRoutes.delete(
    "/blobs/:bucket/objects/:key",
    requireWriteBlobs(),
    async (c) => {
      const bucket = c.req.param("bucket");
      const key = decodeObjectKey(c.req.param("key"));
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new HTTPException(400, { message: "invalid bucket or key" });
      }

      const resolved = await deps.resolveBucket(bucket);
      assertBucketActive(resolved);

      // Byte delete outside the SQL queue; meta delete on the queue.
      // Already-absent bytes resolve (false); a real storage failure throws,
      // and we keep the metadata row so the client can retry.
      try {
        await resolved.port.deleteObject(bucket, key);
      } catch (err) {
        console.error(
          `[@altr/jord-server] blob byte delete failed ${bucket}/${key}`,
          err,
        );
        return c.json({ error: "storage_delete_failed" as const }, 502);
      }
      const deleted = await deps.enqueueWrite(() =>
        deps.jord.deleteBlobMeta(bucket, key),
      );

      if (!deleted) {
        throw new HTTPException(404, { message: "object not found" });
      }
      // S0082: derivatives go with the original. A failure here is not fatal:
      // blobs_gc sweeps orphans (original row gone).
      await transforms
        .deleteDerivatives({ bucket, key, port: resolved.port })
        .catch((err) =>
          console.error(
            `[@altr/jord-server] derivative cleanup failed ${bucket}/${key}`,
            err,
          ),
        );
      return c.json({ ok: true as const, bucket, key });
    },
  );
}

/**
 * HMAC-verified upload/download for local adapter (no bearer).
 * Mounted on the public app so signed URLs work like S3 presigns.
 */
export function registerSignedBlobRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any>,
  deps: {
    storage: JordStoragePort;
    resolveBucket?: BucketResolver["resolveBucket"];
    hmacSecret: HmacSecret;
    maxBytes?: number;
    /** S0082: enables the signed transform route when both are provided. */
    jord?: JordDriverPort;
    enqueueWrite?: WriteQueue;
  },
): void {
  const envMaxBytes = deps.maxBytes ?? DEFAULT_MAX_BLOB_BYTES;
  if (deps.jord && deps.enqueueWrite && deps.resolveBucket) {
    registerSignedTransformRoute(app, {
      jord: deps.jord,
      enqueueWrite: deps.enqueueWrite,
      resolveBucket: deps.resolveBucket,
      hmacSecret: deps.hmacSecret,
    });
  }

  app.all("/blobs/signed/:bucket/objects/:key", async (c) => {
    const bucket = c.req.param("bucket");
    const key = decodeObjectKey(c.req.param("key"));
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid bucket or key" });
    }

    const resolved = deps.resolveBucket
      ? await deps.resolveBucket(bucket)
      : {
          name: bucket,
          row: null,
          port: deps.storage,
          limits: {
            maxObjectBytes: envMaxBytes,
            allowedMimeTypes: null,
            signTtlSeconds: null,
          },
          source: "env" as const,
        };

    if (resolved.port.kind !== "local") {
      throw new HTTPException(404, { message: "not found" });
    }

    const url = new URL(c.req.url);
    const parsed = parseLocalSignedQuery(url.searchParams);
    if (!parsed) {
      throw new HTTPException(403, { message: "invalid signature params" });
    }

    const method = c.req.method.toUpperCase();
    if (method !== "GET" && method !== "PUT" && method !== "HEAD") {
      throw new HTTPException(405, { message: "method not allowed" });
    }
    const signMethod = method === "HEAD" ? "GET" : (method as "GET" | "PUT");
    const ok = verifyLocalSignature(
      deps.hmacSecret,
      {
        bucket,
        key,
        method: signMethod,
        expiresAt: parsed.expiresAt,
        contentType: parsed.contentType,
        uploadId: parsed.uploadId,
        partNumber: parsed.partNumber,
      },
      parsed.signature,
    );
    if (!ok) {
      throw new HTTPException(403, { message: "invalid or expired signature" });
    }

    if (signMethod === "GET") {
      const bytes = await resolved.port.getObject(bucket, key);
      if (!bytes) {
        throw new HTTPException(404, { message: "object not found" });
      }
      if (method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Length": String(bytes.byteLength),
            ETag: `"${bytes.byteLength}"`,
          },
        });
      }
      return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: {
          "Content-Type":
            parsed.contentType ?? "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
        },
      });
    }

    if (parsed.uploadId && parsed.partNumber != null) {
      // S0081: stream the part with a hard byte cap enforced by the adapter;
      // never buffer the body. Content-Length (when sent) is only an early
      // reject, the streamed byte count is authoritative.
      const declared = c.req.header("content-length");
      if (declared !== undefined) {
        const n = Number(declared);
        if (!Number.isFinite(n) || n > MAX_LOCAL_PART_BYTES) {
          throw new HTTPException(413, { message: "part too large" });
        }
      }
      const local = resolved.port as JordStoragePort;
      if (!local.writeMultipartPart) {
        throw new HTTPException(501, { message: "multipart part unsupported" });
      }
      let written: { size: number; etag: string };
      try {
        written = await local.writeMultipartPart(
          parsed.uploadId,
          parsed.partNumber,
          c.req.raw.body,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "multipart upload not found") {
          throw new HTTPException(404, { message: "upload not found" });
        }
        if (msg === "part too large") {
          throw new HTTPException(413, { message: "part too large" });
        }
        if (msg === "part size mismatch") {
          throw new HTTPException(400, { message: "part size mismatch" });
        }
        if (msg === "invalid part number" || msg === "invalid upload id") {
          throw new HTTPException(400, { message: "invalid part number" });
        }
        console.error("[@altr/jord-server] multipart part write failed", err);
        throw new HTTPException(500, { message: "storage_error" });
      }
      return c.json({ ok: true as const, etag: written.etag, size: written.size });
    }
    if (deps.jord && (await isDerivativeRow(deps.jord, bucket, key))) {
      throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
    }
    const body = new Uint8Array(await c.req.arrayBuffer());
    const contentType = normalizeContentType(
      parsed.contentType ?? c.req.header("content-type") ?? undefined,
    );
    const gate = assertBucketUploadLimits({
      size: body.byteLength,
      contentType,
      maxObjectBytes: resolved.limits.maxObjectBytes,
      allowedMimeTypes: resolved.limits.allowedMimeTypes,
    });
    if (!gate.ok) {
      throw new HTTPException(gate.status, { message: gate.message });
    }

    const written = await resolved.port.putObject(
      bucket,
      key,
      body,
      contentType,
    );
    return c.json({ ok: true as const, etag: written.etag, size: written.size });
  });
}
