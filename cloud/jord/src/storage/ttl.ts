/** Default signed-URL TTL: 15 minutes. */
export const DEFAULT_SIGN_TTL_SECONDS = 15 * 60;
/** Hard cap: 1 hour. */
export const MAX_SIGN_TTL_SECONDS = 60 * 60;
/** Default pending-row lifetime (matches max sign TTL). */
export const DEFAULT_PENDING_TTL_MS = MAX_SIGN_TTL_SECONDS * 1000;

export function clampSignTtlSeconds(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return DEFAULT_SIGN_TTL_SECONDS;
  }
  const rounded = Math.floor(raw);
  if (rounded <= 0) return DEFAULT_SIGN_TTL_SECONDS;
  return Math.min(rounded, MAX_SIGN_TTL_SECONDS);
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
