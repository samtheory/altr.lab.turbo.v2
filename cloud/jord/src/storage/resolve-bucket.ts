import type {
  JordBucketProvider,
  JordDriverPort,
  SecretPort,
} from "@altr/jord";

import {
  getBucketRow,
  limitsFromBucketRow,
  portCacheKey,
  type BucketLimits,
  type BucketRegistryRow,
} from "./bucket-registry.js";
import { credentialsFromBucketRow } from "./bucket-admin.js";
import {
  createLocalStorageAdapter,
  type LocalStorageAdapterOptions,
} from "./local.js";
import type { JordStoragePort } from "./port.js";
import {
  createS3StorageAdapter,
  type S3StorageAdapterOptions,
} from "./s3.js";
import type { StorageFactoryInput } from "./factory.js";
import { createStorageFromEnv } from "./factory.js";

export type ResolvedBucket = {
  name: string;
  row: BucketRegistryRow | null;
  port: JordStoragePort;
  limits: BucketLimits;
  source: "registry" | "env";
};

export type CreatePortFromBucketConfig = (
  row: BucketRegistryRow,
) => JordStoragePort | null | undefined;

export type BucketResolverOptions = {
  jord: JordDriverPort;
  /** Env-backed default port (no registry row). */
  envPort: JordStoragePort;
  env?: NodeJS.ProcessEnv;
  /** Global max used when the row has no max_object_bytes. */
  envMaxBytes?: number;
  /** Factory inputs for building ports from registry rows. */
  factory: StorageFactoryInput;
  /** Unseals per-bucket credentials when present (S0067). */
  secrets?: SecretPort | null;
  /**
   * Test / advanced override. Return a port to short-circuit adapter creation,
   * or null/undefined to use the default builder.
   */
  createPort?: CreatePortFromBucketConfig;
};

export type BucketResolver = {
  resolveBucket(name: string): Promise<ResolvedBucket>;
  /** Drop cached ports (tests / credential rotation). */
  clearPortCache(): void;
  /** Cache size for tests. */
  portCacheSize(): number;
};

function isS3Family(provider: JordBucketProvider): boolean {
  return (
    provider === "s3" ||
    provider === "r2" ||
    provider === "minio" ||
    provider === "s3-compatible"
  );
}

function buildPortFromRow(
  row: BucketRegistryRow,
  factory: StorageFactoryInput,
  secrets: SecretPort | null | undefined,
): JordStoragePort {
  if (!isS3Family(row.provider)) {
    const localOpts: LocalStorageAdapterOptions = {
      root: factory.local?.root ?? factory.blobsRoot,
      hmacSecret: factory.local?.hmacSecret ?? factory.hmacSecret,
      publicBaseUrl: factory.local?.publicBaseUrl ?? factory.publicBaseUrl,
      disk: factory.local?.disk,
    };
    return createLocalStorageAdapter(localOpts);
  }

  const env = factory.env ?? process.env;
  const physicalBucket =
    row.physicalBucket ??
    factory.s3?.physicalBucket ??
    env.JORD_S3_BUCKET?.trim() ??
    "";
  if (!physicalBucket) {
    throw new Error(
      `[@altr/jord-server] bucket "${row.name}" provider ${row.provider} requires physical_bucket or JORD_S3_BUCKET`,
    );
  }

  const fromRow = credentialsFromBucketRow(row, secrets ?? null);

  const s3Opts: S3StorageAdapterOptions = {
    physicalBucket,
    endpoint: row.endpoint ?? factory.s3?.endpoint ?? env.JORD_S3_ENDPOINT?.trim(),
    region:
      row.region ?? factory.s3?.region ?? env.JORD_S3_REGION?.trim() ?? "auto",
    accessKeyId:
      fromRow.accessKeyId ??
      factory.s3?.accessKeyId ??
      env.JORD_S3_ACCESS_KEY_ID?.trim(),
    secretAccessKey:
      fromRow.secretAccessKey ??
      factory.s3?.secretAccessKey ??
      env.JORD_S3_SECRET_ACCESS_KEY?.trim(),
    sessionToken: fromRow.sessionToken,
    forcePathStyle:
      row.forcePathStyle ||
      factory.s3?.forcePathStyle ||
      env.JORD_S3_FORCE_PATH_STYLE === "1" ||
      env.JORD_S3_FORCE_PATH_STYLE === "true" ||
      row.provider === "minio",
    bucketPrefix:
      row.keyPrefix ?? factory.s3?.bucketPrefix ?? env.JORD_S3_PREFIX?.trim(),
    client: factory.s3?.client,
  };
  return createS3StorageAdapter(s3Opts);
}

export function createBucketResolver(
  options: BucketResolverOptions,
): BucketResolver {
  const env = options.env ?? process.env;
  const portCache = new Map<string, JordStoragePort>();

  return {
    clearPortCache() {
      portCache.clear();
    },
    portCacheSize() {
      return portCache.size;
    },
    async resolveBucket(name: string): Promise<ResolvedBucket> {
      const row = await getBucketRow(options.jord, name);
      if (!row) {
        return {
          name,
          row: null,
          port: options.envPort,
          limits: limitsFromBucketRow(null, env, options.envMaxBytes),
          source: "env",
        };
      }

      const cacheKey = portCacheKey(row);
      let port = portCache.get(cacheKey);
      if (!port) {
        const overridden = options.createPort?.(row);
        port =
          overridden ??
          buildPortFromRow(row, options.factory, options.secrets);
        portCache.set(cacheKey, port);
      }

      return {
        name,
        row,
        port,
        limits: limitsFromBucketRow(row, env, options.envMaxBytes),
        source: "registry",
      };
    },
  };
}

/** Convenience for jobs that only have env today. */
export function createEnvOnlyResolver(
  envPort: JordStoragePort,
  env: NodeJS.ProcessEnv = process.env,
  envMaxBytes?: number,
): Pick<BucketResolver, "resolveBucket"> {
  return {
    async resolveBucket(name: string) {
      return {
        name,
        row: null,
        port: envPort,
        limits: limitsFromBucketRow(null, env, envMaxBytes),
        source: "env" as const,
      };
    },
  };
}

export function createDefaultEnvPort(factory: StorageFactoryInput): JordStoragePort {
  return createStorageFromEnv(factory);
}
