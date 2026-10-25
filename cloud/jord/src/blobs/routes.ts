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
import {
  assertSignAllowed,
  buildLocalToRemoteCopyPlan,
  clampSignTtlSeconds,
  createPendingBlobMeta,
  FinalizeError,
  finalizeBlob,
  parseLocalSignedQuery,
  pendingExpiryFromSign,
  publicCopyPlanSummary,
  verifyLocalSignature,
  type JordStoragePort,
} from "../storage/index.js";

export type BlobRouteDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  storage: JordStoragePort;
  /** HMAC secret for local signed-URL verification. */
  hmacSecret: string;
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
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_BLOB_BYTES;
  const env = deps.env ?? process.env;

  protectedRoutes.get("/blobs/buckets", async (c) => {
    const fromMeta = await deps.jord.listBlobBuckets();
    return c.json({ buckets: fromMeta });
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
      await deps.storage.ensureBucket(name);
      const existing = await deps.jord.listBlobBuckets();
      const known = existing.includes(name);
      return c.json({ ok: true as const, name, existed: known }, known ? 200 : 201);
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

      const { bytes, contentType } = await readUploadBytes(c);
      if (bytes.byteLength > maxBytes) {
        throw new HTTPException(413, {
          message: `object exceeds max size of ${maxBytes} bytes`,
        });
      }

      // Byte I/O is outside the serial SQL write queue.
      await deps.storage.ensureBucket(bucket);
      const written = await deps.storage.putObject(
        bucket,
        key,
        bytes,
        contentType,
      );
      const meta = await deps.enqueueWrite(() =>
        deps.jord.upsertBlobMeta({
          bucket,
          key,
          contentType,
          size: written.size,
          etag: written.etag,
          status: "ready",
          pendingExpiresAt: null,
          uploadId: null,
        }),
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
      };
      const intent =
        body.intent === "download" || body.intent === "upload"
          ? body.intent
          : "upload";
      const contentType = normalizeContentType(
        typeof body.content_type === "string" ? body.content_type : undefined,
      );
      const ttl = clampSignTtlSeconds(body.ttl_seconds);

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
        const signed = await deps.storage.presign({
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
          storage: deps.storage.kind,
        });
      }

      let uploadId: string | null = null;
      if (body.multipart === true) {
        if (!deps.storage.createMultipartUpload) {
          throw new HTTPException(501, {
            message: "multipart not supported by storage backend",
          });
        }
        const created = await deps.storage.createMultipartUpload({
          bucket,
          key,
          contentType,
        });
        uploadId = created.uploadId;
      }

      const signed = await deps.storage.presign({
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
        storage: deps.storage.kind,
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

      try {
        const meta = await deps.enqueueWrite(() =>
          finalizeBlob({
            jord: deps.jord,
            storage: deps.storage,
            bucket,
            key,
            uploadId,
          }),
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
    const bytes = await deps.storage.getObject(bucket, key);
    if (!bytes) {
      throw new HTTPException(404, { message: "object bytes missing" });
    }
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": meta.contentType,
        "Content-Length": String(meta.size),
        ETag: `"${meta.etag}"`,
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

      // Byte delete outside the SQL queue; meta delete on the queue.
      // Already-absent bytes resolve (false); a real storage failure throws,
      // and we keep the metadata row so the client can retry.
      try {
        await deps.storage.deleteObject(bucket, key);
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
    hmacSecret: string;
    maxBytes?: number;
  },
): void {
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_BLOB_BYTES;

  app.all("/blobs/signed/:bucket/objects/:key", async (c) => {
    if (deps.storage.kind !== "local") {
      throw new HTTPException(404, { message: "not found" });
    }
    const bucket = c.req.param("bucket");
    const key = decodeObjectKey(c.req.param("key"));
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid bucket or key" });
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
      const bytes = await deps.storage.getObject(bucket, key);
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

    const body = new Uint8Array(await c.req.arrayBuffer());
    if (body.byteLength > maxBytes) {
      throw new HTTPException(413, {
        message: `object exceeds max size of ${maxBytes} bytes`,
      });
    }
    const contentType = normalizeContentType(
      parsed.contentType ?? c.req.header("content-type") ?? undefined,
    );

    if (parsed.uploadId && parsed.partNumber != null) {
      const local = deps.storage as JordStoragePort & {
        writeMultipartPart?: (
          uploadId: string,
          partNumber: number,
          bytes: Uint8Array,
        ) => Promise<{ size: number; etag: string }>;
      };
      if (!local.writeMultipartPart) {
        throw new HTTPException(501, { message: "multipart part unsupported" });
      }
      const written = await local.writeMultipartPart(
        parsed.uploadId,
        parsed.partNumber,
        body,
      );
      return c.json({ ok: true as const, etag: written.etag, size: written.size });
    }

    const written = await deps.storage.putObject(
      bucket,
      key,
      body,
      contentType,
    );
    return c.json({ ok: true as const, etag: written.etag, size: written.size });
  });
}
