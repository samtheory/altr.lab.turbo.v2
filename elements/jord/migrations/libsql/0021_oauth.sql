-- jord migration 0021_oauth
-- S0075: one OAuth provider (Google). Client secret is sealed (JORD_MASTER_KEY)
-- and never returned. States are single-use hashes; identities link by (provider, subject).

CREATE TABLE IF NOT EXISTS jord_oauth_providers (
  provider TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  client_id TEXT,
  client_secret_sealed TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jord_oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  redirect_to TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS jord_identities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_identities_provider_subject_uidx
ON jord_identities (provider, subject);
