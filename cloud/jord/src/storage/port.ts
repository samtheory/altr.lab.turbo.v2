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
  /** Exact byte length of this part; S3 signs it as content-length. */
  partBytes?: number;
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
  /**
   * Resolves true if bytes were removed, false if already absent (not a
   * failure). Throws on a real storage failure; callers must not treat a
   * throw as "gone".
   */
  deleteObject(bucket: string, key: string): Promise<boolean>;
  /** Issue a short-lived upload or download URL. */
  presign(request: PresignRequest): Promise<PresignResult>;
  createMultipartUpload?(input: {
    bucket: string;
    key: string;
    contentType: string;
    /** Declared sizes, enforced per part by the local adapter. */
    totalSize?: number;
    partSize?: number;
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
  /**
   * Local adapter only: accept one part body from a signed PUT. The body is
   * streamed with a hard cap at the part's expected size (recorded at create).
   */
  writeMultipartPart?(
    uploadId: string,
    partNumber: number,
    body: Uint8Array | ReadableStream<Uint8Array> | null,
  ): Promise<PutObjectResult>;
  /** Parts the store has received so far (S0081 resume / complete verify). */
  listMultipartParts?(input: {
    bucket: string;
    key: string;
    uploadId: string;
  }): Promise<MultipartPartInfo[]>;
};

export type MultipartPartInfo = {
  partNumber: number;
  size: number;
  etag: string;
};
