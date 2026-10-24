import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isValidBlobBucket, isValidBlobKey } from "@altr/jord";

export type BlobDiskStore = {
  root: string;
  ensureBucketDir(bucket: string): Promise<string>;
  objectPath(bucket: string, key: string): string;
  writeObject(
    bucket: string,
    key: string,
    bytes: Uint8Array,
  ): Promise<{ size: number; etag: string }>;
  readObject(bucket: string, key: string): Promise<Buffer | null>;
  deleteObject(bucket: string, key: string): Promise<boolean>;
};

export function resolveBlobsRoot(
  env: NodeJS.ProcessEnv = process.env,
  override?: string,
): string {
  if (override && override.trim()) {
    return path.resolve(override.trim());
  }
  const fromEnv = env.JORD_BLOBS_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "data", "blobs");
}

export function createBlobDiskStore(root: string): BlobDiskStore {
  const absRoot = path.resolve(root);

  function objectPath(bucket: string, key: string): string {
    if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
      throw new Error("invalid blob path");
    }
    const full = path.resolve(absRoot, bucket, ...key.split("/"));
    const rel = path.relative(absRoot, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("blob path escapes root");
    }
    return full;
  }

  return {
    root: absRoot,
    objectPath,
    async ensureBucketDir(bucket: string): Promise<string> {
      if (!isValidBlobBucket(bucket)) {
        throw new Error("invalid bucket");
      }
      const dir = path.join(absRoot, bucket);
      await mkdir(dir, { recursive: true });
      return dir;
    },
    async writeObject(bucket, key, bytes) {
      const dest = objectPath(bucket, key);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
      const etag = createHash("sha256").update(bytes).digest("hex");
      return { size: bytes.byteLength, etag };
    },
    async readObject(bucket, key) {
      try {
        return await readFile(objectPath(bucket, key));
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return null;
        throw err;
      }
    },
    async deleteObject(bucket, key) {
      try {
        await rm(objectPath(bucket, key), { force: false });
        return true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return false;
        throw err;
      }
    },
  };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
