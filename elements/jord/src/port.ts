import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type { schema } from "./schema/records.js";

export type JordRecord = {
  id: string;
  bucket: string;
  body: string;
  metadata: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
};

export type InsertRecordInput = {
  bucket: string;
  body: string;
  metadata?: string | null;
};

export type UpdateRecordInput = {
  id: string;
  /** Caller’s expected version; must match or update conflicts. */
  version: number;
  body?: string;
  metadata?: string | null;
  bucket?: string;
};

/** Library OCC result — HTTP layer maps `conflict` to 409. */
export type UpdateRecordResult =
  | { ok: true; record: JordRecord }
  | { ok: false; conflict: true };

export type JordDb = LibSQLDatabase<typeof schema>;

/**
 * Dialect-agnostic surface. Slice 0 installs only LibSqlAdapter.
 * PostgresAdapter is a reserved uninstantiated seam (not imported).
 */
export interface JordDriverPort {
  readonly dialect: "libsql";
  /** Raw libSQL client for pragmas / VACUUM INTO / checkpoints. */
  readonly client: Client;
  /** Drizzle handle over the same connection. */
  readonly db: JordDb;

  close(): Promise<void>;
  /** `PRAGMA wal_checkpoint(TRUNCATE)` — server owns periodic + shutdown calls. */
  checkpointTruncate(): Promise<void>;

  insertRecord(input: InsertRecordInput): Promise<JordRecord>;
  getRecord(id: string): Promise<JordRecord | null>;
  listRecordsByBucket(bucket: string): Promise<JordRecord[]>;
  updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult>;

  /**
   * Consistent snapshot via SQLite `VACUUM INTO` (online backup substitute
   * exposed through libSQL SQL). Returns the destination path.
   */
  snapshotTo(destPath: string): Promise<string>;
}
