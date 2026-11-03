-- jord migration 0028_key_sets
-- S0093: signing-key sets with an overlap window. Secrets are sealed with the
-- secret port (JORD_MASTER_KEY); only keyed, non-secret fingerprints are
-- readable. One row per key family; current + previous are written together
-- in ONE upsert so a rotation is atomic.
--   id 'jwt'       -> current_* is the JWT signing key (supersedes the legacy
--                     jord_auth_settings.jwt_key_sealed column), previous_*
--                     the retiring key
--   id 'blob_hmac' -> blob signed-URL HMAC key, same layout
-- previous_revoked = 1 after an operator revoke: no previous key (stored or
-- env, e.g. JORD_JWT_SECRET_PREVIOUS) verifies until the next rotation.
-- A row whose current_sealed is NULL means "use the env key".
-- jord_project_key_previous holds retiring project key HASHES that still
-- verify until expires_at (never plaintext).

CREATE TABLE IF NOT EXISTS jord_key_sets (
  id TEXT PRIMARY KEY NOT NULL,
  current_sealed TEXT,
  current_fingerprint TEXT,
  previous_sealed TEXT,
  previous_fingerprint TEXT,
  previous_expires_at BIGINT,
  previous_revoked INTEGER NOT NULL DEFAULT 0,
  rotated_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS jord_project_key_previous (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  last4 TEXT NOT NULL,
  retired_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_project_key_previous_hash_idx
ON jord_project_key_previous (key_hash);

CREATE INDEX IF NOT EXISTS jord_project_key_previous_project_idx
ON jord_project_key_previous (project_id);
