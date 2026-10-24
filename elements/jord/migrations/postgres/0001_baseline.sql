-- jord migration 0001_baseline
-- Adopts phase-01 control-plane tables. Body is frozen: a checksum mismatch refuses boot.

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY NOT NULL,
  bucket TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS records_bucket_created_at_idx
ON records (bucket, created_at);

CREATE TABLE IF NOT EXISTS jord_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  interval_ms INTEGER NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  next_run_at BIGINT,
  last_run_at BIGINT,
  last_status TEXT,
  last_error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_jobs_enabled_next_run_idx
ON jord_jobs (enabled, next_run_at);

CREATE TABLE IF NOT EXISTS jord_job_runs (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  finished_at BIGINT,
  error TEXT,
  result TEXT
);

CREATE INDEX IF NOT EXISTS jord_job_runs_job_started_idx
ON jord_job_runs (job_id, started_at);

CREATE TABLE IF NOT EXISTS jord_functions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_functions_slug_uidx
ON jord_functions (slug);

CREATE TABLE IF NOT EXISTS jord_custom_apis (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  slug TEXT NOT NULL,
  function_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_custom_apis_method_slug_uidx
ON jord_custom_apis (method, slug);

CREATE INDEX IF NOT EXISTS jord_custom_apis_function_id_idx
ON jord_custom_apis (function_id);

CREATE TABLE IF NOT EXISTS jord_policies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  effect TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_policies_table_op_priority_idx
ON jord_policies (table_name, operation, priority);

CREATE TABLE IF NOT EXISTS jord_triggers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  timing TEXT NOT NULL DEFAULT 'after',
  event TEXT NOT NULL,
  actions TEXT NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_triggers_table_event_idx
ON jord_triggers (table_name, event);

CREATE TABLE IF NOT EXISTS jord_blobs (
  id TEXT PRIMARY KEY NOT NULL,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  etag TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS jord_blobs_bucket_key_uidx
ON jord_blobs (bucket, key);

CREATE INDEX IF NOT EXISTS jord_blobs_bucket_key_idx
ON jord_blobs (bucket, key);

CREATE TABLE IF NOT EXISTS jord_embeddings (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL,
  ref_id TEXT,
  dims INTEGER NOT NULL,
  embedding BYTEA NOT NULL,
  metadata TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_embeddings_namespace_updated_idx
ON jord_embeddings (namespace, updated_at);
