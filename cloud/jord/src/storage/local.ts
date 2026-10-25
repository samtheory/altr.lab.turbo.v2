import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidBlobBucket, isValidBlobKey } from "@altr/jord";

import {
  createBlobDiskStore,
  sha256Hex,
  type BlobDiskStore,
} from "../blobs/disk.js";
import { buildLocalSignedUrl } from "./hmac.js";
import type {
  HeadObjectResult,
  JordStoragePort,
  PresignRequest,
  PresignResult,
  PutObjectResult,
} from "./port.js";

export type LocalStorageAdapterOptions = {
  root: string;
  /** HMAC secret for signed URLs (defaults to JORD_SERVER_TOKEN / dedicated env). */
  hmacSecret: string;
  /** Public base URL embedded in signed URLs (e.g. http://127.0.0.1:8787). */
  publicBaseUrl: string;
  disk?: BlobDiskStore;
};

type MultipartState = {
  bucket: string;
  key: string;
  contentType: string;
  parts: Map<number, { etag: string; path: string }>;
};

/**
 * Local disk adapter. Presign returns HMAC URLs with the same PresignResult
 * shape as S3 so clients do not branch on backend kind.
 */
export function createLocalStorageAdapter(
  options: LocalStorageAdapterOptions,
): JordStoragePort & { disk: BlobDiskStore; root: string } {
  const disk = options.disk ?? createBlobDiskStore(options.root);
  const multipart = new Map<string, MultipartState>();
  const multipartRoot = path.join(disk.root, ".multipart");

  async function writePart(
    uploadId: string,
    partNumber: number,
    bytes: Uint8Array,
  ): Promise<PutObjectResult> {
    const state = multipart.get(uploadId);
    if (!state) throw new Error("multipart upload not found");
    const partDir = path.join(multipartRoot, uploadId);
    await mkdir(partDir, { recursive: true });
    const partPath = path.join(partDir, `part-${partNumber}`);
    await writeFile(partPath, bytes);
    const etag = sha256Hex(bytes);
    state.parts.set(partNumber, { etag, path: partPath });
    return { size: bytes.byteLength, etag };
  }

  const adapter: JordStoragePort & { disk: BlobDiskStore; root: string } = {
    kind: "local",
    disk,
    root: disk.root,

    async ensureBucket(bucket) {
      await disk.ensureBucketDir(bucket);
    },

    async putObject(bucket, key, bytes, _contentType) {
      await disk.ensureBucketDir(bucket);
      return disk.writeObject(bucket, key, bytes);
    },

    async getObject(bucket, key) {
      return disk.readObject(bucket, key);
    },

    async headObject(bucket, key): Promise<HeadObjectResult | null> {
      const bytes = await disk.readObject(bucket, key);
      if (!bytes) return null;
      return {
        size: bytes.byteLength,
        etag: sha256Hex(bytes),
        contentType: "application/octet-stream",
      };
    },

    async deleteObject(bucket, key) {
      return disk.deleteObject(bucket, key);
    },

    async presign(request: PresignRequest): Promise<PresignResult> {
      if (!isValidBlobBucket(request.bucket) || !isValidBlobKey(request.key)) {
        throw new Error("invalid bucket or key");
      }
      const method = request.intent === "upload" ? "PUT" : "GET";
      const expiresAt = Date.now() + request.expiresInSeconds * 1000;
      const url = buildLocalSignedUrl({
        baseUrl: options.publicBaseUrl,
        secret: options.hmacSecret,
        params: {
          bucket: request.bucket,
          key: request.key,
          method,
          expiresAt,
          contentType: request.contentType,
          uploadId: request.uploadId,
          partNumber: request.partNumber,
        },
      });
      const headers: Record<string, string> = {};
      if (request.intent === "upload" && request.contentType) {
        headers["Content-Type"] = request.contentType;
      }
      return { url, method, headers, expiresAt };
    },

    async createMultipartUpload({ bucket, key, contentType }) {
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new Error("invalid bucket or key");
      }
      const uploadId = randomUUID();
      multipart.set(uploadId, {
        bucket,
        key,
        contentType,
        parts: new Map(),
      });
      await mkdir(path.join(multipartRoot, uploadId), { recursive: true });
      return { uploadId };
    },

    async completeMultipartUpload({ bucket, key, uploadId, parts }) {
      const state = multipart.get(uploadId);
      if (!state || state.bucket !== bucket || state.key !== key) {
        throw new Error("multipart upload not found");
      }
      const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
      const chunks: Buffer[] = [];
      for (const part of ordered) {
        const stored = state.parts.get(part.partNumber);
        if (!stored || stored.etag !== part.etag) {
          throw new Error(`missing or mismatched part ${part.partNumber}`);
        }
        chunks.push(await readFile(stored.path));
      }
      const bytes = Buffer.concat(chunks);
      const written = await disk.writeObject(bucket, key, bytes);
      await rm(path.join(multipartRoot, uploadId), {
        recursive: true,
        force: true,
      });
      multipart.delete(uploadId);
      return written;
    },

    async abortMultipartUpload({ uploadId }) {
      multipart.delete(uploadId);
      await rm(path.join(multipartRoot, uploadId), {
        recursive: true,
        force: true,
      });
    },
  };

  /** Used by the signed-upload route to accept a multipart part body. */
  (adapter as JordStoragePort & { writeMultipartPart?: typeof writePart }).writeMultipartPart =
    writePart;

  return adapter;
}

export async function listLocalObjectPaths(
  root: string,
): Promise<Array<{ bucket: string; key: string; absPath: string }>> {
  const absRoot = path.resolve(root);
  const out: Array<{ bucket: string; key: string; absPath: string }> = [];

  async function walk(dir: string, relParts: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return;
      throw err;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(next, [...relParts, entry.name]);
      } else if (entry.isFile() && relParts.length >= 1) {
        const bucket = relParts[0]!;
        const keyParts = [...relParts.slice(1), entry.name];
        const key = keyParts.join("/");
        if (isValidBlobBucket(bucket) && isValidBlobKey(key)) {
          out.push({ bucket, key, absPath: next });
        }
      }
    }
  }

  await walk(absRoot, []);
  return out.sort((a, b) =>
    a.bucket === b.bucket
      ? a.key.localeCompare(b.key)
      : a.bucket.localeCompare(b.bucket),
  );
}
