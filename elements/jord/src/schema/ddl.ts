/** Whitelisted SQLite column types for additive live save (Studio S2). */
export const JORD_COLUMN_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;

export type JordColumnType = (typeof JORD_COLUMN_TYPES)[number];

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isValidSqlIdent(name: string): boolean {
  return IDENT_RE.test(name);
}

export function isJordColumnType(value: string): value is JordColumnType {
  return (JORD_COLUMN_TYPES as readonly string[]).includes(value);
}

/**
 * Quote a validated identifier for SQLite DDL.
 * Callers must pass `isValidSqlIdent` names only.
 */
export function quoteIdent(name: string): string {
  if (!isValidSqlIdent(name)) {
    throw new Error(`[@altr/jord] invalid SQL identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

/**
 * `"schema"."table"`. Both parts must be valid identifiers; no search_path
 * tricks — every user-table statement spells out its schema.
 */
export function quoteQualified(schema: string, table: string): string {
  if (!isValidSqlIdent(schema)) {
    throw new Error(
      `[@altr/jord] invalid SQL schema identifier: ${JSON.stringify(schema)}`,
    );
  }
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

/** Table reference: qualified when `schema` is set, else the bare quoted name. */
export function tableRef(table: string, schema?: string): string {
  return schema ? quoteQualified(schema, table) : quoteIdent(table);
}

export function buildAddColumnSql(
  table: string,
  column: string,
  type: JordColumnType,
  schema?: string,
): string {
  return `ALTER TABLE ${tableRef(table, schema)} ADD COLUMN ${quoteIdent(column)} ${type}`;
}

/** Names Studio CREATE TABLE must not overwrite (scratchpad + control plane + system). */
export function isReservedCreateTableName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "records" ||
    lower.startsWith("jord_") ||
    lower.startsWith("sqlite_") ||
    lower.startsWith("pg_")
  );
}

export type CreateTableColumnInput = {
  name: string;
  type: JordColumnType;
  pk?: boolean;
};

export type PlannedCreateColumn = {
  name: string;
  type: JordColumnType;
  pk: boolean;
};

export type CreateTablePlanError =
  | "invalid_identifier"
  | "invalid_type"
  | "no_columns"
  | "duplicate_column"
  | "multiple_pk"
  | "reserved";

/**
 * v1 create rules: ≥1 column, exactly one PK.
 * If none is marked, an existing `id` column becomes PK; otherwise prepend `id TEXT PRIMARY KEY`.
 */
export function planCreateTable(input: {
  name: string;
  columns: readonly CreateTableColumnInput[];
}):
  | { ok: true; name: string; columns: PlannedCreateColumn[] }
  | { ok: false; error: CreateTablePlanError; message: string } {
  if (!isValidSqlIdent(input.name)) {
    return {
      ok: false,
      error: "invalid_identifier",
      message: "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
    };
  }
  if (isReservedCreateTableName(input.name)) {
    return {
      ok: false,
      error: "reserved",
      message: `table ${input.name} is reserved`,
    };
  }
  if (input.columns.length === 0) {
    return {
      ok: false,
      error: "no_columns",
      message: "at least one column is required",
    };
  }

  const seen = new Set<string>();
  const planned: PlannedCreateColumn[] = [];
  let pkCount = 0;
  for (const col of input.columns) {
    if (!isValidSqlIdent(col.name)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: `column name must match [a-zA-Z_][a-zA-Z0-9_]* (got ${JSON.stringify(col.name)})`,
      };
    }
    if (!isJordColumnType(col.type)) {
      return {
        ok: false,
        error: "invalid_type",
        message: `type must be one of TEXT, INTEGER, REAL, BLOB (got ${JSON.stringify(col.type)})`,
      };
    }
    if (seen.has(col.name)) {
      return {
        ok: false,
        error: "duplicate_column",
        message: `duplicate column ${col.name}`,
      };
    }
    seen.add(col.name);
    const pk = col.pk === true;
    if (pk) pkCount += 1;
    planned.push({ name: col.name, type: col.type, pk });
  }

  if (pkCount > 1) {
    return {
      ok: false,
      error: "multiple_pk",
      message: "exactly one primary key column is allowed",
    };
  }
  if (pkCount === 0) {
    const idCol = planned.find((col) => col.name === "id");
    if (idCol) {
      idCol.pk = true;
    } else {
      planned.unshift({ name: "id", type: "TEXT", pk: true });
    }
  }

  return { ok: true, name: input.name, columns: planned };
}

export function pgColumnType(type: JordColumnType): string {
  if (type === "INTEGER") return "INTEGER";
  if (type === "REAL") return "DOUBLE PRECISION";
  if (type === "BLOB") return "BYTEA";
  return "TEXT";
}

export function buildCreateTableSql(
  table: string,
  columns: readonly PlannedCreateColumn[],
  dialect: "libsql" | "postgres",
  schema?: string,
): string {
  const defs = columns.map((col) => {
    const sqlType = dialect === "postgres" ? pgColumnType(col.type) : col.type;
    return `${quoteIdent(col.name)} ${sqlType}${col.pk ? " PRIMARY KEY" : ""}`;
  });
  return `CREATE TABLE ${tableRef(table, schema)} (${defs.join(", ")})`;
}

export type TableCell = string | number | boolean | null;

export function toTableCell(value: unknown): TableCell {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function clampRowWindow(limit: number, offset: number): { limit: number; offset: number } {
  const safeLimit = Number.isFinite(limit) ? Math.trunc(limit) : 50;
  const safeOffset = Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return {
    limit: Math.min(100, Math.max(1, safeLimit)),
    offset: Math.max(0, safeOffset),
  };
}
