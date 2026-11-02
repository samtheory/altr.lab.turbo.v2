-- jord migration 0015_buckets_registry
-- S0066: first-class bucket rows with per-bucket provider + limits.
-- Credentials sealed columns are reserved for S0067 (write-only secret store).

CREATE TABLE IF NOT EXISTS jord_buckets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT,
  region TEXT,
  physical_bucket TEXT,
  key_prefix TEXT,
  force_path_style INTEGER NOT NULL DEFAULT 0,
  access_key_sealed TEXT,
  secret_key_sealed TEXT,
  session_token_sealed TEXT,
  public_read INTEGER NOT NULL DEFAULT 0,
  max_object_bytes BIGINT,
  allowed_mime_types TEXT,
  sign_ttl_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  linked_table TEXT,
  created_by TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_write_at BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_buckets_name_uidx
  ON jord_buckets (name);

CREATE INDEX IF NOT EXISTS jord_buckets_status_idx
  ON jord_buckets (status);
