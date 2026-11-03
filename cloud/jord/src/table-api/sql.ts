import {
  defaultSchemaFor,
  quoteIdent,
  quoteQualified,
  rowScopeSql,
  type JordTableInfo,
  type RowScope,
} from "@altr/jord";

import { keysetWhere, type KeysetOrder } from "./keyset.js";
import {
  pkColumns,
  type Filter,
  type ParsedTableQuery,
  type SqlValue,
  TableApiError,
} from "./query.js";

export type CompiledSql = {
  sql: string;
  args: SqlValue[];
};

/**
 * `"schema"."table"` from `describeTable` (schema-scoped introspection, S0049).
 * `info.schema` is set by every adapter; the fallback covers hand-built infos.
 */
function tableSql(info: JordTableInfo, dialect: "libsql" | "postgres"): string {
  return quoteQualified(info.schema ?? defaultSchemaFor(dialect), info.name);
}

function placeholders(sql: string, dialect: "libsql" | "postgres"): string {
  if (dialect !== "postgres") return sql;
  let n = 0;
  return sql.replace(/\?/g, () => {
    n += 1;
    return `$${n}`;
  });
}

function whereSql(
  filters: Filter[],
  args: SqlValue[],
  scope?: { scope: RowScope; columns: string[] },
): string {
  const parts = filters.map((filter) => {
    const col = quoteIdent(filter.column);
    if (filter.isNull) return `${col} IS NULL`;
    if (filter.isNotNull) return `${col} IS NOT NULL`;
    if (filter.op === "in") {
      const marks = filter.values.map(() => "?").join(", ");
      args.push(...filter.values);
      return `${col} IN (${marks})`;
    }
    const value = filter.values[0] ?? null;
    args.push(value);
    if (filter.op === "ilike") return `lower(${col}) LIKE lower(?)`;
    const op =
      filter.op === "eq"
        ? "="
        : filter.op === "neq"
          ? "<>"
          : filter.op === "gt"
            ? ">"
            : filter.op === "gte"
              ? ">="
              : filter.op === "lt"
                ? "<"
                : filter.op === "lte"
                  ? "<="
                  : "LIKE";
    return `${col} ${op} ?`;
  });
  if (scope) {
    const scopeArgs: Array<string | number | null> = [];
    parts.push(rowScopeSql(scope.scope, scope.columns, scopeArgs));
    args.push(...scopeArgs);
  }
  if (parts.length === 0) return "";
  return ` WHERE ${parts.join(" AND ")}`;
}

/** Row scope bound to a table's columns for the compile helpers. */
export type ScopeFor = { scope: RowScope; columns: string[] };

export function scopeFor(info: JordTableInfo, scope: RowScope | undefined): ScopeFor | undefined {
  return scope ? { scope, columns: info.columns.map((col) => col.name) } : undefined;
}

function selectList(info: JordTableInfo, parsed: ParsedTableQuery): string {
  const names = parsed.select ?? info.columns.map((col) => col.name);
  return names.map((name) => quoteIdent(name)).join(", ");
}

export function filtersForWrite(
  info: JordTableInfo,
  parsed: ParsedTableQuery,
): Filter[] {
  if (parsed.pk.length === 0) return parsed.filters;
  const keys = pkColumns(info);
  if (keys.length === 0) {
    throw new TableApiError(400, "no_key", "table has no stable key");
  }
  if (parsed.pk.length !== keys.length) {
    throw new TableApiError(400, "bad_pk", "pk params must match the primary key");
  }
  const extra: Filter[] = keys.map((col, i) => ({
    column: col.name,
    op: "eq",
    values: [parsed.pk[i]!.match(/^-?\d+$/) && col.type.toUpperCase().includes("INT")
      ? Number(parsed.pk[i])
      : parsed.pk[i]!],
  }));
  return [...parsed.filters, ...extra];
}

export function compileSelect(
  info: JordTableInfo,
  parsed: ParsedTableQuery,
  dialect: "libsql" | "postgres",
  scope?: ScopeFor,
): CompiledSql {
  const args: SqlValue[] = [];
  const where = whereSql(parsed.filters, args, scope);
  const order =
    parsed.order.length === 0
      ? ""
      : ` ORDER BY ${parsed.order
          .map((item) => `${quoteIdent(item.column)} ${item.dir === "desc" ? "DESC" : "ASC"}`)
          .join(", ")}`;
  args.push(parsed.limit, parsed.offset);
  const sql = placeholders(
    `SELECT ${selectList(info, parsed)} FROM ${tableSql(info, dialect)}${where}${order} LIMIT ? OFFSET ?`,
    dialect,
  );
  return { sql, args };
}

/**
 * Keyset page (S0079): same filters + row scope as `compileSelect`, plus the cursor predicate,
 * a total ORDER BY and `LIMIT limit+1` (the extra row signals `has_more`).
 */
export function compileKeysetSelect(
  info: JordTableInfo,
  parsed: ParsedTableQuery,
  dialect: "libsql" | "postgres",
  order: KeysetOrder,
  after: SqlValue[] | null,
  scope?: ScopeFor,
): CompiledSql {
  const args: SqlValue[] = [];
  let where = whereSql(parsed.filters, args, scope);
  if (after) {
    const clause = keysetWhere(order, after, args);
    where = where ? `${where} AND ${clause}` : ` WHERE ${clause}`;
  }
  const orderSql = ` ORDER BY ${order
    .map((item) => `${quoteIdent(item.column)} ${item.dir === "desc" ? "DESC" : "ASC"}`)
    .join(", ")}`;
  args.push(parsed.limit + 1);
  const sql = placeholders(
    `SELECT ${selectList(info, parsed)} FROM ${tableSql(info, dialect)}${where}${orderSql} LIMIT ?`,
    dialect,
  );
  return { sql, args };
}

export function compileCount(
  info: JordTableInfo,
  filters: Filter[],
  dialect: "libsql" | "postgres",
  scope?: ScopeFor,
): CompiledSql {
  const args: SqlValue[] = [];
  const where = whereSql(filters, args, scope);
  return {
    sql: placeholders(
      `SELECT COUNT(*) AS n FROM ${tableSql(info, dialect)}${where}`,
      dialect,
    ),
    args,
  };
}

export function compileInsert(
  info: JordTableInfo,
  values: Record<string, SqlValue>,
  dialect: "libsql" | "postgres",
): CompiledSql {
  const cols = Object.keys(values);
  if (cols.length === 0) {
    throw new TableApiError(400, "bad_body", "JSON object of columns is required");
  }
  const args = cols.map((name) => values[name] ?? null);
  const sql = placeholders(
    `INSERT INTO ${tableSql(info, dialect)} (${cols.map((c) => quoteIdent(c)).join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`,
    dialect,
  );
  return { sql, args };
}

export function compileUpdate(
  info: JordTableInfo,
  values: Record<string, SqlValue>,
  filters: Filter[],
  dialect: "libsql" | "postgres",
  bumpVersion: boolean,
  allowUnfiltered = false,
  scope?: ScopeFor,
  locked?: { keys: string[]; rows: Array<Record<string, unknown>> },
): CompiledSql {
  const cols = Object.keys(values).filter((name) => name !== "version" || !bumpVersion);
  if (cols.length === 0 && !bumpVersion) {
    throw new TableApiError(400, "bad_body", "JSON object of columns is required");
  }
  const args: SqlValue[] = cols.map((name) => values[name] ?? null);
  const sets = cols.map((name) => `${quoteIdent(name)} = ?`);
  if (bumpVersion) sets.push(`${quoteIdent("version")} = ${quoteIdent("version")} + 1`);
  if (filters.length === 0 && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "PATCH requires a filter");
  }
  let where = whereSql(filters, args, scope);
  if (locked && locked.rows.length > 0 && locked.keys.length > 0) {
    const clause = lockedRowsClause(locked.keys, locked.rows, args);
    where = where ? `${where} AND ${clause}` : ` WHERE ${clause}`;
  }
  if (!where && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "PATCH requires a filter");
  }
  return {
    sql: placeholders(
      `UPDATE ${tableSql(info, dialect)} SET ${sets.join(", ")}${where} RETURNING *`,
      dialect,
    ),
    args,
  };
}

/** Rows a PATCH will change, locked on Postgres so the following update sees the same set. */
export function compilePriorSelect(
  info: JordTableInfo,
  filters: Filter[],
  dialect: "libsql" | "postgres",
  allowUnfiltered = false,
  scope?: ScopeFor,
): CompiledSql {
  const args: SqlValue[] = [];
  const where = whereSql(filters, args, scope);
  if (!where && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "PATCH requires a filter");
  }
  const lock = dialect === "postgres" ? " FOR UPDATE" : "";
  return {
    sql: placeholders(`SELECT * FROM ${tableSql(info, dialect)}${where}${lock}`, dialect),
    args,
  };
}

function lockedRowsClause(
  keys: string[],
  rows: Array<Record<string, unknown>>,
  args: SqlValue[],
): string {
  const valueOf = (value: unknown): SqlValue =>
    typeof value === "string" || typeof value === "number" || value === null ? value : String(value ?? "");
  if (keys.length === 1) {
    const key = keys[0]!;
    for (const row of rows) args.push(valueOf(row[key]));
    return `${quoteIdent(key)} IN (${rows.map(() => "?").join(", ")})`;
  }
  const groups = rows.map((row) => {
    const parts = keys.map((key) => {
      args.push(valueOf(row[key]));
      return `${quoteIdent(key)} = ?`;
    });
    return `(${parts.join(" AND ")})`;
  });
  return `(${groups.join(" OR ")})`;
}

export function compileDelete(
  info: JordTableInfo,
  filters: Filter[],
  dialect: "libsql" | "postgres",
  allowUnfiltered = false,
  scope?: ScopeFor,
): CompiledSql {
  if (filters.length === 0 && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "DELETE requires a filter");
  }
  const args: SqlValue[] = [];
  const where = whereSql(filters, args, scope);
  if (!where && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "DELETE requires a filter");
  }
  return {
    sql: placeholders(
      `DELETE FROM ${tableSql(info, dialect)}${where} RETURNING *`,
      dialect,
    ),
    args,
  };
}
