-- jord migration 0005_studio_tools
-- Persisted logs, SQL audit, user disable, and resumable migrate jobs.

ALTER TABLE jord_users ADD COLUMN disabled_at INTEGER;

CREATE TABLE IF NOT EXISTS jord_logs (
  id TEXT PRIMARY KEY NOT NULL,
  at INTEGER NOT NULL,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  meta_json TEXT
);

CREATE INDEX IF NOT EXISTS jord_logs_at_idx ON jord_logs (at DESC);

CREATE TABLE IF NOT EXISTS jord_sql_audit (
  id TEXT PRIMARY KEY NOT NULL,
  at INTEGER NOT NULL,
  operator_uid TEXT,
  operator_role TEXT NOT NULL,
  read_only INTEGER NOT NULL,
  sql_text TEXT NOT NULL,
  ok INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  row_count INTEGER,
  error_text TEXT
);

CREATE INDEX IF NOT EXISTS jord_sql_audit_at_idx ON jord_sql_audit (at DESC);

CREATE TABLE IF NOT EXISTS jord_migrate_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  source_dialect TEXT NOT NULL,
  target_scheme TEXT NOT NULL,
  phase TEXT NOT NULL,
  tables_json TEXT NOT NULL,
  counts_json TEXT,
  error_text TEXT
);
