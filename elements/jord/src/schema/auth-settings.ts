import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Per-project auth settings document (S0069). One row, id `default`. */
export const jordAuthSettings = sqliteTable("jord_auth_settings", {
  id: text("id").primaryKey(),
  signupsEnabled: integer("signups_enabled", { mode: "number" })
    .notNull()
    .default(1),
  autoconfirm: integer("autoconfirm", { mode: "number" }).notNull().default(0),
  passwordMinLength: integer("password_min_length", { mode: "number" })
    .notNull()
    .default(10),
  siteUrl: text("site_url"),
  /** JSON string array of absolute URL patterns (`*` / `**` wildcards). */
  redirectAllowlist: text("redirect_allowlist"),
  /** JSON object endpoint → requests per minute. */
  rateLimits: text("rate_limits"),
  sessionTtlSeconds: integer("session_ttl_seconds", { mode: "number" })
    .notNull()
    .default(900),
  emailPasswordEnabled: integer("email_password_enabled", { mode: "number" })
    .notNull()
    .default(1),
  anonymousEnabled: integer("anonymous_enabled", { mode: "number" })
    .notNull()
    .default(1),
  /** JSON object merged into end-user access tokens (reserved claims refused). */
  customClaims: text("custom_claims"),
  /** AES-GCM envelope for the rotated signing key — never returned by the API. */
  jwtKeySealed: text("jwt_key_sealed"),
  jwtKeyFingerprint: text("jwt_key_fingerprint"),
  jwtKeyRotatedAt: integer("jwt_key_rotated_at", { mode: "number" }),
  updatedBy: text("updated_by"),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export type JordAuthSettingsRow = typeof jordAuthSettings.$inferSelect;
export type NewJordAuthSettingsRow = typeof jordAuthSettings.$inferInsert;

export const AUTH_RATE_LIMIT_KEYS = [
  "signup",
  "signin",
  "refresh",
  "recover",
  "reset",
  "confirm",
] as const;

export type AuthRateLimitKey = (typeof AUTH_RATE_LIMIT_KEYS)[number];

export const DEFAULT_AUTH_SETTINGS = {
  signups_enabled: true,
  autoconfirm: false,
  password_min_length: 10,
  site_url: null,
  redirect_allowlist: [] as string[],
  rate_limits: {
    signup: 30,
    signin: 30,
    refresh: 30,
    recover: 30,
    reset: 30,
    confirm: 30,
  } as Record<AuthRateLimitKey, number>,
  session_ttl_seconds: 900,
  email_password_enabled: true,
  anonymous_enabled: true,
  custom_claims: {} as Record<string, unknown>,
} as const;

export const AUTH_SETTINGS_BOUNDS = {
  passwordMinLength: { min: 6, max: 128 },
  sessionTtlSeconds: { min: 60, max: 86_400 },
  rateLimit: { min: 1, max: 10_000 },
  customClaimsMaxChars: 8_192,
} as const;
