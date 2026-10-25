import { createHash } from "node:crypto";

import type { JordBlob, JordDriverPort } from "@altr/jord";

import type { JordStoragePort } from "./port.js";
import { DEFAULT_PENDING_TTL_MS } from "./ttl.js";

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type CreatePendingInput = {
  jord: JordDriverPort;
  bucket: string;
  key: string;
  contentType: string;
  /** Absolute expiry for the pending row (ms). */
  pendingExpiresAt: number;
  uploadId?: string | null;
};

export async function createPendingBlobMeta(
  input: CreatePendingInput,
): Promise<JordBlob> {
  return input.jord.upsertBlobMeta({
    bucket: input.bucket,
    key: input.key,
    contentType: input.contentType,
    size: 0,
    etag: "",
    status: "pending",
    pendingExpiresAt: input.pendingExpiresAt,
    uploadId: input.uploadId ?? null,
  });
}

export type FinalizeInput = {
  jord: JordDriverPort;
  storage: JordStoragePort;
  bucket: string;
  key: string;
  /** When set, must match the stored pending upload id. */
  uploadId?: string | null;
};

/**
 * Promote a pending object after bytes exist on the adapter.
 * Verifies head/get before flipping status — never marks ready without bytes.
 */
export async function finalizeBlob(input: FinalizeInput): Promise<JordBlob> {
  const meta = await input.jord.getBlobMeta(input.bucket, input.key);
  if (!meta) {
    throw new FinalizeError("not_found", "object metadata not found");
  }
  if (meta.status === "ready") {
    return meta;
  }
  if (
    input.uploadId != null &&
    meta.uploadId != null &&
    input.uploadId !== meta.uploadId
  ) {
    throw new FinalizeError("upload_mismatch", "upload id mismatch");
  }

  const head = await input.storage.headObject(input.bucket, input.key);
  if (head && head.size > 0) {
    return input.jord.upsertBlobMeta({
      bucket: input.bucket,
      key: input.key,
      contentType: meta.contentType,
      size: head.size,
      etag: head.etag || meta.etag,
      status: "ready",
      pendingExpiresAt: null,
      uploadId: null,
    });
  }

  const bytes = await input.storage.getObject(input.bucket, input.key);
  if (!bytes || bytes.byteLength === 0) {
    throw new FinalizeError(
      "bytes_missing",
      "object bytes missing; upload before finalize",
    );
  }
  return input.jord.upsertBlobMeta({
    bucket: input.bucket,
    key: input.key,
    contentType: meta.contentType,
    size: bytes.byteLength,
    etag: sha256Hex(bytes),
    status: "ready",
    pendingExpiresAt: null,
    uploadId: null,
  });
}

export class FinalizeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "FinalizeError";
  }
}

export type GcResult = {
  deletedPending: number;
  deletedBytes: number;
  errors: string[];
};

/**
 * Delete stale pending rows and their adapter bytes.
 * Ready objects are never touched. Does not delete source during copy/switch.
 */
export async function gcExpiredPendingBlobs(input: {
  jord: JordDriverPort;
  storage: JordStoragePort;
  nowMs?: number;
}): Promise<GcResult> {
  const now = input.nowMs ?? Date.now();
  const expired = await input.jord.listExpiredPendingBlobs(now);
  let deletedPending = 0;
  let deletedBytes = 0;
  const errors: string[] = [];

  for (const row of expired) {
    try {
      const removed = await input.storage.deleteObject(row.bucket, row.key);
      if (removed) deletedBytes += 1;
      if (row.uploadId && input.storage.abortMultipartUpload) {
        await input.storage
          .abortMultipartUpload({
            bucket: row.bucket,
            key: row.key,
            uploadId: row.uploadId,
          })
          .catch(() => undefined);
      }
      await input.jord.deleteBlobMeta(row.bucket, row.key);
      deletedPending += 1;
    } catch (err) {
      // Byte delete failed (or later step): row is kept for retry next sweep.
      errors.push(
        `${row.bucket}/${row.key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { deletedPending, deletedBytes, errors };
}

export function pendingExpiryFromSign(
  expiresAt: number,
  pendingTtlMs: number = DEFAULT_PENDING_TTL_MS,
): number {
  return Math.max(expiresAt, Date.now() + pendingTtlMs);
}
