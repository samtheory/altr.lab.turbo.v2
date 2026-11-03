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
  /** `lock: false` = plain probe (no FOR UPDATE); `columns` limits the select list. */
  probe?: { lock?: boolean; columns?: string[] },
): CompiledSql {
  const args: SqlValue[] = [];
  const where = whereSql(filters, args, scope);
  if (!where && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "PATCH requires a filter");
  }
  const lock = dialect === "postgres" && probe?.lock !== false ? " FOR UPDATE" : "";
  const list = probe?.columns?.length ? probe.columns.map((name) => quoteIdent(name)).join(", ") : "*";
  return {
    sql: placeholders(`SELECT ${list} FROM ${tableSql(info, dialect)}${where}${lock}`, dialect),
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

/**
 * Batched embed fetch (S0078): every related row for a set of parent keys in ONE statement.
 *
 * Policy parity: the WHERE is built by the same `whereSql` + row scope as a direct
 * `GET /api/v1/<target>` (the scope is the embedded table's own decision for the same principal),
 * ANDed with the key set. So an embed can only return a subset of what a direct read returns.
 *
 * `perParent` (one-to-many) caps rows per parent with ROW_NUMBER() OVER (PARTITION BY fk), applied
 * after the scope filter, so hidden rows never take a slot. `perParent + 1` rows are fetched so the
 * caller can tell a truncated list. `LIMIT total + 1` bounds the whole statement.
 */
export function compileEmbedSelect(
  target: JordTableInfo,
  columns: string[],
  matchColumns: string[],
  keys: SqlValue[][],
  dialect: "libsql" | "postgres",
  caps: { perParent: number | null; total: number },
  scope?: ScopeFor,
): CompiledSql {
  if (matchColumns.length === 0 || keys.length === 0) {
    throw new Error("compileEmbedSelect needs match columns and keys");
  }
  const args: SqlValue[] = [];
  const keyFilters: Filter[] =
    matchColumns.length === 1
      ? [{ column: matchColumns[0]!, op: "in", values: keys.map((key) => key[0] ?? null) }]
      : [];
  let where = whereSql(keyFilters, args, scope);
  if (matchColumns.length > 1) {
    // Composite key: ((a = ? AND b = ?) OR ...). Appended after the scope args, in text order.
    const groups = keys.map((key) => {
      const parts = matchColumns.map((column, i) => {
        args.push(key[i] ?? null);
        return `${quoteIdent(column)} = ?`;
      });
      return `(${parts.join(" AND ")})`;
    });
    const clause = `(${groups.join(" OR ")})`;
    where = where ? `${where} AND ${clause}` : ` WHERE ${clause}`;
  }
  const pk = pkColumns(target).map((col) => col.name);
  const tiebreak = pk.length > 0 ? pk : matchColumns;
  // The outer ORDER BY reads match + tiebreak columns, so they are always fetched.
  const fetched = [...new Set([...columns, ...matchColumns, ...tiebreak])];
  const list = fetched.map((name) => quoteIdent(name)).join(", ");
  const from = tableSql(target, dialect);
  let sql: string;
  if (caps.perParent != null) {
    const partition = matchColumns.map((name) => quoteIdent(name)).join(", ");
    const within = tiebreak.map((name) => `${quoteIdent(name)} ASC`).join(", ");
    args.push(caps.perParent + 1, caps.total + 1);
    sql =
      `SELECT ${list} FROM (SELECT ${list}, ROW_NUMBER() OVER (PARTITION BY ${partition} ORDER BY ${within}) AS "__jord_rn"` +
      ` FROM ${from}${where}) AS "__jord_embed" WHERE "__jord_rn" <= ?` +
      ` ORDER BY ${partition}, ${within} LIMIT ?`;
  } else {
    args.push(caps.total + 1);
    sql = `SELECT ${list} FROM ${from}${where} ORDER BY ${tiebreak.map((name) => `${quoteIdent(name)} ASC`).join(", ")} LIMIT ?`;
  }
  return { sql: placeholders(sql, dialect), args };
}
