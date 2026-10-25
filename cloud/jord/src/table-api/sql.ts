import { quoteIdent, rowScopeSql, type JordTableInfo, type RowScope } from "@altr/jord";

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
    `SELECT ${selectList(info, parsed)} FROM ${quoteIdent(info.name)}${where}${order} LIMIT ? OFFSET ?`,
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
      `SELECT COUNT(*) AS n FROM ${quoteIdent(info.name)}${where}`,
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
    `INSERT INTO ${quoteIdent(info.name)} (${cols.map((c) => quoteIdent(c)).join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`,
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
  const where = whereSql(filters, args, scope);
  if (!where && !allowUnfiltered) {
    throw new TableApiError(400, "filter_required", "PATCH requires a filter");
  }
  return {
    sql: placeholders(
      `UPDATE ${quoteIdent(info.name)} SET ${sets.join(", ")}${where} RETURNING *`,
      dialect,
    ),
    args,
  };
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
      `DELETE FROM ${quoteIdent(info.name)}${where} RETURNING *`,
      dialect,
    ),
    args,
  };
}
