-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c
-- seed: phase-01-seed

CREATE TABLE jord_blobs (
      id TEXT PRIMARY KEY NOT NULL,
      bucket TEXT NOT NULL,
      key TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      etag TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_custom_apis (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      method TEXT NOT NULL,
      slug TEXT NOT NULL,
      function_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_embeddings (
      id TEXT PRIMARY KEY NOT NULL,
      namespace TEXT NOT NULL,
      ref_id TEXT,
      dims INTEGER NOT NULL,
      embedding BLOB NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_functions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      steps TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_job_runs (
      id TEXT PRIMARY KEY NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      error TEXT,
      result TEXT
    );
CREATE TABLE jord_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      interval_ms INTEGER NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      next_run_at INTEGER,
      last_run_at INTEGER,
      last_status TEXT,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_policies (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      effect TEXT NOT NULL,
      rules TEXT NOT NULL DEFAULT '[]',
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE jord_triggers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      timing TEXT NOT NULL DEFAULT 'after',
      event TEXT NOT NULL,
      actions TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
CREATE TABLE records (
      id TEXT PRIMARY KEY NOT NULL,
      bucket TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
CREATE INDEX jord_blobs_bucket_key_idx
    ON jord_blobs (bucket, key);
CREATE UNIQUE INDEX jord_blobs_bucket_key_uidx
    ON jord_blobs (bucket, key);
CREATE INDEX jord_custom_apis_function_id_idx
    ON jord_custom_apis (function_id);
CREATE UNIQUE INDEX jord_custom_apis_method_slug_uidx
    ON jord_custom_apis (method, slug);
CREATE INDEX jord_embeddings_namespace_updated_idx
    ON jord_embeddings (namespace, updated_at);
CREATE UNIQUE INDEX jord_functions_slug_uidx
    ON jord_functions (slug);
CREATE INDEX jord_job_runs_job_started_idx
    ON jord_job_runs (job_id, started_at);
CREATE INDEX jord_jobs_enabled_next_run_idx
    ON jord_jobs (enabled, next_run_at);
CREATE INDEX jord_policies_table_op_priority_idx
    ON jord_policies (table_name, operation, priority);
CREATE INDEX jord_triggers_table_event_idx
    ON jord_triggers (table_name, event);
CREATE INDEX records_bucket_created_at_idx
    ON records (bucket, created_at);

INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
VALUES ('phase-01-seed', 'baseline', '{"ok":true}', NULL, 1, 1, 1);
