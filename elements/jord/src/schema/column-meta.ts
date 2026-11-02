import {
  type ColumnSettings,
  deserializeColumnSettings,
  serializeColumnSettings,
} from "./column-settings.js";
import { isValidSqlIdent, quoteIdent } from "./ddl.js";

export type ColumnMetaQuery = {
  execute: (input: {
    sql: string;
    args: Array<string | number | null>;
  }) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

/** Load settings map for one table. Missing rows → empty map. */
export async function loadColumnSettingsMap(
  client: ColumnMetaQuery,
  dialect: "libsql" | "postgres",
  schema: string,
  table: string,
): Promise<Map<string, ColumnSettings>> {
  if (!isValidSqlIdent(schema) || !isValidSqlIdent(table)) {
    return new Map();
  }
  const sql =
    dialect === "postgres"
      ? `SELECT column_name, settings_json FROM jord_column_settings
         WHERE schema_name = $1 AND table_name = $2`
      : `SELECT column_name, settings_json FROM jord_column_settings
         WHERE schema_name = ? AND table_name = ?`;
  try {
    const rs = await client.execute({ sql, args: [schema, table] });
    const out = new Map<string, ColumnSettings>();
    for (const row of rs.rows) {
      const name = String(row.column_name ?? "");
      const json = String(row.settings_json ?? "{}");
      const parsed = deserializeColumnSettings(json);
      if (parsed.ok) out.set(name, parsed.settings);
    }
    return out;
  } catch {
    // Table may not exist yet during early boot before migrations.
    return new Map();
  }
}

export async function upsertColumnSettings(
  client: ColumnMetaQuery,
  dialect: "libsql" | "postgres",
  schema: string,
  table: string,
  column: string,
  settings: ColumnSettings,
  nowMs: number = Date.now(),
): Promise<void> {
  if (
    !isValidSqlIdent(schema) ||
    !isValidSqlIdent(table) ||
    !isValidSqlIdent(column)
  ) {
    throw new Error("[@altr/jord] invalid identifier for column settings");
  }
  const json = serializeColumnSettings(settings);
  if (dialect === "postgres") {
    await client.execute({
      sql: `INSERT INTO jord_column_settings (schema_name, table_name, column_name, settings_json, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (schema_name, table_name, column_name)
            DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = EXCLUDED.updated_at`,
      args: [schema, table, column, json, nowMs],
    });
    return;
  }
  await client.execute({
    sql: `INSERT OR REPLACE INTO jord_column_settings
          (schema_name, table_name, column_name, settings_json, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [schema, table, column, json, nowMs],
  });
}

export async function deleteColumnSettings(
  client: ColumnMetaQuery,
  dialect: "libsql" | "postgres",
  schema: string,
  table: string,
  column?: string,
): Promise<void> {
  if (!isValidSqlIdent(schema) || !isValidSqlIdent(table)) return;
  if (column !== undefined) {
    if (!isValidSqlIdent(column)) return;
    const sql =
      dialect === "postgres"
        ? `DELETE FROM jord_column_settings
           WHERE schema_name = $1 AND table_name = $2 AND column_name = $3`
        : `DELETE FROM jord_column_settings
           WHERE schema_name = ? AND table_name = ? AND column_name = ?`;
    await client.execute({ sql, args: [schema, table, column] });
    return;
  }
  const sql =
    dialect === "postgres"
      ? `DELETE FROM jord_column_settings WHERE schema_name = $1 AND table_name = $2`
      : `DELETE FROM jord_column_settings WHERE schema_name = ? AND table_name = ?`;
  await client.execute({ sql, args: [schema, table] });
}

export async function renameColumnSettings(
  client: ColumnMetaQuery,
  dialect: "libsql" | "postgres",
  schema: string,
  table: string,
  from: string,
  to: string,
): Promise<void> {
  if (
    !isValidSqlIdent(schema) ||
    !isValidSqlIdent(table) ||
    !isValidSqlIdent(from) ||
    !isValidSqlIdent(to)
  ) {
    return;
  }
  const sql =
    dialect === "postgres"
      ? `UPDATE jord_column_settings SET column_name = $1
         WHERE schema_name = $2 AND table_name = $3 AND column_name = $4`
      : `UPDATE jord_column_settings SET column_name = ?
         WHERE schema_name = ? AND table_name = ? AND column_name = ?`;
  await client.execute({
    sql,
    args: dialect === "postgres" ? [to, schema, table, from] : [to, schema, table, from],
  });
}

export async function renameTableColumnSettings(
  client: ColumnMetaQuery,
  dialect: "libsql" | "postgres",
  schema: string,
  fromTable: string,
  toTable: string,
): Promise<void> {
  if (
    !isValidSqlIdent(schema) ||
    !isValidSqlIdent(fromTable) ||
    !isValidSqlIdent(toTable)
  ) {
    return;
  }
  const sql =
    dialect === "postgres"
      ? `UPDATE jord_column_settings SET table_name = $1
         WHERE schema_name = $2 AND table_name = $3`
      : `UPDATE jord_column_settings SET table_name = ?
         WHERE schema_name = ? AND table_name = ?`;
  await client.execute({
    sql,
    args: [toTable, schema, fromTable],
  });
}

/** Debug helper — quoted table name for docs only. */
export function columnSettingsTableRef(): string {
  return quoteIdent("jord_column_settings");
}
