/**
 * Saved SQL queries (S0064). Stored in the project database — user data, not
 * control-plane metadata. History stays on jord_sql_audit (no duplicate table).
 */

import { randomUUID } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

export type SavedQuery = {
  id: string;
  name: string;
  sql: string;
  ownerUid: string | null;
  createdAt: number;
  updatedAt: number;
};

const NAME_MAX = 120;
const SQL_MAX = 8_000;
const LIST_CAP = 200;

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

function mapRow(row: Record<string, unknown>): SavedQuery {
  return {
    id: asText(row.id),
    name: asText(row.name),
    sql: asText(row.sql_text),
    ownerUid: row.owner_uid == null ? null : asText(row.owner_uid),
    createdAt: asNumber(row.created_at),
    updatedAt: asNumber(row.updated_at),
  };
}

export function normalizeSavedQueryName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  if (!name || name.length > NAME_MAX) return null;
  return name;
}

export function normalizeSavedQuerySql(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const sql = raw.trim();
  if (!sql || sql.length > SQL_MAX) return null;
  return sql;
}

export async function listSavedQueries(
  jord: JordDriverPort,
  opts: { q?: string; limit?: number } = {},
): Promise<SavedQuery[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? LIST_CAP, LIST_CAP));
  const q = opts.q?.trim() ?? "";
  const rows = q
    ? await jord.query(
        `SELECT id, name, sql_text, owner_uid, created_at, updated_at
         FROM jord_saved_queries
         WHERE lower(name) LIKE lower(${ph(jord, 1)})
            OR lower(sql_text) LIKE lower(${ph(jord, 2)})
         ORDER BY updated_at DESC
         LIMIT ${ph(jord, 3)}`,
        [`%${q}%`, `%${q}%`, limit],
      )
    : await jord.query(
        `SELECT id, name, sql_text, owner_uid, created_at, updated_at
         FROM jord_saved_queries
         ORDER BY updated_at DESC
         LIMIT ${ph(jord, 1)}`,
        [limit],
      );
  return rows.map(mapRow);
}

export async function getSavedQuery(
  jord: JordDriverPort,
  id: string,
): Promise<SavedQuery | null> {
  const rows = await jord.query(
    `SELECT id, name, sql_text, owner_uid, created_at, updated_at
     FROM jord_saved_queries WHERE id = ${ph(jord, 1)} LIMIT 1`,
    [id],
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function createSavedQuery(
  jord: JordDriverPort,
  input: { name: string; sql: string; ownerUid: string | null },
): Promise<SavedQuery> {
  const id = randomUUID();
  const now = Date.now();
  await jord.query(
    `INSERT INTO jord_saved_queries
       (id, name, sql_text, owner_uid, created_at, updated_at)
     VALUES (${ph(jord, 1)}, ${ph(jord, 2)}, ${ph(jord, 3)}, ${ph(jord, 4)}, ${ph(jord, 5)}, ${ph(jord, 6)})`,
    [id, input.name, input.sql, input.ownerUid, now, now],
  );
  return {
    id,
    name: input.name,
    sql: input.sql,
    ownerUid: input.ownerUid,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateSavedQuery(
  jord: JordDriverPort,
  id: string,
  patch: { name?: string; sql?: string },
): Promise<SavedQuery | null> {
  const existing = await getSavedQuery(jord, id);
  if (!existing) return null;
  const name = patch.name ?? existing.name;
  const sql = patch.sql ?? existing.sql;
  const now = Date.now();
  await jord.query(
    `UPDATE jord_saved_queries
     SET name = ${ph(jord, 1)}, sql_text = ${ph(jord, 2)}, updated_at = ${ph(jord, 3)}
     WHERE id = ${ph(jord, 4)}`,
    [name, sql, now, id],
  );
  return { ...existing, name, sql, updatedAt: now };
}

export async function deleteSavedQuery(
  jord: JordDriverPort,
  id: string,
): Promise<boolean> {
  const existing = await getSavedQuery(jord, id);
  if (!existing) return false;
  await jord.query(
    `DELETE FROM jord_saved_queries WHERE id = ${ph(jord, 1)}`,
    [id],
  );
  return true;
}
