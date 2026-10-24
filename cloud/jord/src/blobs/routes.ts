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
import type { BlobDiskStore } from "./disk.js";

export type BlobRouteDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  disk: BlobDiskStore;
  maxBytes?: number;
};

function publicBlob(row: JordBlob) {
  return {
    id: row.id,
    bucket: row.bucket,
    key: row.key,
    content_type: row.contentType,
    size: row.size,
    etag: row.etag,
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
      await deps.disk.ensureBucketDir(name);
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
    return c.json({ bucket, objects: rows.map(publicBlob) });
  });

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

      const meta = await deps.enqueueWrite(async () => {
        await deps.disk.ensureBucketDir(bucket);
        const written = await deps.disk.writeObject(bucket, key, bytes);
        return deps.jord.upsertBlobMeta({
          bucket,
          key,
          contentType,
          size: written.size,
          etag: written.etag,
        });
      });

      return c.json(publicBlob(meta));
    },
  );

  protectedRoutes.get("/blobs/:bucket/objects/:key", async (c) => {
    const bucket = c.req.param("bucket");
    const key = decodeObjectKey(c.req.param("key"));
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid bucket or key" });
    }
    const meta = await deps.jord.getBlobMeta(bucket, key);
    if (!meta) {
      throw new HTTPException(404, { message: "object not found" });
    }
    const bytes = await deps.disk.readObject(bucket, key);
    if (!bytes) {
      throw new HTTPException(404, { message: "object bytes missing on disk" });
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

      const deleted = await deps.enqueueWrite(async () => {
        await deps.disk.deleteObject(bucket, key).catch(() => false);
        return deps.jord.deleteBlobMeta(bucket, key);
      });

      if (!deleted) {
        throw new HTTPException(404, { message: "object not found" });
      }
      return c.json({ ok: true as const, bucket, key });
    },
  );
}
