import {
  createLocalStorageAdapter,
  type LocalStorageAdapterOptions,
} from "./local.js";
import type { HmacSecret } from "./hmac.js";
import type { JordStoragePort, StorageBackendKind } from "./port.js";
import {
  createS3StorageAdapter,
  type S3StorageAdapterOptions,
} from "./s3.js";

export type StorageFactoryInput = {
  env?: NodeJS.ProcessEnv;
  blobsRoot: string;
  hmacSecret: HmacSecret;
  publicBaseUrl: string;
  /** Test override. */
  kind?: StorageBackendKind;
  s3?: Partial<S3StorageAdapterOptions>;
  local?: Partial<LocalStorageAdapterOptions>;
};

export function resolveStorageBackend(
  env: NodeJS.ProcessEnv = process.env,
): StorageBackendKind {
  const raw = (env.JORD_STORAGE_BACKEND ?? "local").trim().toLowerCase();
  if (raw === "s3" || raw === "r2" || raw === "minio") return "s3";
  return "local";
}

export function resolvePublicBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = env.JORD_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = env.PORT?.trim() || "8787";
  return `http://127.0.0.1:${port}`;
}

export function resolveHmacSecret(
  env: NodeJS.ProcessEnv = process.env,
  fallback?: string,
): string {
  const dedicated = env.JORD_BLOB_SIGNING_SECRET?.trim();
  if (dedicated) return dedicated;
  if (fallback && fallback.length > 0) return fallback;
  const token = env.JORD_SERVER_TOKEN?.trim();
  if (token) return token;
  throw new Error(
    "[@altr/jord-server] blob signing requires JORD_BLOB_SIGNING_SECRET or JORD_SERVER_TOKEN",
  );
}

export function createStorageFromEnv(
  input: StorageFactoryInput,
): JordStoragePort {
  const env = input.env ?? process.env;
  const kind = input.kind ?? resolveStorageBackend(env);

  if (kind === "s3") {
    const physicalBucket =
      input.s3?.physicalBucket ??
      env.JORD_S3_BUCKET?.trim() ??
      "";
    if (!physicalBucket) {
      throw new Error(
        "[@altr/jord-server] JORD_STORAGE_BACKEND=s3 requires JORD_S3_BUCKET",
      );
    }
    return createS3StorageAdapter({
      physicalBucket,
      endpoint: input.s3?.endpoint ?? env.JORD_S3_ENDPOINT?.trim(),
      region: input.s3?.region ?? env.JORD_S3_REGION?.trim() ?? "auto",
      accessKeyId:
        input.s3?.accessKeyId ?? env.JORD_S3_ACCESS_KEY_ID?.trim(),
      secretAccessKey:
        input.s3?.secretAccessKey ?? env.JORD_S3_SECRET_ACCESS_KEY?.trim(),
      forcePathStyle:
        input.s3?.forcePathStyle ??
        (env.JORD_S3_FORCE_PATH_STYLE === "1" ||
          env.JORD_S3_FORCE_PATH_STYLE === "true"),
      bucketPrefix: input.s3?.bucketPrefix ?? env.JORD_S3_PREFIX?.trim(),
      client: input.s3?.client,
    });
  }

  return createLocalStorageAdapter({
    root: input.local?.root ?? input.blobsRoot,
    hmacSecret: input.local?.hmacSecret ?? input.hmacSecret,
    publicBaseUrl: input.local?.publicBaseUrl ?? input.publicBaseUrl,
    disk: input.local?.disk,
  });
}
