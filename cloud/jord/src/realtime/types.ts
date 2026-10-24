/**
 * Studio S9 realtime contract (Jord-S0011).
 * Emit after a successful records write. SSE carries this JSON.
 * Never include body, secrets, or DATABASE_URL.
 */

export const REALTIME_V1_TABLE = "records" as const;

export const MAX_REALTIME_SUBSCRIBERS = 32;

export type JordChangeOp = "insert" | "update" | "delete";

export type JordChangeEvent = {
  type: "jord.change";
  table: typeof REALTIME_V1_TABLE;
  op: JordChangeOp;
  id: string;
  /** Omitted on delete when the row is gone. */
  version?: number;
  at: number;
  dialect: "libsql" | "postgres";
};

export type JordChangeDraft = {
  op: JordChangeOp;
  id: string;
  version?: number;
};
