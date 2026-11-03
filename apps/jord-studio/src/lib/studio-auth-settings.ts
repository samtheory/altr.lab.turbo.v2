/** Auth console settings helpers (S0071). */

export const AUTH_RATE_LIMIT_KEYS = [
  "signup",
  "signin",
  "refresh",
  "recover",
  "reset",
  "confirm",
] as const;

export type AuthRateLimitKey = (typeof AUTH_RATE_LIMIT_KEYS)[number];
export type AuthRateLimits = Record<AuthRateLimitKey, number>;

export const DEFAULT_AUTH_RATE_LIMITS: AuthRateLimits = {
  signup: 30,
  signin: 30,
  refresh: 30,
  recover: 30,
  reset: 30,
  confirm: 30,
};

export const AUTH_SETTINGS_LIMITS = {
  passwordMinLength: { min: 6, max: 128 },
  sessionTtlSeconds: { min: 60, max: 86_400 },
  rateLimit: { min: 1, max: 10_000 },
} as const;

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

export type AuthKeySource = "env" | "database" | "none" | "unknown";

export type AuthSettings = {
  signups_enabled: boolean;
  autoconfirm: boolean;
  password_min_length: number;
  site_url: string | null;
  redirect_allowlist: string[];
  rate_limits: AuthRateLimits;
  session_ttl_seconds: number;
  email_password_enabled: boolean;
  anonymous_enabled: boolean;
  custom_claims: Record<string, unknown>;
  jwt_key_fingerprint: string | null;
  jwt_key_rotated_at: number | null;
  jwt_key_configured: boolean;
  jwt_key_source?: AuthKeySource;
  updated_by: string | null;
  updated_at: number | null;
};

export type AuthSettingsPatch = Partial<
  Pick<
    AuthSettings,
    | "signups_enabled"
    | "autoconfirm"
    | "password_min_length"
    | "site_url"
    | "redirect_allowlist"
    | "rate_limits"
    | "session_ttl_seconds"
    | "email_password_enabled"
    | "anonymous_enabled"
    | "custom_claims"
  >
>;

/** Shape used before the first GET resolves. */
export function emptyAuthSettings(): AuthSettings {
  return {
    signups_enabled: true,
    autoconfirm: false,
    password_min_length: 10,
    site_url: null,
    redirect_allowlist: [],
    rate_limits: { ...DEFAULT_AUTH_RATE_LIMITS },
    session_ttl_seconds: 900,
    email_password_enabled: true,
    anonymous_enabled: true,
    custom_claims: {},
    jwt_key_fingerprint: null,
    jwt_key_rotated_at: null,
    jwt_key_configured: false,
    updated_by: null,
    updated_at: null,
  };
}

export function normalizeRateLimits(input: unknown): AuthRateLimits {
  const next = { ...DEFAULT_AUTH_RATE_LIMITS };
  if (!input || typeof input !== "object" || Array.isArray(input)) return next;
  for (const key of AUTH_RATE_LIMIT_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = Math.round(value);
    }
  }
  return next;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Mirror of the server's pattern check, for inline feedback before save. */
export function validateRedirectPattern(pattern: string): string | null {
  const trimmed = pattern.trim();
  if (trimmed === "") return "Pattern must not be empty";
  if (trimmed.includes(" ") || /[\r\n\t]/.test(trimmed)) {
    return "Pattern must not contain whitespace";
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return "Pattern must start with http:// or https://";
  }
  if (!isHttpUrl(trimmed.replace(/\*/g, "wildcard"))) {
    return "Pattern must be an absolute URL";
  }
  return null;
}

/** Textarea → allowlist rows; blank lines dropped. */
export function parseAllowlistText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function allowlistErrors(patterns: string[]): string[] {
  return patterns
    .map((pattern, index) => {
      const problem = validateRedirectPattern(pattern);
      return problem ? `Line ${index + 1}: ${problem}` : null;
    })
    .filter((entry): entry is string => entry !== null);
}

export function formatJwtFingerprint(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/(.{4})/g, "$1 ").trim();
}

export type ClaimsPreview = {
  header: Record<string, unknown>;
  claims: Record<string, unknown>;
  ttlMinutes: number;
};

/**
 * Shape preview of a future access token. It is not signed — the console must
 * never hold the signing key. Reserved claims always win over custom ones.
 */
export function buildClaimsPreview(input: {
  customClaims: Record<string, unknown>;
  ttlSeconds: number;
  nowMs?: number;
}): ClaimsPreview {
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const ttl = Math.max(1, Math.round(input.ttlSeconds));
  const claims: Record<string, unknown> = {
    iss: "jord",
    aud: "jord",
    sub: "00000000-0000-4000-8000-000000000000",
    role: "user",
    email: "user@example.com",
    iat: now,
    exp: now + ttl,
  };
  for (const [key, value] of Object.entries(input.customClaims)) {
    if ((RESERVED_JWT_CLAIMS as readonly string[]).includes(key)) continue;
    claims[key] = value;
  }
  return {
    header: { alg: "HS256", typ: "JWT", kid: "current" },
    claims,
    ttlMinutes: Math.round(ttl / 60),
  };
}

export function parseClaimsJson(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Claims must be a JSON object" };
  }
  for (const key of Object.keys(parsed)) {
    if ((RESERVED_JWT_CLAIMS as readonly string[]).includes(key)) {
      return { ok: false, error: `"${key}" is reserved by the server` };
    }
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}
