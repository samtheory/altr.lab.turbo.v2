import { randomUUID } from "node:crypto";

import {
  AUTH_RATE_LIMIT_KEYS,
  AUTH_SETTINGS_BOUNDS,
  DEFAULT_AUTH_SETTINGS,
  type AuthRateLimitKey,
  type JordDriverPort,
} from "@altr/jord";

import { RESERVED_JWT_CLAIMS } from "./jwt.js";

export const AUTH_SETTINGS_ID = "default";

export type AuthRateLimits = Record<AuthRateLimitKey, number>;

export type JordAuthSettings = {
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
  /** Non-secret identity of the stored signing key. */
  jwt_key_fingerprint: string | null;
  jwt_key_rotated_at: number | null;
  jwt_key_configured: boolean;
  updated_by: string | null;
  updated_at: number | null;
};

function defaultRateLimits(): AuthRateLimits {
  return { ...DEFAULT_AUTH_SETTINGS.rate_limits };
}

export function defaultAuthSettings(): JordAuthSettings {
  return {
    signups_enabled: DEFAULT_AUTH_SETTINGS.signups_enabled,
    autoconfirm: DEFAULT_AUTH_SETTINGS.autoconfirm,
    password_min_length: DEFAULT_AUTH_SETTINGS.password_min_length,
    site_url: DEFAULT_AUTH_SETTINGS.site_url,
    redirect_allowlist: [...DEFAULT_AUTH_SETTINGS.redirect_allowlist],
    rate_limits: defaultRateLimits(),
    session_ttl_seconds: DEFAULT_AUTH_SETTINGS.session_ttl_seconds,
    email_password_enabled: DEFAULT_AUTH_SETTINGS.email_password_enabled,
    anonymous_enabled: DEFAULT_AUTH_SETTINGS.anonymous_enabled,
    custom_claims: {},
    jwt_key_fingerprint: null,
    jwt_key_rotated_at: null,
    jwt_key_configured: false,
    updated_by: null,
    updated_at: null,
  };
}

function placeholder(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }
  return fallback;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseStoredAllowlist(value: unknown): string[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry): entry is string =>
      typeof entry === "string" && validateRedirectPattern(entry) == null,
  );
}

function parseStoredRateLimits(value: unknown): AuthRateLimits {
  const next = defaultRateLimits();
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return next;
  }
  for (const key of AUTH_RATE_LIMIT_KEYS) {
    const raw = (parsed as Record<string, unknown>)[key];
    const n = asInt(raw);
    if (n != null && n >= AUTH_SETTINGS_BOUNDS.rateLimit.min) {
      next[key] = clamp(
        n,
        AUTH_SETTINGS_BOUNDS.rateLimit.min,
        AUTH_SETTINGS_BOUNDS.rateLimit.max,
      );
    }
  }
  return next;
}

function parseStoredClaims(value: unknown): Record<string, unknown> {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if ((RESERVED_JWT_CLAIMS as readonly string[]).includes(key)) continue;
    next[key] = entry;
  }
  return next;
}

function mapSettingsRow(row: Record<string, unknown>): JordAuthSettings {
  const defaults = defaultAuthSettings();
  return {
    signups_enabled: asBool(row.signups_enabled, defaults.signups_enabled),
    autoconfirm: asBool(row.autoconfirm, defaults.autoconfirm),
    password_min_length: clamp(
      asInt(row.password_min_length) ?? defaults.password_min_length,
      AUTH_SETTINGS_BOUNDS.passwordMinLength.min,
      AUTH_SETTINGS_BOUNDS.passwordMinLength.max,
    ),
    site_url:
      typeof row.site_url === "string" && row.site_url.trim() !== ""
        ? row.site_url
        : null,
    redirect_allowlist: parseStoredAllowlist(row.redirect_allowlist),
    rate_limits: parseStoredRateLimits(row.rate_limits),
    session_ttl_seconds: clamp(
      asInt(row.session_ttl_seconds) ?? defaults.session_ttl_seconds,
      AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.min,
      AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.max,
    ),
    email_password_enabled: asBool(
      row.email_password_enabled,
      defaults.email_password_enabled,
    ),
    anonymous_enabled: asBool(
      row.anonymous_enabled,
      defaults.anonymous_enabled,
    ),
    custom_claims: parseStoredClaims(row.custom_claims),
    jwt_key_fingerprint:
      typeof row.jwt_key_fingerprint === "string"
        ? row.jwt_key_fingerprint
        : null,
    jwt_key_rotated_at:
      row.jwt_key_rotated_at == null ? null : Number(row.jwt_key_rotated_at),
    jwt_key_configured:
      typeof row.jwt_key_sealed === "string" && row.jwt_key_sealed.length > 0,
    updated_by: typeof row.updated_by === "string" ? row.updated_by : null,
    updated_at: asInt(row.updated_at),
  };
}

/** Missing row intentionally means today's behavior. */
export async function loadAuthSettings(
  jord: JordDriverPort,
): Promise<JordAuthSettings> {
  const rows = await jord.query(
    `SELECT * FROM jord_auth_settings WHERE id = ${placeholder(jord, 1)} LIMIT 1`,
    [AUTH_SETTINGS_ID],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapSettingsRow(row) : defaultAuthSettings();
}

function isHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

/** Returns an error message, or null when the pattern is acceptable. */
export function validateRedirectPattern(pattern: unknown): string | null {
  if (typeof pattern !== "string") return "redirect pattern must be a string";
  const trimmed = pattern.trim();
  if (trimmed === "") return "redirect pattern must not be empty";
  if (trimmed.includes(" ") || /[\r\n\t]/.test(trimmed)) {
    return "redirect pattern must not contain whitespace";
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return "redirect pattern must start with http:// or https://";
  }
  // Wildcards are only meaningful in host/path; validate the shape around them.
  const probe = trimmed.replace(/\*/g, "wildcard");
  if (!isHttpUrl(probe)) return "redirect pattern must be an absolute URL";
  return null;
}

/** Custom access-token claims: plain JSON object, no reserved or oversized keys. */
export function validateCustomClaims(
  value: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "custom_claims must be a JSON object" };
  }
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key] of entries) {
    if (key.trim() === "") {
      return { ok: false, error: "custom_claims keys must not be empty" };
    }
    if ((RESERVED_JWT_CLAIMS as readonly string[]).includes(key)) {
      return {
        ok: false,
        error: `custom_claims may not override the reserved claim "${key}"`,
      };
    }
  }
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return { ok: false, error: "custom_claims must be JSON-serialisable" };
  }
  if (text.length > AUTH_SETTINGS_BOUNDS.customClaimsMaxChars) {
    return {
      ok: false,
      error: `custom_claims must be at most ${AUTH_SETTINGS_BOUNDS.customClaimsMaxChars} characters`,
    };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

/** `**` crosses `/`; `*` stays inside one path segment. */
function patternMatches(pattern: string, candidate: string): boolean {
  const source = escapeRegExp(pattern)
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  const regex = new RegExp(`^${source}$`, "i");
  if (regex.test(candidate)) return true;
  const loosePattern = pattern.replace(/\/$/, "");
  const looseCandidate = candidate.replace(/\/$/, "");
  if (loosePattern === looseCandidate) return true;
  return new RegExp(`^${escapeRegExp(loosePattern).replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*")}$`, "i").test(
    looseCandidate,
  );
}

/**
 * Fail closed: without a site URL or allowlist, redirect parameters are
 * rejected. Same-origin with `site_url` is always allowed.
 */
export function isAllowedRedirect(
  candidate: string,
  settings: Pick<JordAuthSettings, "site_url" | "redirect_allowlist">,
): boolean {
  const url = isHttpUrl(candidate.trim());
  if (!url) return false;

  if (settings.site_url) {
    const site = isHttpUrl(settings.site_url);
    if (site && site.origin === url.origin) return true;
  }

  return settings.redirect_allowlist.some((pattern) =>
    patternMatches(pattern.trim(), url.toString()),
  );
}

export type RedirectCheck = { ok: true } | { ok: false };

/** Absent redirect is fine; a present one must pass the allowlist. */
export function validateRedirectParam(
  raw: unknown,
  settings: Pick<JordAuthSettings, "site_url" | "redirect_allowlist">,
): RedirectCheck {
  if (raw === undefined || raw === null || raw === "") return { ok: true };
  if (typeof raw !== "string") return { ok: false };
  return isAllowedRedirect(raw, settings) ? { ok: true } : { ok: false };
}

export type AuthSettingsPatch = Partial<
  Pick<
    JordAuthSettings,
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

export type ParseSettingsResult =
  | { ok: true; patch: AuthSettingsPatch }
  | { ok: false; errors: string[] };

const KNOWN_KEYS = new Set([
  "signups_enabled",
  "autoconfirm",
  "password_min_length",
  "site_url",
  "redirect_allowlist",
  "rate_limits",
  "session_ttl_seconds",
  "email_password_enabled",
  "anonymous_enabled",
  "custom_claims",
]);

/** Strict patch validation; unknown keys are rejected rather than ignored. */
export function parseAuthSettingsPatch(body: unknown): ParseSettingsResult {
  const errors: string[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: ["body must be a JSON object"] };
  }
  const raw = body as Record<string, unknown>;
  const patch: AuthSettingsPatch = {};

  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) errors.push(`unknown setting "${key}"`);
  }

  if (raw.signups_enabled !== undefined) {
    if (typeof raw.signups_enabled !== "boolean") {
      errors.push("signups_enabled must be a boolean");
    } else {
      patch.signups_enabled = raw.signups_enabled;
    }
  }
  if (raw.autoconfirm !== undefined) {
    if (typeof raw.autoconfirm !== "boolean") {
      errors.push("autoconfirm must be a boolean");
    } else {
      patch.autoconfirm = raw.autoconfirm;
    }
  }
  if (raw.password_min_length !== undefined) {
    const n = asInt(raw.password_min_length);
    if (
      n == null ||
      n < AUTH_SETTINGS_BOUNDS.passwordMinLength.min ||
      n > AUTH_SETTINGS_BOUNDS.passwordMinLength.max
    ) {
      errors.push(
        `password_min_length must be an integer ${AUTH_SETTINGS_BOUNDS.passwordMinLength.min}–${AUTH_SETTINGS_BOUNDS.passwordMinLength.max}`,
      );
    } else {
      patch.password_min_length = Math.round(n);
    }
  }
  if (raw.site_url !== undefined) {
    if (raw.site_url === null || raw.site_url === "") {
      patch.site_url = null;
    } else if (typeof raw.site_url !== "string" || !isHttpUrl(raw.site_url.trim())) {
      errors.push("site_url must be an absolute http(s) URL or null");
    } else {
      patch.site_url = raw.site_url.trim();
    }
  }
  if (raw.redirect_allowlist !== undefined) {
    if (!Array.isArray(raw.redirect_allowlist)) {
      errors.push("redirect_allowlist must be an array of URL patterns");
    } else {
      const patterns: string[] = [];
      for (const [index, entry] of raw.redirect_allowlist.entries()) {
        const problem = validateRedirectPattern(entry);
        if (problem) errors.push(`redirect_allowlist[${index}]: ${problem}`);
        else patterns.push((entry as string).trim());
      }
      if (patterns.length > 50) {
        errors.push("redirect_allowlist supports at most 50 entries");
      }
      patch.redirect_allowlist = patterns;
    }
  }
  if (raw.rate_limits !== undefined) {
    if (
      !raw.rate_limits ||
      typeof raw.rate_limits !== "object" ||
      Array.isArray(raw.rate_limits)
    ) {
      errors.push("rate_limits must be an object keyed by auth endpoint");
    } else {
      const limits: Partial<AuthRateLimits> = {};
      for (const [key, value] of Object.entries(
        raw.rate_limits as Record<string, unknown>,
      )) {
        if (!(AUTH_RATE_LIMIT_KEYS as readonly string[]).includes(key)) {
          errors.push(`rate_limits has unknown endpoint "${key}"`);
          continue;
        }
        const n = asInt(value);
        if (
          n == null ||
          n < AUTH_SETTINGS_BOUNDS.rateLimit.min ||
          n > AUTH_SETTINGS_BOUNDS.rateLimit.max
        ) {
          errors.push(
            `rate_limits.${key} must be an integer ${AUTH_SETTINGS_BOUNDS.rateLimit.min}–${AUTH_SETTINGS_BOUNDS.rateLimit.max}`,
          );
          continue;
        }
        limits[key as AuthRateLimitKey] = Math.round(n);
      }
      patch.rate_limits = limits as AuthRateLimits;
    }
  }
  if (raw.email_password_enabled !== undefined) {
    if (typeof raw.email_password_enabled !== "boolean") {
      errors.push("email_password_enabled must be a boolean");
    } else {
      patch.email_password_enabled = raw.email_password_enabled;
    }
  }
  if (raw.anonymous_enabled !== undefined) {
    if (typeof raw.anonymous_enabled !== "boolean") {
      errors.push("anonymous_enabled must be a boolean");
    } else {
      patch.anonymous_enabled = raw.anonymous_enabled;
    }
  }
  if (raw.custom_claims !== undefined) {
    const claims = validateCustomClaims(raw.custom_claims);
    if (!claims.ok) errors.push(claims.error);
    else patch.custom_claims = claims.value;
  }
  if (raw.session_ttl_seconds !== undefined) {
    const n = asInt(raw.session_ttl_seconds);
    if (
      n == null ||
      n < AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.min ||
      n > AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.max
    ) {
      errors.push(
        `session_ttl_seconds must be an integer ${AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.min}–${AUTH_SETTINGS_BOUNDS.sessionTtlSeconds.max}`,
      );
    } else {
      patch.session_ttl_seconds = Math.round(n);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, patch };
}

export type UpdateSettingsResult =
  | { ok: true; settings: JordAuthSettings; changed: string[] }
  | { ok: false; errors: string[] };

export async function updateAuthSettings(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  patch: unknown;
  updatedBy: string | null;
}): Promise<UpdateSettingsResult> {
  const parsed = parseAuthSettingsPatch(input.patch);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const current = await loadAuthSettings(input.jord);
  const now = Date.now();
  const next: JordAuthSettings = {
    ...current,
    ...parsed.patch,
    rate_limits: {
      ...current.rate_limits,
      ...(parsed.patch.rate_limits ?? {}),
    },
    updated_by: input.updatedBy,
    updated_at: now,
  };

  const changed = Object.keys(parsed.patch);
  if (changed.length === 0) return { ok: true, settings: current, changed };

  const values = [
    AUTH_SETTINGS_ID,
    next.signups_enabled ? 1 : 0,
    next.autoconfirm ? 1 : 0,
    next.password_min_length,
    next.site_url,
    JSON.stringify(next.redirect_allowlist),
    JSON.stringify(next.rate_limits),
    next.session_ttl_seconds,
    next.updated_by,
    next.updated_at,
    next.email_password_enabled ? 1 : 0,
    next.anonymous_enabled ? 1 : 0,
    JSON.stringify(next.custom_claims),
  ];

  await input.enqueueWrite(async () => {
    if (input.jord.dialect === "postgres") {
      await input.jord.query(
        `INSERT INTO jord_auth_settings (
          id, signups_enabled, autoconfirm, password_min_length, site_url,
          redirect_allowlist, rate_limits, session_ttl_seconds, updated_by, updated_at,
          email_password_enabled, anonymous_enabled, custom_claims
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          signups_enabled = EXCLUDED.signups_enabled,
          autoconfirm = EXCLUDED.autoconfirm,
          password_min_length = EXCLUDED.password_min_length,
          site_url = EXCLUDED.site_url,
          redirect_allowlist = EXCLUDED.redirect_allowlist,
          rate_limits = EXCLUDED.rate_limits,
          session_ttl_seconds = EXCLUDED.session_ttl_seconds,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at,
          email_password_enabled = EXCLUDED.email_password_enabled,
          anonymous_enabled = EXCLUDED.anonymous_enabled,
          custom_claims = EXCLUDED.custom_claims`,
        values,
      );
      return;
    }
    await input.jord.query(
      `INSERT INTO jord_auth_settings (
        id, signups_enabled, autoconfirm, password_min_length, site_url,
        redirect_allowlist, rate_limits, session_ttl_seconds, updated_by, updated_at,
        email_password_enabled, anonymous_enabled, custom_claims
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT (id) DO UPDATE SET
        signups_enabled = excluded.signups_enabled,
        autoconfirm = excluded.autoconfirm,
        password_min_length = excluded.password_min_length,
        site_url = excluded.site_url,
        redirect_allowlist = excluded.redirect_allowlist,
        rate_limits = excluded.rate_limits,
        session_ttl_seconds = excluded.session_ttl_seconds,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at,
        email_password_enabled = excluded.email_password_enabled,
        anonymous_enabled = excluded.anonymous_enabled,
        custom_claims = excluded.custom_claims`,
      values,
    );
  });

  await logAuthSettingsChange(input.jord, {
    actor: input.updatedBy,
    changed,
    settings: next,
  });

  return { ok: true, settings: next, changed };
}

/** `jord_logs` audit row. Never blocks a settings save. */
async function logAuthSettingsChange(
  jord: JordDriverPort,
  input: {
    actor: string | null;
    changed: string[];
    settings: JordAuthSettings;
  },
): Promise<void> {
  try {
    const now = Date.now();
    const meta = JSON.stringify({
      actor: input.actor,
      changed: input.changed,
      signups_enabled: input.settings.signups_enabled,
      autoconfirm: input.settings.autoconfirm,
      session_ttl_seconds: input.settings.session_ttl_seconds,
    });
    const id = randomUUID();
    if (jord.dialect === "postgres") {
      await jord.query(
        `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, now, "info", "auth.settings", "auth settings updated", meta],
      );
      return;
    }
    await jord.query(
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       VALUES (?,?,?,?,?,?)`,
      [id, now, "info", "auth.settings", "auth settings updated", meta],
    );
  } catch (err) {
    console.error("[@altr/jord-server] auth settings audit failed", err);
  }
}
