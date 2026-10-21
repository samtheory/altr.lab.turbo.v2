import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type { JordColumnType } from "./schema/ddl.js";
import type { schema } from "./schema/records.js";

export type { JordColumnType } from "./schema/ddl.js";

/** PRAGMA table_info–shaped column (Studio schema browser). */
export type JordColumnInfo = {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
};

export type JordTableInfo = {
  name: string;
  columns: JordColumnInfo[];
};

export type AddColumnInput = {
  table: string;
  name: string;
  type: JordColumnType;
};

export type AddColumnResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid_identifier"
        | "invalid_type"
        | "table_not_found"
        | "column_exists";
      message: string;
    };

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
  /** Hard delete. Returns true if a row was removed. */
  deleteRecord(id: string): Promise<boolean>;

  /** User tables from sqlite_master (excludes sqlite_*). */
  listTables(): Promise<string[]>;
  /** Columns via PRAGMA table_info; null if table missing. */
  describeTable(name: string): Promise<JordTableInfo | null>;
  /** Additive DDL only — ADD COLUMN with type whitelist. */
  addColumn(input: AddColumnInput): Promise<AddColumnResult>;

  /**
   * Consistent snapshot via SQLite `VACUUM INTO` (online backup substitute
   * exposed through libSQL SQL). Returns the destination path.
   */
  snapshotTo(destPath: string): Promise<string>;
}
