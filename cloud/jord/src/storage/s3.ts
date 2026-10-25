import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { isValidBlobBucket, isValidBlobKey } from "@altr/jord";

import { sha256Hex } from "../blobs/disk.js";
import type {
  HeadObjectResult,
  JordStoragePort,
  PresignRequest,
  PresignResult,
  PutObjectResult,
} from "./port.js";

export type S3StorageAdapterOptions = {
  client?: S3Client;
  bucketPrefix?: string;
  /** When set, objects are stored under `${bucketPrefix}/${jordBucket}/${key}`. */
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  /** Physical S3/R2/MinIO bucket name (one bucket; Jord buckets are key prefixes). */
  physicalBucket: string;
};

function objectKey(
  jordBucket: string,
  key: string,
  prefix?: string,
): string {
  const base = `${jordBucket}/${key}`;
  if (!prefix || prefix.trim() === "") return base;
  return `${prefix.replace(/\/$/, "")}/${base}`;
}

export function createS3ClientFromOptions(
  options: S3StorageAdapterOptions,
): S3Client {
  if (options.client) return options.client;
  const config: S3ClientConfig = {
    region: options.region ?? "auto",
    forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
  };
  if (options.endpoint) {
    config.endpoint = options.endpoint;
  }
  if (options.accessKeyId && options.secretAccessKey) {
    config.credentials = {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    };
  }
  return new S3Client(config);
}

export function createS3StorageAdapter(
  options: S3StorageAdapterOptions,
): JordStoragePort {
  const client = createS3ClientFromOptions(options);
  const physicalBucket = options.physicalBucket;
  const prefix = options.bucketPrefix;

  return {
    kind: "s3",

    async ensureBucket(_bucket) {
      // Jord buckets are key prefixes inside one physical bucket.
    },

    async putObject(bucket, key, bytes, contentType): Promise<PutObjectResult> {
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new Error("invalid bucket or key");
      }
      const etag = sha256Hex(bytes);
      await client.send(
        new PutObjectCommand({
          Bucket: physicalBucket,
          Key: objectKey(bucket, key, prefix),
          Body: bytes,
          ContentType: contentType,
          Metadata: { jord_etag: etag },
        }),
      );
      return { size: bytes.byteLength, etag };
    },

    async getObject(bucket, key) {
      if (!isValidBlobBucket(bucket) || !isValidBlobKey(key)) {
        throw new Error("invalid bucket or key");
      }
      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: physicalBucket,
            Key: objectKey(bucket, key, prefix),
          }),
        );
        if (!result.Body) return null;
        const bytes = await result.Body.transformToByteArray();
        return Buffer.from(bytes);
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === "NoSuchKey" || name === "NotFound") return null;
        throw err;
      }
    },

    async headObject(bucket, key): Promise<HeadObjectResult | null> {
      try {
        const result = await client.send(
          new HeadObjectCommand({
            Bucket: physicalBucket,
            Key: objectKey(bucket, key, prefix),
          }),
        );
        return {
          size: result.ContentLength ?? 0,
          etag: (result.Metadata?.jord_etag ?? result.ETag ?? "").replace(
            /"/g,
            "",
          ),
          contentType: result.ContentType ?? "application/octet-stream",
        };
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === "NotFound" || name === "NoSuchKey") return null;
        throw err;
      }
    },

    async deleteObject(bucket, key) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: physicalBucket,
            Key: objectKey(bucket, key, prefix),
          }),
        );
        return true;
      } catch {
        return false;
      }
    },

    async presign(request: PresignRequest): Promise<PresignResult> {
      if (
        !isValidBlobBucket(request.bucket) ||
        !isValidBlobKey(request.key)
      ) {
        throw new Error("invalid bucket or key");
      }
      const key = objectKey(request.bucket, request.key, prefix);
      const expiresAt = Date.now() + request.expiresInSeconds * 1000;
      if (request.intent === "download") {
        const command = new GetObjectCommand({
          Bucket: physicalBucket,
          Key: key,
        });
        const url = await getSignedUrl(client, command, {
          expiresIn: request.expiresInSeconds,
        });
        return { url, method: "GET", headers: {}, expiresAt };
      }
      const command = new PutObjectCommand({
        Bucket: physicalBucket,
        Key: key,
        ContentType: request.contentType,
      });
      const url = await getSignedUrl(client, command, {
        expiresIn: request.expiresInSeconds,
      });
      const headers: Record<string, string> = {};
      if (request.contentType) {
        headers["Content-Type"] = request.contentType;
      }
      return { url, method: "PUT", headers, expiresAt };
    },

    async createMultipartUpload({ bucket, key, contentType }) {
      const result = await client.send(
        new CreateMultipartUploadCommand({
          Bucket: physicalBucket,
          Key: objectKey(bucket, key, prefix),
          ContentType: contentType,
        }),
      );
      if (!result.UploadId) throw new Error("S3 multipart create failed");
      return { uploadId: result.UploadId };
    },

    async completeMultipartUpload({ bucket, key, uploadId, parts }) {
      const result = await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: physicalBucket,
          Key: objectKey(bucket, key, prefix),
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((p) => ({
              ETag: p.etag,
              PartNumber: p.partNumber,
            })),
          },
        }),
      );
      const etag = (result.ETag ?? "").replace(/"/g, "");
      const head = await this.headObject(bucket, key);
      return { etag, size: head?.size ?? 0 };
    },

    async abortMultipartUpload({ bucket, key, uploadId }) {
      await client.send(
        new AbortMultipartUploadCommand({
          Bucket: physicalBucket,
          Key: objectKey(bucket, key, prefix),
          UploadId: uploadId,
        }),
      );
    },
  };
}
