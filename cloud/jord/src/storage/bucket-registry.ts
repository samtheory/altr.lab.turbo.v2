import { randomUUID } from "node:crypto";

import {
  isValidBlobBucket,
  type JordBucketProvider,
  type JordBucketStatus,
  type JordDriverPort,
  JORD_BUCKET_PROVIDERS,
  JORD_BUCKET_STATUSES,
} from "@altr/jord";

import { resolveStorageBackend } from "./factory.js";
import { resolveMaxBlobBytes } from "./ttl.js";

export type BucketRegistryRow = {
  id: string;
  name: string;
  provider: JordBucketProvider;
  endpoint: string | null;
  region: string | null;
  physicalBucket: string | null;
  keyPrefix: string | null;
  forcePathStyle: boolean;
  accessKeySealed: string | null;
  secretKeySealed: string | null;
  sessionTokenSealed: string | null;
  publicRead: boolean;
  maxObjectBytes: number | null;
  allowedMimeTypes: string[] | null;
  signTtlSeconds: number | null;
  status: JordBucketStatus;
  linkedTable: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  lastWriteAt: number | null;
};

export type BucketLimits = {
  maxObjectBytes: number;
  allowedMimeTypes: string[] | null;
  /** Preferred default TTL before request clamp (seconds). */
  signTtlSeconds: number | null;
};

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value);
  return s.length > 0 ? s : null;
}

function asInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }
  return false;
}

function parseMimeList(raw: unknown): string[] | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return null;
    const list = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

function isProvider(value: unknown): value is JordBucketProvider {
  return (
    typeof value === "string" &&
    (JORD_BUCKET_PROVIDERS as readonly string[]).includes(value)
  );
}

function isStatus(value: unknown): value is JordBucketStatus {
  return (
    typeof value === "string" &&
    (JORD_BUCKET_STATUSES as readonly string[]).includes(value)
  );
}

function mapRow(row: Record<string, unknown>): BucketRegistryRow {
  const providerRaw = row.provider;
  const statusRaw = row.status;
  return {
    id: String(row.id),
    name: String(row.name),
    provider: isProvider(providerRaw) ? providerRaw : "local",
    endpoint: asString(row.endpoint),
    region: asString(row.region),
    physicalBucket: asString(row.physical_bucket),
    keyPrefix: asString(row.key_prefix),
    forcePathStyle: asBool(row.force_path_style),
    accessKeySealed: asString(row.access_key_sealed),
    secretKeySealed: asString(row.secret_key_sealed),
    sessionTokenSealed: asString(row.session_token_sealed),
    publicRead: asBool(row.public_read),
    maxObjectBytes: asInt(row.max_object_bytes),
    allowedMimeTypes: parseMimeList(row.allowed_mime_types),
    signTtlSeconds: asInt(row.sign_ttl_seconds),
    status: isStatus(statusRaw) ? statusRaw : "active",
    linkedTable: asString(row.linked_table),
    createdBy: asString(row.created_by),
    createdAt: asInt(row.created_at) ?? 0,
    updatedAt: asInt(row.updated_at) ?? 0,
    lastWriteAt: asInt(row.last_write_at),
  };
}

export function providerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): JordBucketProvider {
  const raw = (env.JORD_STORAGE_BACKEND ?? "local").trim().toLowerCase();
  if (raw === "r2") return "r2";
  if (raw === "minio") return "minio";
  if (raw === "s3-compatible") return "s3-compatible";
  if (raw === "s3") return "s3";
  return "local";
}

export function connectionFieldsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Pick<
  BucketRegistryRow,
  | "endpoint"
  | "region"
  | "physicalBucket"
  | "keyPrefix"
  | "forcePathStyle"
> {
  const backend = resolveStorageBackend(env);
  if (backend !== "s3") {
    return {
      endpoint: null,
      region: null,
      physicalBucket: null,
      keyPrefix: null,
      forcePathStyle: false,
    };
  }
  return {
    endpoint: env.JORD_S3_ENDPOINT?.trim() || null,
    region: env.JORD_S3_REGION?.trim() || null,
    physicalBucket: env.JORD_S3_BUCKET?.trim() || null,
    keyPrefix: env.JORD_S3_PREFIX?.trim() || null,
    forcePathStyle:
      env.JORD_S3_FORCE_PATH_STYLE === "1" ||
      env.JORD_S3_FORCE_PATH_STYLE === "true",
  };
}

export async function getBucketRow(
  jord: JordDriverPort,
  name: string,
): Promise<BucketRegistryRow | null> {
  const rows = await jord.query(
    `SELECT * FROM jord_buckets WHERE name = ${ph(jord, 1)} LIMIT 1`,
    [name],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function listBucketRows(
  jord: JordDriverPort,
): Promise<BucketRegistryRow[]> {
  const rows = await jord.query(
    `SELECT * FROM jord_buckets ORDER BY name ASC`,
  );
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export type MaterializeBucketInput = {
  jord: JordDriverPort;
  name: string;
  env?: NodeJS.ProcessEnv;
  createdBy?: string | null;
  /** Override provider (defaults to env backend). */
  provider?: JordBucketProvider;
  maxObjectBytes?: number | null;
  allowedMimeTypes?: string[] | null;
  signTtlSeconds?: number | null;
  endpoint?: string | null;
  region?: string | null;
  physicalBucket?: string | null;
  keyPrefix?: string | null;
  forcePathStyle?: boolean;
  status?: JordBucketStatus;
  linkedTable?: string | null;
};

/**
 * Insert a registry row for `name` using env defaults when fields are omitted.
 * Idempotent: returns the existing row when present.
 */
export async function materializeBucketRow(
  input: MaterializeBucketInput,
): Promise<BucketRegistryRow> {
  const name = input.name.trim();
  if (!isValidBlobBucket(name)) {
    throw new Error("invalid bucket name");
  }
  const existing = await getBucketRow(input.jord, name);
  if (existing) return existing;

  const env = input.env ?? process.env;
  const now = Date.now();
  const provider = input.provider ?? providerFromEnv(env);
  const conn = connectionFieldsFromEnv(env);
  const id = randomUUID();
  const mimeJson =
    input.allowedMimeTypes && input.allowedMimeTypes.length > 0
      ? JSON.stringify(input.allowedMimeTypes)
      : null;

  await input.jord.query(
    `INSERT INTO jord_buckets (
      id, name, provider, endpoint, region, physical_bucket, key_prefix,
      force_path_style, access_key_sealed, secret_key_sealed, session_token_sealed,
      public_read, max_object_bytes, allowed_mime_types, sign_ttl_seconds,
      status, linked_table, created_by, created_at, updated_at, last_write_at
    ) VALUES (
      ${ph(input.jord, 1)}, ${ph(input.jord, 2)}, ${ph(input.jord, 3)},
      ${ph(input.jord, 4)}, ${ph(input.jord, 5)}, ${ph(input.jord, 6)},
      ${ph(input.jord, 7)}, ${ph(input.jord, 8)}, NULL, NULL, NULL,
      0, ${ph(input.jord, 9)}, ${ph(input.jord, 10)}, ${ph(input.jord, 11)},
      ${ph(input.jord, 12)}, ${ph(input.jord, 13)}, ${ph(input.jord, 14)},
      ${ph(input.jord, 15)}, ${ph(input.jord, 16)}, NULL
    )`,
    [
      id,
      name,
      provider,
      input.endpoint ?? conn.endpoint,
      input.region ?? conn.region,
      input.physicalBucket ?? conn.physicalBucket,
      input.keyPrefix ?? conn.keyPrefix,
      (input.forcePathStyle ?? conn.forcePathStyle) ? 1 : 0,
      input.maxObjectBytes ?? null,
      mimeJson,
      input.signTtlSeconds ?? null,
      input.status ?? "active",
      input.linkedTable ?? null,
      input.createdBy ?? null,
      now,
      now,
    ],
  );

  const created = await getBucketRow(input.jord, name);
  if (!created) throw new Error("failed to materialize jord_buckets row");
  return created;
}

export function limitsFromBucketRow(
  row: BucketRegistryRow | null,
  env: NodeJS.ProcessEnv = process.env,
  envMaxBytes?: number,
): BucketLimits {
  return {
    maxObjectBytes:
      row?.maxObjectBytes != null && row.maxObjectBytes > 0
        ? row.maxObjectBytes
        : resolveMaxBlobBytes(env, envMaxBytes),
    allowedMimeTypes: row?.allowedMimeTypes ?? null,
    signTtlSeconds:
      row?.signTtlSeconds != null && row.signTtlSeconds > 0
        ? row.signTtlSeconds
        : null,
  };
}

export function portCacheKey(row: BucketRegistryRow): string {
  return [
    row.provider,
    row.endpoint ?? "",
    row.region ?? "",
    row.physicalBucket ?? "",
    row.keyPrefix ?? "",
    row.forcePathStyle ? "1" : "0",
    row.accessKeySealed ?? "",
    row.secretKeySealed ?? "",
    row.sessionTokenSealed ?? "",
  ].join("\0");
}
