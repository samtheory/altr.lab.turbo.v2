import { createHmac, timingSafeEqual } from "node:crypto";

export const JWT_ALG = "HS256";
export const ACCESS_TTL_SEC = 15 * 60;
export const CLOCK_SKEW_SEC = 60;
export const CURRENT_KID = "current";
export const PREVIOUS_KID = "previous";
/** Anon keys are long-lived and not stored server-side. */
export const ANON_TTL_SEC = 10 * 365 * 24 * 60 * 60;

/** Claims the server owns; custom claims may not override them. */
export const RESERVED_JWT_CLAIMS = [
  "iss",
  "aud",
  "sub",
  "role",
  "iat",
  "exp",
  "jti",
  "nbf",
] as const;

export type JwtClaims = {
  iss: string;
  aud: string;
  sub: string;
  role: string;
  iat: number;
  exp: number;
  email?: string;
  [claim: string]: unknown;
};

export type JwtKey = { kid: string; secret: string };

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signJwt(input: {
  claims: JwtClaims;
  secret: string;
  kid?: string;
}): string {
  const header = b64urlJson({
    alg: JWT_ALG,
    typ: "JWT",
    kid: input.kid ?? CURRENT_KID,
  });
  const payload = b64urlJson(input.claims);
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", input.secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function signAccessToken(input: {
  secret: string;
  iss: string;
  aud: string;
  sub: string;
  role: string;
  email?: string;
  nowMs?: number;
  ttlSec?: number;
  kid?: string;
  /** Extra claims (settings `custom_claims`); reserved names are ignored. */
  extraClaims?: Record<string, unknown>;
}): { token: string; expMs: number } {
  const nowMs = input.nowMs ?? Date.now();
  const iat = Math.floor(nowMs / 1000);
  const ttl = input.ttlSec ?? ACCESS_TTL_SEC;
  const exp = iat + ttl;
  const claims: JwtClaims = {
    iss: input.iss,
    aud: input.aud,
    sub: input.sub,
    role: input.role,
    iat,
    exp,
  };
  if (input.email) claims.email = input.email;
  for (const [key, value] of Object.entries(input.extraClaims ?? {})) {
    if ((RESERVED_JWT_CLAIMS as readonly string[]).includes(key)) continue;
    if (value !== undefined) claims[key] = value;
  }
  return {
    token: signJwt({ claims, secret: input.secret, kid: input.kid }),
    expMs: exp * 1000,
  };
}

/**
 * Verify HS256 only. `alg=none` and every other alg are rejected.
 * `kid` selects `current` or `previous`. Signing uses the current secret only.
 */
export function verifyJwt(
  token: string,
  input: {
    keys: JwtKey[];
    iss: string;
    aud: string;
    nowMs?: number;
  },
): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sig] = parts;
  if (!headerPart || !payloadPart || !sig) return null;

  let header: unknown;
  try {
    header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof header !== "object" || header === null) return null;
  const alg = (header as { alg?: unknown }).alg;
  const kid = (header as { kid?: unknown }).kid;
  if (alg !== JWT_ALG) return null;
  if (typeof kid !== "string") return null;
  const key = input.keys.find((item) => item.kid === kid);
  if (!key) return null;

  const expected = createHmac("sha256", key.secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest("base64url");
  if (!safeEqual(sig, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const claims = payload as Partial<JwtClaims>;
  if (claims.iss !== input.iss || claims.aud !== input.aud) return null;
  if (typeof claims.sub !== "string" || claims.sub.length === 0) return null;
  if (typeof claims.role !== "string" || claims.role.length === 0) return null;
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number") return null;

  const nowSec = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (claims.exp + CLOCK_SKEW_SEC < nowSec) return null;
  if (claims.iat - CLOCK_SKEW_SEC > nowSec) return null;
  return claims as JwtClaims;
}
