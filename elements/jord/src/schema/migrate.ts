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
}
