/** Object-byte storage port (S0025). Metadata stays on JordDriverPort / jord_blobs. */

export type StorageBackendKind = "local" | "s3";

export type SignedUrlIntent = "upload" | "download";

export type PresignRequest = {
  bucket: string;
  key: string;
  intent: SignedUrlIntent;
  contentType?: string;
  /** Already clamped TTL in seconds. */
  expiresInSeconds: number;
  uploadId?: string;
  partNumber?: number;
};

/**
 * Shared client shape for local HMAC and S3 presign.
 * Callers PUT/GET `url` with `headers`; no adapter-specific branches.
 */
export type PresignResult = {
  url: string;
  method: "GET" | "PUT";
  headers: Record<string, string>;
  expiresAt: number;
};

export type PutObjectResult = {
  size: number;
  etag: string;
};

export type HeadObjectResult = {
  size: number;
  etag: string;
  contentType: string;
};

export type JordStoragePort = {
  readonly kind: StorageBackendKind;
  ensureBucket(bucket: string): Promise<void>;
  putObject(
    bucket: string,
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<PutObjectResult>;
  getObject(bucket: string, key: string): Promise<Buffer | null>;
  headObject(bucket: string, key: string): Promise<HeadObjectResult | null>;
  deleteObject(bucket: string, key: string): Promise<boolean>;
  /** Issue a short-lived upload or download URL. */
  presign(request: PresignRequest): Promise<PresignResult>;
  createMultipartUpload?(input: {
    bucket: string;
    key: string;
    contentType: string;
  }): Promise<{ uploadId: string }>;
  completeMultipartUpload?(input: {
    bucket: string;
    key: string;
    uploadId: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }): Promise<PutObjectResult>;
  abortMultipartUpload?(input: {
    bucket: string;
    key: string;
    uploadId: string;
  }): Promise<void>;
};
