/** Bucket registry client model + helpers (S0068 Studio bucket UI). */

export const BUCKETS_CHANGED_EVENT = "jord:buckets-changed";

export function emitBucketsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BUCKETS_CHANGED_EVENT));
}

export const JORD_BUCKET_PROVIDERS = [
  "local",
  "s3",
  "r2",
  "minio",
  "s3-compatible",
] as const;

export type JordBucketProvider = (typeof JORD_BUCKET_PROVIDERS)[number];

export type JordBucketStatus = "active" | "paused";

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

export type BucketProviderInfo = {
  label: string;
  blurb: string;
  s3Family: boolean;
  needsEndpoint: boolean;
  needsRegion: boolean;
  needsPhysical: boolean;
};

export const BUCKET_PROVIDERS: Record<JordBucketProvider, BucketProviderInfo> = {
  local: {
    label: "Local",
    blurb: "Bytes live under the server data directory with HMAC-signed URLs.",
    s3Family: false,
    needsEndpoint: false,
    needsRegion: false,
    needsPhysical: false,
  },
  s3: {
    label: "AWS S3",
    blurb: "Bucket + region; credentials are sealed in the control-plane store.",
    s3Family: true,
    needsEndpoint: false,
    needsRegion: true,
    needsPhysical: true,
  },
  r2: {
    label: "Cloudflare R2",
    blurb: "S3-compatible with an account endpoint and auto region.",
    s3Family: true,
    needsEndpoint: true,
    needsRegion: true,
    needsPhysical: true,
  },
  minio: {
    label: "MinIO",
    blurb: "Self-hosted S3 with a custom endpoint; path-style is the default.",
    s3Family: true,
    needsEndpoint: true,
    needsRegion: false,
    needsPhysical: true,
  },
  "s3-compatible": {
    label: "S3-compatible",
    blurb: "Any S3 API endpoint (Backblaze, Wasabi, Ceph, …).",
    s3Family: true,
    needsEndpoint: true,
    needsRegion: false,
    needsPhysical: true,
  },
};

export function bucketProviderInfo(
  provider: JordBucketProvider,
): BucketProviderInfo {
  return BUCKET_PROVIDERS[provider];
}

export function bucketProviderLabel(
  provider: JordBucketProvider | null,
): string {
  return provider ? BUCKET_PROVIDERS[provider].label : "env";
}

export function bucketStatusLabel(status: JordBucketStatus): string {
  return status === "paused" ? "paused" : "active";
}

export type BucketDraft = {
  provider: JordBucketProvider;
  endpoint: string;
  region: string;
  physical_bucket: string;
  key_prefix: string;
  force_path_style: boolean;
  public_read: boolean;
  /** Max object size in MB (blank → server default). */
  max_size_mb: string;
  /** Comma separated MIME allowlist (blank → all types). */
  allowed_mime_types: string;
  /** Preferred signed URL TTL in seconds (blank → default). */
  sign_ttl_seconds: string;
  linked_table: string;
  access_key: string;
  secret_key: string;
  session_token: string;
};

export const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export function emptyBucketDraft(
  provider: JordBucketProvider = "local",
): BucketDraft {
  return {
    provider,
    endpoint: "",
    region: "",
    physical_bucket: "",
    key_prefix: "",
    force_path_style: provider === "minio" || provider === "s3-compatible",
    public_read: false,
    max_size_mb: "",
    allowed_mime_types: "",
    sign_ttl_seconds: "",
    linked_table: "",
    access_key: "",
    secret_key: "",
    session_token: "",
  };
}

function mbFromBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return String(Math.round(mb * 100) / 100);
}

export function draftFromBucket(bucket: BucketPublic): BucketDraft {
  return {
    provider: bucket.provider,
    endpoint: bucket.endpoint ?? "",
    region: bucket.region ?? "",
    physical_bucket: bucket.physical_bucket ?? "",
    key_prefix: bucket.key_prefix ?? "",
    force_path_style: bucket.force_path_style,
    public_read: bucket.public_read,
    max_size_mb: mbFromBytes(bucket.max_object_bytes),
    allowed_mime_types: (bucket.allowed_mime_types ?? []).join(", "),
    sign_ttl_seconds:
      bucket.sign_ttl_seconds != null ? String(bucket.sign_ttl_seconds) : "",
    linked_table: bucket.linked_table ?? "",
    access_key: "",
    secret_key: "",
    session_token: "",
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseMimeList(raw: string): string[] | null {
  const list = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return list.length > 0 ? list : null;
}

export type BucketDraftOptions = {
  name?: string;
  /** S3-family providers cannot be created/rotated without credentials. */
  requireCredentials?: boolean;
};

/** Client mirror of the server matrix, for inline errors before the request. */
export function validateBucketDraft(
  draft: BucketDraft,
  options: BucketDraftOptions = {},
): string[] {
  const errors: string[] = [];
  const info = bucketProviderInfo(draft.provider);

  const name = options.name?.trim();
  if (options.name !== undefined && !BUCKET_NAME_PATTERN.test(name ?? "")) {
    errors.push("Name must match [a-z0-9][a-z0-9_-]{0,62}");
  }

  if (info.needsEndpoint && !draft.endpoint.trim()) {
    errors.push(`Endpoint is required for ${info.label}`);
  }
  if (info.needsRegion && !draft.region.trim()) {
    errors.push(`Region is required for ${info.label}`);
  }
  if (info.needsPhysical && !draft.physical_bucket.trim()) {
    errors.push(`Physical bucket is required for ${info.label}`);
  }

  if (draft.max_size_mb.trim()) {
    const mb = Number.parseFloat(draft.max_size_mb);
    if (!Number.isFinite(mb) || mb <= 0) {
      errors.push("Max object size must be a positive number of MB");
    }
  }

  if (draft.sign_ttl_seconds.trim()) {
    const ttl = Number.parseFloat(draft.sign_ttl_seconds);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      errors.push("Signed URL TTL must be a positive number of seconds");
    } else if (ttl > 3600) {
      errors.push("Signed URL TTL is hard-capped at 3600 seconds");
    }
  }

  if (options.requireCredentials && info.s3Family) {
    if (!draft.access_key.trim()) errors.push("Access key is required");
    if (!draft.secret_key.trim()) errors.push("Secret key is required");
  }

  return errors;
}

export function bucketDraftPayload(
  draft: BucketDraft,
): Record<string, unknown> {
  const maxMb = Number.parseFloat(draft.max_size_mb);
  const ttl = Number.parseFloat(draft.sign_ttl_seconds);
  return {
    provider: draft.provider,
    endpoint: blankToNull(draft.endpoint),
    region: blankToNull(draft.region),
    physical_bucket: blankToNull(draft.physical_bucket),
    key_prefix: blankToNull(draft.key_prefix),
    force_path_style: draft.force_path_style,
    public_read: draft.public_read,
    max_object_bytes:
      Number.isFinite(maxMb) && maxMb > 0
        ? Math.round(maxMb * 1024 * 1024)
        : null,
    allowed_mime_types: parseMimeList(draft.allowed_mime_types),
    sign_ttl_seconds: Number.isFinite(ttl) && ttl > 0 ? Math.round(ttl) : null,
    linked_table: blankToNull(draft.linked_table),
  };
}

export function bucketCredentialPayload(
  draft: BucketDraft,
): Record<string, unknown> {
  return {
    access_key: blankToNull(draft.access_key),
    secret_key: blankToNull(draft.secret_key),
    session_token: blankToNull(draft.session_token),
  };
}

/**
 * Stable fingerprint of everything a connection test covers. Save stays
 * disabled until the tested fingerprint matches the current draft.
 */
export function bucketDraftSignature(
  name: string,
  draft: BucketDraft,
): string {
  return JSON.stringify({
    name: name.trim(),
    ...bucketDraftPayload(draft),
    ...bucketCredentialPayload(draft),
  });
}

/** Error message from a Studio BFF / server response (JSON or plain text). */
export async function readApiError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const text = await response.text().catch(() => "");
  return parseErrorText(text, response.status) ?? fallback;
}

export function parseErrorText(
  text: string,
  status?: number,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const body = JSON.parse(trimmed) as {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
    };
    const parts: string[] = [];
    if (typeof body.message === "string" && body.message) {
      parts.push(body.message);
    } else if (typeof body.error === "string" && body.error) {
      parts.push(body.error);
    }
    if (typeof body.detail === "string" && body.detail) {
      parts.push(body.detail);
    }
    if (parts.length > 0) return parts.join(" — ");
  } catch {
    // Plain-text error (Hono HTTPException) below.
  }
  const clipped = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
  return status ? `${clipped} (${status})` : clipped;
}

export type PreviewKind = "image" | "pdf" | "text" | "none";

export function previewKind(contentType: string): PreviewKind {
  const type = contentType.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (
    type.startsWith("text/") ||
    type === "application/json" ||
    type === "application/xml" ||
    type.endsWith("+json") ||
    type.endsWith("+xml") ||
    type === "application/javascript"
  ) {
    return "text";
  }
  return "none";
}

export function formatTimestamp(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  return new Date(ms).toLocaleString();
}

export function formatSignedExpiry(expiresAt: number): string {
  const when = new Date(expiresAt).toLocaleTimeString();
  return `Expires ${when}`;
}
