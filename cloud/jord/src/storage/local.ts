import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { once } from "node:events";
import { finished } from "node:stream/promises";
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

/** Hard bounds for one part body (S0081). S3 allows 10 000 parts. */
export const MAX_MULTIPART_PART_NUMBER = 10_000;
export const MAX_LOCAL_PART_BYTES = 256 * 1024 * 1024;

const UPLOAD_ID_RE = /^[A-Za-z0-9-]{8,128}$/;

type PartFileInfo = { partNumber: number; size: number; etag: string };

/**
 * Local disk adapter. Presign returns HMAC URLs with the same PresignResult
 * shape as S3 so clients do not branch on backend kind.
 *
 * Multipart state lives on disk under `.multipart/<uploadId>/` so an upload
 * survives a server restart (S0081): `meta.json` binds bucket + key, each part
 * is `part-N` with an `part-N.etag` sidecar.
 */
export function createLocalStorageAdapter(
  options: LocalStorageAdapterOptions,
): JordStoragePort & { disk: BlobDiskStore; root: string } {
  const disk = options.disk ?? createBlobDiskStore(options.root);
  const multipartRoot = path.join(disk.root, ".multipart");

  function uploadDir(uploadId: string): string {
    if (!UPLOAD_ID_RE.test(uploadId)) {
      throw new Error("invalid upload id");
    }
    return path.join(multipartRoot, uploadId);
  }

  type Meta = {
    bucket: string;
    key: string;
    contentType: string;
    totalSize?: number;
    partSize?: number;
  };

  async function readMeta(uploadId: string): Promise<Meta | null> {
    try {
      const raw = await readFile(path.join(uploadDir(uploadId), "meta.json"), "utf8");
      return JSON.parse(raw) as Meta;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  function expectedFor(meta: Meta, partNumber: number): number | null {
    const { totalSize, partSize } = meta;
    if (!totalSize || !partSize) return null;
    const count = Math.ceil(totalSize / partSize);
    if (partNumber > count) return null;
    return partNumber < count ? partSize : totalSize - partSize * (count - 1);
  }

  async function* chunksOf(
    body: Uint8Array | ReadableStream<Uint8Array> | null,
  ): AsyncGenerator<Uint8Array> {
    if (!body) return;
    if (body instanceof Uint8Array) {
      yield body;
      return;
    }
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        if (value) yield value;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  async function writePart(
    uploadId: string,
    partNumber: number,
    body: Uint8Array | ReadableStream<Uint8Array> | null,
  ): Promise<PutObjectResult> {
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > MAX_MULTIPART_PART_NUMBER
    ) {
      throw new Error("invalid part number");
    }
    const dir = uploadDir(uploadId);
    const meta = await readMeta(uploadId);
    if (!meta) throw new Error("multipart upload not found");
    const expected = expectedFor(meta, partNumber);
    if (expected === null || expected > MAX_LOCAL_PART_BYTES) {
      throw new Error("invalid part number");
    }
    const final = path.join(dir, `part-${partNumber}`);
    const tmp = `${final}.${randomUUID()}.tmp`;
    const hash = createHash("sha256");
    let size = 0;
    const out = createWriteStream(tmp, { mode: 0o600 });
    try {
      for await (const chunk of chunksOf(body)) {
        size += chunk.byteLength;
        if (size > expected) {
          throw new Error("part too large");
        }
        hash.update(chunk);
        if (!out.write(chunk)) await once(out, "drain");
      }
      out.end();
      await finished(out);
      if (size !== expected) throw new Error("part size mismatch");
      await rename(tmp, final);
    } catch (err) {
      if (!out.closed) {
        out.destroy();
        await once(out, "close").catch(() => undefined);
      }
      await rm(tmp, { force: true }).catch(() => undefined);
      throw err;
    }
    const etag = hash.digest("hex");
    await writeFile(`${final}.etag`, etag, { mode: 0o600 });
    return { size, etag };
  }

  async function listParts(uploadId: string): Promise<PartFileInfo[]> {
    const dir = uploadDir(uploadId);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const out: PartFileInfo[] = [];
    for (const name of names) {
      const m = /^part-(\d+)$/.exec(name);
      if (!m) continue;
      const partNumber = Number(m[1]);
      const file = path.join(dir, name);
      const st = await stat(file);
      let etag: string;
      try {
        etag = (await readFile(`${file}.etag`, "utf8")).trim();
      } catch {
        etag = sha256Hex(await readFile(file));
      }
      out.push({ partNumber, size: st.size, etag });
    }
    return out.sort((a, b) => a.partNumber - b.partNumber);
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

    async createMultipartUpload({ bucket, key, contentType, totalSize, partSize }) {
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new Error("invalid bucket or key");
      }
      const uploadId = randomUUID();
      const dir = uploadDir(uploadId);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(
        path.join(dir, "meta.json"),
        JSON.stringify({ bucket, key, contentType, totalSize, partSize }),
        { mode: 0o600 },
      );
      return { uploadId };
    },

    async listMultipartParts({ bucket, key, uploadId }) {
      const meta = await readMeta(uploadId);
      if (!meta || meta.bucket !== bucket || meta.key !== key) return [];
      return listParts(uploadId);
    },

    async completeMultipartUpload({ bucket, key, uploadId, parts }) {
      const meta = await readMeta(uploadId);
      if (!meta || meta.bucket !== bucket || meta.key !== key) {
        throw new Error("multipart upload not found");
      }
      const onDisk = new Map(
        (await listParts(uploadId)).map((p) => [p.partNumber, p]),
      );
      const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
      for (const part of ordered) {
        const stored = onDisk.get(part.partNumber);
        if (!stored || stored.etag !== part.etag) {
          throw new Error(`missing or mismatched part ${part.partNumber}`);
        }
      }
      // Stream parts into a temp file so large objects never sit in memory.
      const dest = disk.objectPath(bucket, key);
      await mkdir(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.${randomUUID()}.tmp`;
      const hash = createHash("sha256");
      let size = 0;
      try {
        const out = createWriteStream(tmp);
        for (const part of ordered) {
          const src = createReadStream(
            path.join(uploadDir(uploadId), `part-${part.partNumber}`),
          );
          for await (const chunk of src) {
            const buf = chunk as Buffer;
            hash.update(buf);
            size += buf.byteLength;
            if (!out.write(buf)) await once(out, "drain");
          }
        }
        out.end();
        await finished(out);
        await rename(tmp, dest);
      } catch (err) {
        await rm(tmp, { force: true }).catch(() => undefined);
        throw err;
      }
      await rm(uploadDir(uploadId), { recursive: true, force: true });
      return { size, etag: hash.digest("hex") };
    },

    async abortMultipartUpload({ uploadId }) {
      await rm(uploadDir(uploadId), { recursive: true, force: true });
    },
  };

  /** Used by the signed-upload route to accept a multipart part body. */
  adapter.writeMultipartPart = writePart;

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
