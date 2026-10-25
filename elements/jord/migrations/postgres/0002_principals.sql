-- jord migration 0002_principals
-- End-user accounts, one-time confirm/reset tokens, and refresh-token families.

CREATE TABLE IF NOT EXISTS jord_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_users_email_uidx
ON jord_users (email);

CREATE TABLE IF NOT EXISTS jord_auth_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_auth_tokens_hash_uidx
ON jord_auth_tokens (token_hash);

CREATE TABLE IF NOT EXISTS jord_refresh_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT,
  replaced_by TEXT,
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_refresh_tokens_hash_uidx
ON jord_refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS jord_refresh_tokens_family_idx
ON jord_refresh_tokens (family_id);
