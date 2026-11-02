/** Default signed-URL TTL: 15 minutes. */
export const DEFAULT_SIGN_TTL_SECONDS = 15 * 60;
/** Hard cap: 1 hour. */
export const MAX_SIGN_TTL_SECONDS = 60 * 60;
/** Default pending-row lifetime (matches max sign TTL). */
export const DEFAULT_PENDING_TTL_MS = MAX_SIGN_TTL_SECONDS * 1000;

export function clampSignTtlSeconds(
  raw: unknown,
  /** Optional per-bucket ceiling (still hard-capped at 1 h). */
  bucketMaxSeconds?: number | null,
): number {
  const hardCap =
    typeof bucketMaxSeconds === "number" &&
    Number.isFinite(bucketMaxSeconds) &&
    bucketMaxSeconds > 0
      ? Math.min(Math.floor(bucketMaxSeconds), MAX_SIGN_TTL_SECONDS)
      : MAX_SIGN_TTL_SECONDS;
  const fallback = Math.min(DEFAULT_SIGN_TTL_SECONDS, hardCap);
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback;
  }
  const rounded = Math.floor(raw);
  if (rounded <= 0) return fallback;
  return Math.min(rounded, hardCap);
}

/**
 * Reject uploads that exceed the bucket size or MIME allowlist.
 * `allowedMimeTypes === null` means allow all.
 */
export function assertBucketUploadLimits(input: {
  size: number;
  contentType: string;
  maxObjectBytes: number;
  allowedMimeTypes: string[] | null;
}): { ok: true } | { ok: false; status: 413 | 415; message: string } {
  if (input.size > input.maxObjectBytes) {
    return {
      ok: false,
      status: 413,
      message: `object exceeds max size of ${input.maxObjectBytes} bytes`,
    };
  }
  const allow = input.allowedMimeTypes;
  if (allow && allow.length > 0) {
    const mime = input.contentType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
    if (!allow.includes(mime)) {
      return {
        ok: false,
        status: 415,
        message: `content type "${input.contentType}" is not allowed for this bucket`,
      };
    }
  }
  return { ok: true };
}

export function resolveMaxBlobBytes(
  env: NodeJS.ProcessEnv = process.env,
  override?: number,
): number {
  if (typeof override === "number" && override > 0) return override;
  const raw = env.JORD_MAX_BLOB_BYTES?.trim();
  if (!raw) {
    // Keep phase-01 default (10 MiB) unless env overrides.
    return 10 * 1024 * 1024;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10 * 1024 * 1024;
  }
  return parsed;
}
