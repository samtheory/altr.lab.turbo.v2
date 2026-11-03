import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Local signed-URL query shape (mirrors S3-style params so one client works).
 * Algorithm is Jord HMAC-SHA256, not AWS SigV4.
 */
export const JORD_SIGN_ALGORITHM = "JORD1-HMAC-SHA256";

export type LocalSignParams = {
  bucket: string;
  key: string;
  method: "GET" | "PUT";
  expiresAt: number;
  contentType?: string;
  uploadId?: string;
  partNumber?: number;
  /**
   * S0082: canonical transform string (see `canonicalTransform`). Part of the
   * signed material, so any change to w/h/fit/q/fm invalidates the signature.
   */
  transform?: string;
};

function canonicalString(params: LocalSignParams): string {
  const parts = [
    JORD_SIGN_ALGORITHM,
    params.method,
    params.bucket,
    params.key,
    String(params.expiresAt),
    params.contentType ?? "",
    params.uploadId ?? "",
    params.partNumber != null ? String(params.partNumber) : "",
  ];
  // Appended only when present so non-transform signatures are unchanged.
  if (params.transform !== undefined) parts.push(`transform:${params.transform}`);
  return parts.join("\n");
}

export function signLocalParams(
  secret: string,
  params: LocalSignParams,
): string {
  return createHmac("sha256", secret)
    .update(canonicalString(params), "utf8")
    .digest("hex");
}

/**
 * S0093 key set. A plain string is a single static key. A source exposes the
 * signing key (`current`, always used for issuance) and every key that may
 * still verify right now (`verifying`, current first, previous only while its
 * overlap window is open).
 */
export type HmacSecretSource = {
  current(): string;
  verifying(nowMs: number): string[];
};
export type HmacSecret = string | HmacSecretSource;

export function currentHmacSecret(secret: HmacSecret): string {
  return typeof secret === "string" ? secret : secret.current();
}

export function verifyingHmacSecrets(
  secret: HmacSecret,
  nowMs: number,
): string[] {
  return typeof secret === "string" ? [secret] : secret.verifying(nowMs);
}

export function verifyLocalSignature(
  secret: HmacSecret,
  params: LocalSignParams,
  signature: string,
  nowMs: number = Date.now(),
): boolean {
  if (nowMs > params.expiresAt) return false;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const given = Buffer.from(signature.toLowerCase(), "utf8");
  let ok = false;
  for (const candidate of verifyingHmacSecrets(secret, nowMs)) {
    const expected = Buffer.from(signLocalParams(candidate, params), "utf8");
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      ok = true;
    }
  }
  return ok;
}

export function buildLocalSignedUrl(input: {
  baseUrl: string;
  secret: HmacSecret;
  params: LocalSignParams;
  /** Query pairs for the transform (must correspond to params.transform). */
  transformQuery?: Record<string, string>;
}): string {
  const signature = signLocalParams(currentHmacSecret(input.secret), input.params);
  const qs = new URLSearchParams({
    "X-Jord-Algorithm": JORD_SIGN_ALGORITHM,
    "X-Jord-Expires": String(input.params.expiresAt),
    "X-Jord-SignedHeaders": "host",
    "X-Jord-Signature": signature,
  });
  if (input.params.contentType) {
    qs.set("X-Jord-Content-Type", input.params.contentType);
  }
  if (input.params.uploadId) {
    qs.set("X-Jord-Upload-Id", input.params.uploadId);
  }
  if (input.params.partNumber != null) {
    qs.set("X-Jord-Part-Number", String(input.params.partNumber));
  }
  for (const [k, v] of Object.entries(input.transformQuery ?? {})) qs.set(k, v);
  const segment = input.params.transform !== undefined ? "transform" : "objects";
  const path = `/blobs/signed/${encodeURIComponent(input.params.bucket)}/${segment}/${encodeURIComponent(input.params.key)}`;
  const base = input.baseUrl.replace(/\/$/, "");
  return `${base}${path}?${qs.toString()}`;
}

export function parseLocalSignedQuery(query: URLSearchParams): {
  expiresAt: number;
  signature: string;
  contentType?: string;
  uploadId?: string;
  partNumber?: number;
} | null {
  const algorithm = query.get("X-Jord-Algorithm");
  const expiresRaw = query.get("X-Jord-Expires");
  const signature = query.get("X-Jord-Signature");
  if (algorithm !== JORD_SIGN_ALGORITHM || !expiresRaw || !signature) {
    return null;
  }
  const expiresAt = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expiresAt)) return null;
  const contentType = query.get("X-Jord-Content-Type") ?? undefined;
  const uploadId = query.get("X-Jord-Upload-Id") ?? undefined;
  const partRaw = query.get("X-Jord-Part-Number");
  const partNumber =
    partRaw == null ? undefined : Number.parseInt(partRaw, 10);
  return {
    expiresAt,
    signature,
    contentType,
    uploadId,
    partNumber:
      partNumber != null && Number.isFinite(partNumber) ? partNumber : undefined,
  };
}
