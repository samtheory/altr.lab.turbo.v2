import type { Client } from "@libsql/client";

/** Idempotent CREATE TABLE / INDEX for Slice 0 (no drizzle-kit). */
export async function ensureRecordsSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY NOT NULL,
      bucket TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS records_bucket_created_at_idx
    ON records (bucket, created_at)
  `);
  await ensureJobsSchema(client);
  await ensureFunctionsSchema(client);
  await ensurePoliciesSchema(client);
  await ensureTriggersSchema(client);
  await ensureBlobsSchema(client);
}

/** Studio S5 job definitions + run history. */
export async function ensureJobsSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_jobs (
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
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_jobs_enabled_next_run_idx
    ON jord_jobs (enabled, next_run_at)
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_job_runs (
      id TEXT PRIMARY KEY NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      error TEXT,
      result TEXT
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_job_runs_job_started_idx
    ON jord_job_runs (job_id, started_at)
  `);
}

/** Studio S6 functions + custom API bindings. */
export async function ensureFunctionsSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_functions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      steps TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS jord_functions_slug_uidx
    ON jord_functions (slug)
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_custom_apis (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      method TEXT NOT NULL,
      slug TEXT NOT NULL,
      function_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS jord_custom_apis_method_slug_uidx
    ON jord_custom_apis (method, slug)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_custom_apis_function_id_idx
    ON jord_custom_apis (function_id)
  `);
}

/** Studio S7 policies (libSQL middleware definitions). */
export async function ensurePoliciesSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_policies (
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
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_policies_table_op_priority_idx
    ON jord_policies (table_name, operation, priority)
  `);
}

/** Studio S7 AFTER write triggers. */
export async function ensureTriggersSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_triggers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      timing TEXT NOT NULL DEFAULT 'after',
      event TEXT NOT NULL,
      actions TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_triggers_table_event_idx
    ON jord_triggers (table_name, event)
  `);
}

/** Studio S10 blob object metadata. */
export async function ensureBlobsSchema(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jord_blobs (
      id TEXT PRIMARY KEY NOT NULL,
      bucket TEXT NOT NULL,
      key TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      etag TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS jord_blobs_bucket_key_uidx
    ON jord_blobs (bucket, key)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS jord_blobs_bucket_key_idx
    ON jord_blobs (bucket, key)
  `);
}
