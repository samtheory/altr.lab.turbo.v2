import { randomUUID } from "node:crypto";

import {
  isValidBlobBucket,
  type AesGcmSecretPort,
  type JordBucketProvider,
  type JordBucketStatus,
  type JordDriverPort,
  type SecretPort,
  JORD_BUCKET_PROVIDERS,
} from "@altr/jord";

import {
  getBucketRow,
  listBucketRows,
  type BucketRegistryRow,
} from "./bucket-registry.js";
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

const PROBE_TIMEOUT_MS = 8_000;
const PROBE_KEY = ".jord-probe";

export type BucketCredentialInput = {
  access_key?: string | null;
  secret_key?: string | null;
  session_token?: string | null;
};

export type BucketConnectionInput = {
  provider: JordBucketProvider;
  endpoint?: string | null;
  region?: string | null;
  physical_bucket?: string | null;
  key_prefix?: string | null;
  force_path_style?: boolean | null;
  public_read?: boolean | null;
  max_object_bytes?: number | null;
  allowed_mime_types?: string[] | null;
  sign_ttl_seconds?: number | null;
  linked_table?: string | null;
};

export type BucketCreateInput = BucketConnectionInput &
  BucketCredentialInput & {
    name: string;
  };

export type BucketPatchInput = Partial<
  Omit<BucketConnectionInput, "provider"> & { provider?: JordBucketProvider }
> &
  BucketCredentialInput;

export type BucketProbeInput = BucketConnectionInput &
  BucketCredentialInput & {
    name: string;
  };

export type BucketPublic = {
  id: string;
  name: string;
  provider: JordBucketProvider;
  endpoint: string | null;
  region: string | null;
  physical_bucket: string | null;
  key_prefix: string | null;
  force_path_style: boolean;
  public_read: boolean;
  max_object_bytes: number | null;
  allowed_mime_types: string[] | null;
  sign_ttl_seconds: number | null;
  status: JordBucketStatus;
  linked_table: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  last_write_at: number | null;
  configured: boolean;
  access_key_prefix: string | null;
  access_key_last4: string | null;
};

export type BucketAdminDeps = {
  jord: JordDriverPort;
  secrets: SecretPort | null;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  factory: StorageFactoryInput;
  /** Drop cached storage ports after credential / connection changes. */
  clearPortCache?: () => void;
  /** Override probe port construction (tests). */
  createProbePort?: (input: BucketProbeInput) => JordStoragePort;
  /** Override probe runner (tests). */
  runProbe?: (input: {
    port: JordStoragePort;
    bucket: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function requireSecretPort(secrets: SecretPort | null): SecretPort {
  if (!secrets) {
    throw new Error("JORD_MASTER_KEY is required for bucket credentials");
  }
  return secrets;
}

function asAes(secrets: SecretPort): AesGcmSecretPort {
  if (typeof (secrets as AesGcmSecretPort).peekSealed !== "function") {
    throw new Error("secret port must support peekSealed for bucket admin");
  }
  return secrets as AesGcmSecretPort;
}

function secretIds(bucketId: string) {
  return {
    access: `bucket:${bucketId}:access_key`,
    secret: `bucket:${bucketId}:secret_key`,
    session: `bucket:${bucketId}:session_token`,
  };
}

export function isS3FamilyProvider(provider: JordBucketProvider): boolean {
  return (
    provider === "s3" ||
    provider === "r2" ||
    provider === "minio" ||
    provider === "s3-compatible"
  );
}

export function parseBucketProvider(raw: unknown): JordBucketProvider | null {
  if (typeof raw !== "string") return null;
  return (JORD_BUCKET_PROVIDERS as readonly string[]).includes(raw)
    ? (raw as JordBucketProvider)
    : null;
}

export function accessKeyHints(accessKey: string | null | undefined): {
  access_key_prefix: string | null;
  access_key_last4: string | null;
} {
  const key = accessKey?.trim() ?? "";
  if (!key) {
    return { access_key_prefix: null, access_key_last4: null };
  }
  return {
    access_key_prefix: key.slice(0, Math.min(4, key.length)),
    access_key_last4: key.slice(-4),
  };
}

export function validateProviderConnection(
  input: BucketConnectionInput,
): string | null {
  const provider = input.provider;
  if (provider === "local") return null;

  const endpoint = input.endpoint?.trim() ?? "";
  const region = input.region?.trim() ?? "";
  const physical = input.physical_bucket?.trim() ?? "";

  if (provider === "minio" || provider === "s3-compatible") {
    if (!endpoint) return "endpoint is required for minio/s3-compatible";
    if (!physical) return "physical_bucket is required for minio/s3-compatible";
    return null;
  }

  if (provider === "s3" || provider === "r2") {
    if (!region) return "region is required for s3/r2";
    if (!physical) return "physical_bucket is required for s3/r2";
    if (provider === "r2" && !endpoint) {
      return "endpoint is required for r2";
    }
    return null;
  }

  return "unsupported provider";
}

export function validateCredentialsForProvider(
  provider: JordBucketProvider,
  creds: BucketCredentialInput,
  opts?: { required?: boolean },
): string | null {
  if (!isS3FamilyProvider(provider)) return null;
  const required = opts?.required !== false;
  const access = creds.access_key?.trim() ?? "";
  const secret = creds.secret_key?.trim() ?? "";
  if (!required && !access && !secret) return null;
  if (!access) return "access_key is required";
  if (!secret) return "secret_key is required";
  return null;
}

function defaultForcePathStyle(
  provider: JordBucketProvider,
  explicit: boolean | null | undefined,
): boolean {
  if (explicit != null) return explicit;
  return provider === "minio" || provider === "s3-compatible";
}

function mimeJson(list: string[] | null | undefined): string | null {
  if (!list || list.length === 0) return null;
  const cleaned = list
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

export function publicBucket(
  row: BucketRegistryRow,
  secrets: SecretPort | null,
): BucketPublic {
  let configured = Boolean(row.accessKeySealed && row.secretKeySealed);
  let hints = {
    access_key_prefix: null as string | null,
    access_key_last4: null as string | null,
  };
  if (configured && secrets && row.accessKeySealed) {
    try {
      hints = accessKeyHints(secrets.unseal(row.accessKeySealed));
    } catch {
      configured = false;
      hints = { access_key_prefix: null, access_key_last4: null };
    }
  }
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    endpoint: row.endpoint,
    region: row.region,
    physical_bucket: row.physicalBucket,
    key_prefix: row.keyPrefix,
    force_path_style: row.forcePathStyle,
    public_read: row.publicRead,
    max_object_bytes: row.maxObjectBytes,
    allowed_mime_types: row.allowedMimeTypes,
    sign_ttl_seconds: row.signTtlSeconds,
    status: row.status,
    linked_table: row.linkedTable,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    last_write_at: row.lastWriteAt,
    configured,
    access_key_prefix: hints.access_key_prefix,
    access_key_last4: hints.access_key_last4,
  };
}

/** Assert serialized JSON never contains credential material. */
export function assertNoBucketSecretsInJson(payload: unknown): void {
  const text = JSON.stringify(payload);
  const forbidden = [
    '"access_key"',
    '"secret_key"',
    '"session_token"',
    '"access_key_sealed"',
    '"secret_key_sealed"',
    '"session_token_sealed"',
    '"accessKeySealed"',
    '"secretKeySealed"',
    '"sessionTokenSealed"',
  ];
  for (const needle of forbidden) {
    if (text.includes(needle)) {
      throw new Error(`bucket response leaked credential field ${needle}`);
    }
  }
}

export function buildProbePort(
  input: BucketProbeInput,
  factory: StorageFactoryInput,
): JordStoragePort {
  if (input.provider === "local") {
    const localOpts: LocalStorageAdapterOptions = {
      root: factory.local?.root ?? factory.blobsRoot,
      hmacSecret: factory.local?.hmacSecret ?? factory.hmacSecret,
      publicBaseUrl: factory.local?.publicBaseUrl ?? factory.publicBaseUrl,
      disk: factory.local?.disk,
    };
    return createLocalStorageAdapter(localOpts);
  }

  const physical = input.physical_bucket?.trim() ?? "";
  const s3Opts: S3StorageAdapterOptions = {
    physicalBucket: physical,
    endpoint: input.endpoint?.trim() || undefined,
    region: input.region?.trim() || "auto",
    accessKeyId: input.access_key?.trim() || undefined,
    secretAccessKey: input.secret_key?.trim() || undefined,
    sessionToken: input.session_token?.trim() || undefined,
    forcePathStyle: defaultForcePathStyle(
      input.provider,
      input.force_path_style,
    ),
    bucketPrefix: input.key_prefix?.trim() || undefined,
  };
  return createS3StorageAdapter(s3Opts);
}

export async function probeBucketConnection(input: {
  port: JordStoragePort;
  bucket: string;
  timeoutMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const timeoutMs = input.timeoutMs ?? PROBE_TIMEOUT_MS;
  const key = `${PROBE_KEY}-${randomUUID().slice(0, 8)}`;
  const bytes = new TextEncoder().encode("jord-probe");

  const run = async () => {
    await input.port.ensureBucket(input.bucket);
    await input.port.putObject(
      input.bucket,
      key,
      bytes,
      "application/octet-stream",
    );
    const head = await input.port.headObject(input.bucket, key);
    if (!head) {
      throw new Error("probe object missing after put");
    }
    await input.port.deleteObject(input.bucket, key);
  };

  try {
    await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`probe timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    return { ok: true };
  } catch (err) {
    try {
      await input.port.deleteObject(input.bucket, key);
    } catch {
      // best-effort cleanup
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function sealCredentials(
  secrets: SecretPort,
  bucketId: string,
  creds: {
    access_key: string;
    secret_key: string;
    session_token?: string | null;
  },
  mode: "put" | "rotate",
): Promise<{
  accessSealed: string;
  secretSealed: string;
  sessionSealed: string | null;
}> {
  const port = asAes(secrets);
  const ids = secretIds(bucketId);
  if (mode === "put") {
    await port.putSecret(ids.access, creds.access_key);
    await port.putSecret(ids.secret, creds.secret_key);
    if (creds.session_token?.trim()) {
      await port.putSecret(ids.session, creds.session_token.trim());
    }
  } else {
    await port.rotate(ids.access, creds.access_key);
    await port.rotate(ids.secret, creds.secret_key);
    if (creds.session_token?.trim()) {
      const existing = port.peekSealed(ids.session);
      if (existing) {
        await port.rotate(ids.session, creds.session_token.trim());
      } else {
        await port.putSecret(ids.session, creds.session_token.trim());
      }
    }
  }
  const accessSealed = port.peekSealed(ids.access);
  const secretSealed = port.peekSealed(ids.secret);
  if (!accessSealed || !secretSealed) {
    throw new Error("secret_seal_failed");
  }
  const sessionSealed = creds.session_token?.trim()
    ? (port.peekSealed(ids.session) ?? null)
    : null;
  return { accessSealed, secretSealed, sessionSealed };
}

export async function listAdminBuckets(
  deps: BucketAdminDeps,
): Promise<BucketPublic[]> {
  const rows = await listBucketRows(deps.jord);
  return rows.map((row) => publicBucket(row, deps.secrets));
}

export async function getAdminBucket(
  deps: BucketAdminDeps,
  name: string,
): Promise<
  | { ok: true; bucket: BucketPublic }
  | { ok: false; status: 404; error: string }
> {
  const row = await getBucketRow(deps.jord, name);
  if (!row) return { ok: false, status: 404, error: "bucket_not_found" };
  return { ok: true, bucket: publicBucket(row, deps.secrets) };
}

export async function testAdminBucket(
  deps: BucketAdminDeps,
  name: string,
  body: Partial<BucketProbeInput> & BucketCredentialInput,
): Promise<
  | { ok: true }
  | { ok: false; status: 400 | 503; error: string; detail?: string }
> {
  const existing = await getBucketRow(deps.jord, name);
  const provider =
    parseBucketProvider(body.provider) ?? existing?.provider ?? null;
  if (!provider) {
    return { ok: false, status: 400, error: "provider is required" };
  }

  const probeInput: BucketProbeInput = {
    name,
    provider,
    endpoint:
      body.endpoint !== undefined
        ? (body.endpoint as string | null)
        : (existing?.endpoint ?? null),
    region:
      body.region !== undefined
        ? (body.region as string | null)
        : (existing?.region ?? null),
    physical_bucket:
      body.physical_bucket !== undefined
        ? (body.physical_bucket as string | null)
        : (existing?.physicalBucket ?? null),
    key_prefix:
      body.key_prefix !== undefined
        ? (body.key_prefix as string | null)
        : (existing?.keyPrefix ?? null),
    force_path_style:
      body.force_path_style !== undefined
        ? Boolean(body.force_path_style)
        : (existing?.forcePathStyle ?? null),
    access_key: body.access_key,
    secret_key: body.secret_key,
    session_token: body.session_token,
  };

  if (isS3FamilyProvider(provider)) {
    const hasPlain =
      Boolean(body.access_key?.trim()) && Boolean(body.secret_key?.trim());
    if (!hasPlain && existing?.accessKeySealed && existing.secretKeySealed) {
      const secrets = deps.secrets;
      if (!secrets) {
        return {
          ok: false,
          status: 503,
          error: "JORD_MASTER_KEY is required to reuse sealed credentials",
        };
      }
      try {
        probeInput.access_key = secrets.unseal(existing.accessKeySealed);
        probeInput.secret_key = secrets.unseal(existing.secretKeySealed);
        if (existing.sessionTokenSealed) {
          probeInput.session_token = secrets.unseal(
            existing.sessionTokenSealed,
          );
        }
      } catch (err) {
        return {
          ok: false,
          status: 400,
          error: "credential_unseal_failed",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  const connErr = validateProviderConnection(probeInput);
  if (connErr) return { ok: false, status: 400, error: connErr };
  const credErr = validateCredentialsForProvider(provider, probeInput, {
    required: isS3FamilyProvider(provider),
  });
  if (credErr) return { ok: false, status: 400, error: credErr };

  const port =
    deps.createProbePort?.(probeInput) ??
    buildProbePort(probeInput, deps.factory);
  const result = deps.runProbe
    ? await deps.runProbe({ port, bucket: name })
    : await probeBucketConnection({ port, bucket: name });
  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      error: "connect_failed",
      detail: result.error,
    };
  }
  return { ok: true };
}

export async function createAdminBucket(
  deps: BucketAdminDeps,
  body: BucketCreateInput,
  createdBy?: string | null,
): Promise<
  | { ok: true; bucket: BucketPublic; status: 201 }
  | {
      ok: false;
      status: 400 | 409 | 503;
      error: string;
      detail?: string;
    }
> {
  const name = body.name?.trim() ?? "";
  if (!isValidBlobBucket(name)) {
    return {
      ok: false,
      status: 400,
      error: "bucket name must match [a-z0-9][a-z0-9_-]{0,62}",
    };
  }
  const provider = body.provider;
  if (!parseBucketProvider(provider)) {
    return { ok: false, status: 400, error: "invalid_provider" };
  }

  const existing = await getBucketRow(deps.jord, name);
  if (existing) {
    return { ok: false, status: 409, error: "bucket_exists" };
  }

  const connErr = validateProviderConnection(body);
  if (connErr) return { ok: false, status: 400, error: connErr };
  const credErr = validateCredentialsForProvider(provider, body, {
    required: isS3FamilyProvider(provider),
  });
  if (credErr) return { ok: false, status: 400, error: credErr };

  if (isS3FamilyProvider(provider) && !deps.secrets) {
    return {
      ok: false,
      status: 503,
      error: "JORD_MASTER_KEY is required for bucket credentials",
    };
  }

  const probeInput: BucketProbeInput = {
    name,
    provider,
    endpoint: body.endpoint ?? null,
    region: body.region ?? null,
    physical_bucket: body.physical_bucket ?? null,
    key_prefix: body.key_prefix ?? null,
    force_path_style: body.force_path_style ?? null,
    access_key: body.access_key,
    secret_key: body.secret_key,
    session_token: body.session_token,
  };
  const port =
    deps.createProbePort?.(probeInput) ??
    buildProbePort(probeInput, deps.factory);
  const probe = deps.runProbe
    ? await deps.runProbe({ port, bucket: name })
    : await probeBucketConnection({ port, bucket: name });
  if (!probe.ok) {
    return {
      ok: false,
      status: 400,
      error: "connect_failed",
      detail: probe.error,
    };
  }

  const id = randomUUID();
  const now = Date.now();
  let accessSealed: string | null = null;
  let secretSealed: string | null = null;
  let sessionSealed: string | null = null;

  if (isS3FamilyProvider(provider)) {
    const sealed = await sealCredentials(
      requireSecretPort(deps.secrets),
      id,
      {
        access_key: body.access_key!.trim(),
        secret_key: body.secret_key!.trim(),
        session_token: body.session_token,
      },
      "put",
    );
    accessSealed = sealed.accessSealed;
    secretSealed = sealed.secretSealed;
    sessionSealed = sealed.sessionSealed;
  }

  const forcePath = defaultForcePathStyle(provider, body.force_path_style);

  try {
    await deps.enqueueWrite(async () => {
      await deps.jord.query(
        `INSERT INTO jord_buckets (
          id, name, provider, endpoint, region, physical_bucket, key_prefix,
          force_path_style, access_key_sealed, secret_key_sealed, session_token_sealed,
          public_read, max_object_bytes, allowed_mime_types, sign_ttl_seconds,
          status, linked_table, created_by, created_at, updated_at, last_write_at
        ) VALUES (
          ${ph(deps.jord, 1)}, ${ph(deps.jord, 2)}, ${ph(deps.jord, 3)},
          ${ph(deps.jord, 4)}, ${ph(deps.jord, 5)}, ${ph(deps.jord, 6)},
          ${ph(deps.jord, 7)}, ${ph(deps.jord, 8)}, ${ph(deps.jord, 9)},
          ${ph(deps.jord, 10)}, ${ph(deps.jord, 11)}, ${ph(deps.jord, 12)},
          ${ph(deps.jord, 13)}, ${ph(deps.jord, 14)}, ${ph(deps.jord, 15)},
          'active', ${ph(deps.jord, 16)}, ${ph(deps.jord, 17)},
          ${ph(deps.jord, 18)}, ${ph(deps.jord, 19)}, NULL
        )`,
        [
          id,
          name,
          provider,
          body.endpoint?.trim() || null,
          body.region?.trim() || null,
          body.physical_bucket?.trim() || null,
          body.key_prefix?.trim() || null,
          forcePath ? 1 : 0,
          accessSealed,
          secretSealed,
          sessionSealed,
          body.public_read ? 1 : 0,
          body.max_object_bytes ?? null,
          mimeJson(body.allowed_mime_types),
          body.sign_ttl_seconds ?? null,
          body.linked_table?.trim() || null,
          createdBy ?? null,
          now,
          now,
        ],
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|UNIQUE|duplicate/i.test(msg)) {
      return { ok: false, status: 409, error: "bucket_exists" };
    }
    throw err;
  }

  deps.clearPortCache?.();
  const loaded = await getBucketRow(deps.jord, name);
  if (!loaded) {
    return { ok: false, status: 503, error: "bucket_readback_failed" };
  }
  return {
    ok: true,
    bucket: publicBucket(loaded, deps.secrets),
    status: 201,
  };
}

export async function patchAdminBucket(
  deps: BucketAdminDeps,
  name: string,
  body: BucketPatchInput,
): Promise<
  | { ok: true; bucket: BucketPublic }
  | { ok: false; status: 400 | 404 | 503; error: string; detail?: string }
> {
  const existing = await getBucketRow(deps.jord, name);
  if (!existing) {
    return { ok: false, status: 404, error: "bucket_not_found" };
  }

  if (body.access_key != null || body.secret_key != null) {
    return {
      ok: false,
      status: 400,
      error: "use /rotate to change credentials",
    };
  }

  const provider = body.provider ?? existing.provider;
  if (body.provider != null && !parseBucketProvider(body.provider)) {
    return { ok: false, status: 400, error: "invalid_provider" };
  }

  const next: BucketConnectionInput = {
    provider,
    endpoint:
      body.endpoint !== undefined ? body.endpoint : existing.endpoint,
    region: body.region !== undefined ? body.region : existing.region,
    physical_bucket:
      body.physical_bucket !== undefined
        ? body.physical_bucket
        : existing.physicalBucket,
    key_prefix:
      body.key_prefix !== undefined ? body.key_prefix : existing.keyPrefix,
    force_path_style:
      body.force_path_style !== undefined
        ? body.force_path_style
        : existing.forcePathStyle,
    public_read:
      body.public_read !== undefined ? body.public_read : existing.publicRead,
    max_object_bytes:
      body.max_object_bytes !== undefined
        ? body.max_object_bytes
        : existing.maxObjectBytes,
    allowed_mime_types:
      body.allowed_mime_types !== undefined
        ? body.allowed_mime_types
        : existing.allowedMimeTypes,
    sign_ttl_seconds:
      body.sign_ttl_seconds !== undefined
        ? body.sign_ttl_seconds
        : existing.signTtlSeconds,
    linked_table:
      body.linked_table !== undefined
        ? body.linked_table
        : existing.linkedTable,
  };

  const connErr = validateProviderConnection(next);
  if (connErr) return { ok: false, status: 400, error: connErr };

  const now = Date.now();
  const forcePath = defaultForcePathStyle(
    provider,
    next.force_path_style,
  );

  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `UPDATE jord_buckets SET
        provider = ${ph(deps.jord, 1)},
        endpoint = ${ph(deps.jord, 2)},
        region = ${ph(deps.jord, 3)},
        physical_bucket = ${ph(deps.jord, 4)},
        key_prefix = ${ph(deps.jord, 5)},
        force_path_style = ${ph(deps.jord, 6)},
        public_read = ${ph(deps.jord, 7)},
        max_object_bytes = ${ph(deps.jord, 8)},
        allowed_mime_types = ${ph(deps.jord, 9)},
        sign_ttl_seconds = ${ph(deps.jord, 10)},
        linked_table = ${ph(deps.jord, 11)},
        updated_at = ${ph(deps.jord, 12)}
      WHERE name = ${ph(deps.jord, 13)}`,
      [
        provider,
        next.endpoint?.trim() || null,
        next.region?.trim() || null,
        next.physical_bucket?.trim() || null,
        next.key_prefix?.trim() || null,
        forcePath ? 1 : 0,
        next.public_read ? 1 : 0,
        next.max_object_bytes ?? null,
        mimeJson(next.allowed_mime_types),
        next.sign_ttl_seconds ?? null,
        next.linked_table?.trim() || null,
        now,
        name,
      ],
    );
  });

  deps.clearPortCache?.();
  const loaded = await getBucketRow(deps.jord, name);
  if (!loaded) {
    return { ok: false, status: 503, error: "bucket_readback_failed" };
  }
  return { ok: true, bucket: publicBucket(loaded, deps.secrets) };
}

export async function rotateAdminBucketCredentials(
  deps: BucketAdminDeps,
  name: string,
  creds: BucketCredentialInput,
): Promise<
  | { ok: true; bucket: BucketPublic }
  | { ok: false; status: 400 | 404 | 503; error: string; detail?: string }
> {
  const existing = await getBucketRow(deps.jord, name);
  if (!existing) {
    return { ok: false, status: 404, error: "bucket_not_found" };
  }
  if (!isS3FamilyProvider(existing.provider)) {
    return {
      ok: false,
      status: 400,
      error: "credentials only apply to s3-family providers",
    };
  }
  if (!deps.secrets) {
    return {
      ok: false,
      status: 503,
      error: "JORD_MASTER_KEY is required for bucket credentials",
    };
  }

  const credErr = validateCredentialsForProvider(existing.provider, creds, {
    required: true,
  });
  if (credErr) return { ok: false, status: 400, error: credErr };

  const probeInput: BucketProbeInput = {
    name,
    provider: existing.provider,
    endpoint: existing.endpoint,
    region: existing.region,
    physical_bucket: existing.physicalBucket,
    key_prefix: existing.keyPrefix,
    force_path_style: existing.forcePathStyle,
    access_key: creds.access_key,
    secret_key: creds.secret_key,
    session_token: creds.session_token,
  };
  const port =
    deps.createProbePort?.(probeInput) ??
    buildProbePort(probeInput, deps.factory);
  const probe = deps.runProbe
    ? await deps.runProbe({ port, bucket: name })
    : await probeBucketConnection({ port, bucket: name });
  if (!probe.ok) {
    return {
      ok: false,
      status: 400,
      error: "connect_failed",
      detail: probe.error,
    };
  }

  const oldAccessSealed = existing.accessKeySealed;
  const oldSecretSealed = existing.secretKeySealed;

  const mode =
    existing.accessKeySealed && existing.secretKeySealed ? "rotate" : "put";
  const sealed = await sealCredentials(
    requireSecretPort(deps.secrets),
    existing.id,
    {
      access_key: creds.access_key!.trim(),
      secret_key: creds.secret_key!.trim(),
      session_token: creds.session_token,
    },
    mode,
  );

  const now = Date.now();
  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `UPDATE jord_buckets SET
        access_key_sealed = ${ph(deps.jord, 1)},
        secret_key_sealed = ${ph(deps.jord, 2)},
        session_token_sealed = ${ph(deps.jord, 3)},
        updated_at = ${ph(deps.jord, 4)}
      WHERE name = ${ph(deps.jord, 5)}`,
      [
        sealed.accessSealed,
        sealed.secretSealed,
        sealed.sessionSealed,
        now,
        name,
      ],
    );
  });

  deps.clearPortCache?.();

  // Old sealed envelopes must fail unseal after rotate when still in-process.
  if (oldAccessSealed && deps.secrets) {
    try {
      deps.secrets.unseal(oldAccessSealed);
      // If put-mode (first credentials), old may be null; if rotate, expect throw.
      if (mode === "rotate") {
        return {
          ok: false,
          status: 503,
          error: "rotation_did_not_revoke_old_credentials",
        };
      }
    } catch {
      // expected after rotate
    }
  }
  if (oldSecretSealed && mode === "rotate" && deps.secrets) {
    try {
      deps.secrets.unseal(oldSecretSealed);
      return {
        ok: false,
        status: 503,
        error: "rotation_did_not_revoke_old_credentials",
      };
    } catch {
      // expected
    }
  }

  const loaded = await getBucketRow(deps.jord, name);
  if (!loaded) {
    return { ok: false, status: 503, error: "bucket_readback_failed" };
  }
  return { ok: true, bucket: publicBucket(loaded, deps.secrets) };
}

export async function setAdminBucketStatus(
  deps: BucketAdminDeps,
  name: string,
  status: Extract<JordBucketStatus, "active" | "paused">,
): Promise<
  | { ok: true; bucket: BucketPublic }
  | { ok: false; status: 404 | 503; error: string }
> {
  const existing = await getBucketRow(deps.jord, name);
  if (!existing) {
    return { ok: false, status: 404, error: "bucket_not_found" };
  }
  const now = Date.now();
  await deps.enqueueWrite(async () => {
    await deps.jord.query(
      `UPDATE jord_buckets SET
        status = ${ph(deps.jord, 1)},
        updated_at = ${ph(deps.jord, 2)}
      WHERE name = ${ph(deps.jord, 3)}`,
      [status, now, name],
    );
  });
  deps.clearPortCache?.();
  const loaded = await getBucketRow(deps.jord, name);
  if (!loaded) {
    return { ok: false, status: 503, error: "bucket_readback_failed" };
  }
  return { ok: true, bucket: publicBucket(loaded, deps.secrets) };
}

/** Resolve plaintext credentials from a registry row (for storage ports). */
export function credentialsFromBucketRow(
  row: BucketRegistryRow,
  secrets: SecretPort | null,
): {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
} {
  if (!row.accessKeySealed || !row.secretKeySealed || !secrets) {
    return {};
  }
  return {
    accessKeyId: secrets.unseal(row.accessKeySealed),
    secretAccessKey: secrets.unseal(row.secretKeySealed),
    sessionToken: row.sessionTokenSealed
      ? secrets.unseal(row.sessionTokenSealed)
      : undefined,
  };
}
