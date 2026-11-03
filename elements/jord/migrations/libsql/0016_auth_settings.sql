-- jord migration 0016_auth_settings
-- S0069: one per-project auth settings document. Enforcement lives in
-- cloud/jord/src/auth (signup gate, autoconfirm, password policy, redirects,
-- per-endpoint rate limits, session TTL). Missing row = today's defaults.

CREATE TABLE IF NOT EXISTS jord_auth_settings (
  id TEXT PRIMARY KEY NOT NULL,
  signups_enabled INTEGER NOT NULL DEFAULT 1,
  autoconfirm INTEGER NOT NULL DEFAULT 0,
  password_min_length INTEGER NOT NULL DEFAULT 10,
  site_url TEXT,
  redirect_allowlist TEXT,
  rate_limits TEXT,
  session_ttl_seconds INTEGER NOT NULL DEFAULT 900,
  updated_by TEXT,
  updated_at INTEGER NOT NULL
);
