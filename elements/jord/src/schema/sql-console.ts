export type ExecuteSqlInput = {
  sql: string;
  args?: Array<string | number | null>;
  readOnly: boolean;
  /** Default 5000. */
  timeoutMs?: number;
  /** Default 200. */
  rowCap?: number;
};

export type ExecuteSqlResult = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
};

export const DEFAULT_SQL_TIMEOUT_MS = 5_000;
export const DEFAULT_SQL_ROW_CAP = 200;

export function clampSqlTimeout(ms: number | undefined): number {
  if (ms == null || !Number.isFinite(ms)) return DEFAULT_SQL_TIMEOUT_MS;
  return Math.max(100, Math.min(Math.trunc(ms), 60_000));
}

export function clampSqlRowCap(cap: number | undefined): number {
  if (cap == null || !Number.isFinite(cap)) return DEFAULT_SQL_ROW_CAP;
  return Math.max(1, Math.min(Math.trunc(cap), 1_000));
}
