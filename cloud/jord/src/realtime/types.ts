/**
 * Realtime change contract (S0011 + S0018).
 * Emit after a successful write-queue mutation. SSE / WS carry this JSON.
 * Never include body, secrets, or DATABASE_URL.
 */

import { isReservedCreateTableName, isValidSqlIdent } from "@altr/jord";

export const REALTIME_V1_TABLE = "records" as const;

/** Shared cap for SSE + WebSocket subscribers on one process. */
export const MAX_REALTIME_SUBSCRIBERS = 48;

/**
 * `resync` is table-level and advisory (B4): emitted after a Studio SQL
 * console write or a migrate-wizard apply, when the touched rows are unknown.
 * It has `id: ""`, no row JSON, and tells subscribers to refetch the table.
 */
export type JordChangeOp = "insert" | "update" | "delete" | "resync";

export type JordChangeEvent = {
  type: "jord.change";
  table: string;
  op: JordChangeOp;
  id: string;
  /** OCC version for `records` only; omitted on delete when the row is gone. */
  version?: number;
  at: number;
  dialect: "libsql" | "postgres";
  /** Outbox sequence for resume (`?since=`). */
  seq?: number;
};

export type JordChangeDraft = {
  /** Defaults to `records` when omitted (legacy records emit sites). */
  table?: string;
  /** Schema of `table`; defaults to the adapter's default schema. */
  schema?: string;
  op: JordChangeOp;
  id: string;
  version?: number;
  oldRow?: Record<string, unknown> | null;
  newRow?: Record<string, unknown> | null;
  blobColumns?: string[];
};

/**
 * Run `work` on the write queue in one transaction with the outbox rows for
 * its changes, then fan out after commit. A throw rolls back both.
 */
export type WriteWithChange = <T>(
  work: () => Promise<T>,
  changes: (result: T) => JordChangeDraft | JordChangeDraft[] | null,
) => Promise<T>;

/**
 * Subscribe channel: `records` or a user-table ident (not reserved).
 * Does not require the table to exist yet.
 */
export function isRealtimeSubscribeTable(name: string): boolean {
  if (name === REALTIME_V1_TABLE) return true;
  if (!isValidSqlIdent(name)) return false;
  if (isReservedCreateTableName(name)) return false;
  return true;
}
