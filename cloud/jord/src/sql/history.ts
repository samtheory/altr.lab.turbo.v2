/**
 * SQL execution history (S0064). Read model over jord_sql_audit — never a
 * second history table.
 */

import type { JordDriverPort } from "@altr/jord";

export type SqlHistoryEntry = {
  id: string;
  at: number;
  sql: string;
  readOnly: boolean;
  ok: boolean;
  elapsedMs: number;
  rowCount: number | null;
  errorText: string | null;
  operatorUid: string | null;
  operatorRole: string;
};

const HISTORY_CAP = 100;

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "t" || value === "true" || value === "1";
  return Boolean(value);
}

function mapRow(row: Record<string, unknown>): SqlHistoryEntry {
  return {
    id: asText(row.id),
    at: asNumber(row.at),
    sql: asText(row.sql_text),
    readOnly: asBool(row.read_only),
    ok: asBool(row.ok),
    elapsedMs: asNumber(row.elapsed_ms),
    rowCount: row.row_count == null ? null : asNumber(row.row_count),
    errorText: row.error_text == null ? null : asText(row.error_text),
    operatorUid: row.operator_uid == null ? null : asText(row.operator_uid),
    operatorRole: asText(row.operator_role),
  };
}

export async function listSqlHistory(
  jord: JordDriverPort,
  opts: { q?: string; failedOnly?: boolean; limit?: number } = {},
): Promise<SqlHistoryEntry[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? HISTORY_CAP, HISTORY_CAP));
  const q = opts.q?.trim() ?? "";
  const failedOnly = opts.failedOnly === true;

  const where: string[] = [];
  const params: Array<string | number> = [];
  let n = 1;

  if (q) {
    where.push(`lower(sql_text) LIKE lower(${ph(jord, n)})`);
    params.push(`%${q}%`);
    n += 1;
  }
  if (failedOnly) {
    where.push(
      jord.dialect === "postgres"
        ? `ok = false`
        : `ok = 0`,
    );
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit);

  const rows = await jord.query(
    `SELECT id, at, operator_uid, operator_role, read_only, sql_text, ok,
            elapsed_ms, row_count, error_text
     FROM jord_sql_audit
     ${whereSql}
     ORDER BY at DESC
     LIMIT ${ph(jord, n)}`,
    params,
  );
  return rows.map(mapRow);
}
