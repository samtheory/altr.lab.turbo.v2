import {
  type ColumnSettings,
  columnConstraintSql,
  parseColumnSettings,
} from "./column-settings.js";
import {
  type ForeignKeySpec,
  assertFkDialectSupport,
  columnFkToSpec,
  parseForeignKeySpec,
  tableForeignKeySql,
} from "./fk.js";
import {
  idStrategyDdl,
  postgresSerialType,
} from "./id-strategy.js";
import { getTypeEntry, toSql } from "./types/index.js";

/** Whitelisted SQLite column types for additive live save (Studio S2). */
export const JORD_COLUMN_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;

export type JordColumnType = (typeof JORD_COLUMN_TYPES)[number];

/**
 * Historical CREATE/ADD DDL spellings for the four legacy affinities.
 * Newer registry ids use {@link toSql} lowercase Postgres forms.
 */
const LEGACY_PG_CREATE: Record<string, string> = {
  text: "TEXT",
  integer: "INTEGER",
  real: "DOUBLE PRECISION",
  blob: "BYTEA",
};

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
  settings?: ColumnSettings,
  dialect: "libsql" | "postgres" = "libsql",
): string {
  const sqlType = dialect === "postgres" ? pgColumnType(type) : type;
  const constraints = columnConstraintSql(settings, dialect);
  return `ALTER TABLE ${tableRef(table, schema)} ADD COLUMN ${quoteIdent(column)} ${sqlType}${constraints}`;
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
  settings?: ColumnSettings;
};

export type PlannedCreateColumn = {
  name: string;
  type: JordColumnType;
  pk: boolean;
  settings?: ColumnSettings;
};

export type CreateTablePlanError =
  | "invalid_identifier"
  | "invalid_type"
  | "invalid_settings"
  | "invalid_fk"
  | "fk_unsupported"
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
  foreignKeys?: readonly unknown[];
  dialect?: "libsql" | "postgres";
  defaultSchema?: string;
}):
  | {
      ok: true;
      name: string;
      columns: PlannedCreateColumn[];
      foreignKeys: ForeignKeySpec[];
    }
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
    let settings: ColumnSettings | undefined;
    if (col.settings !== undefined) {
      const parsed = parseColumnSettings(col.settings);
      if (!parsed.ok) {
        return {
          ok: false,
          error: "invalid_settings",
          message: parsed.message,
        };
      }
      settings = parsed.settings;
    }
    const pk = col.pk === true || settings?.primaryKey === true;
    if (pk) pkCount += 1;
    planned.push({ name: col.name, type: col.type, pk, settings });
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

  const dialect = input.dialect ?? "libsql";
  const defaultSchema = input.defaultSchema ?? (dialect === "postgres" ? "public" : "main");
  const foreignKeys: ForeignKeySpec[] = [];

  // Single-column FKs on column settings become table-level only when composite
  // list is empty — inline REFERENCES stays on the column via columnConstraintSql.
  // Explicit `foreignKeys` are always table-level (needed for composites).
  if (input.foreignKeys) {
    for (const raw of input.foreignKeys) {
      const parsed = parseForeignKeySpec(raw);
      if (!parsed.ok) {
        return { ok: false, error: "invalid_fk", message: parsed.message };
      }
      for (const col of parsed.value.columns) {
        if (!planned.some((c) => c.name === col)) {
          return {
            ok: false,
            error: "invalid_fk",
            message: `foreign key column ${col} is not on the table`,
          };
        }
      }
      const gate = assertFkDialectSupport(dialect, parsed.value, defaultSchema);
      if (!gate.ok) {
        return { ok: false, error: "fk_unsupported", message: gate.message };
      }
      foreignKeys.push(parsed.value);
    }
  }

  for (const col of planned) {
    if (!col.settings?.foreignKey) continue;
    const spec = columnFkToSpec(col.name, col.settings.foreignKey);
    const gate = assertFkDialectSupport(dialect, spec, defaultSchema);
    if (!gate.ok) {
      return { ok: false, error: "fk_unsupported", message: gate.message };
    }
  }

  return { ok: true, name: input.name, columns: planned, foreignKeys };
}

export function pgColumnType(type: JordColumnType): string {
  const entry = getTypeEntry(type);
  if (entry && LEGACY_PG_CREATE[entry.id]) {
    return LEGACY_PG_CREATE[entry.id]!;
  }
  const rendered = toSql("postgres", type);
  return rendered.ok ? rendered.sql : "TEXT";
}

export function buildCreateTableSql(
  table: string,
  columns: readonly PlannedCreateColumn[],
  dialect: "libsql" | "postgres",
  schema?: string,
  foreignKeys: readonly ForeignKeySpec[] = [],
): string {
  const defs = columns.map((col) => {
    const strategy = col.settings?.idStrategy;
    const serialType = dialect === "postgres" ? postgresSerialType(strategy) : null;
    const sqlType = serialType
      ? serialType
      : dialect === "postgres"
        ? pgColumnType(col.type)
        : col.type;
    const idDdl = idStrategyDdl(strategy, dialect, col.type);
    // PK is owned by `col.pk` (planCreateTable); strip settings.primaryKey to avoid duplicates.
    // When a table-level FK already covers this column, strip inline REFERENCES to avoid dupes.
    const coveredByTableFk = foreignKeys.some((fk) =>
      fk.columns.length === 1 && fk.columns[0] === col.name,
    );
    const settings = col.settings
      ? {
          ...col.settings,
          primaryKey: undefined,
          idStrategy: undefined,
          foreignKey: coveredByTableFk ? undefined : col.settings.foreignKey,
        }
      : undefined;
    const constraints = columnConstraintSql(settings, dialect);
    const identityOwnsPk =
      strategy?.kind === "identity" || strategy?.kind === "serial";
    const pk = col.pk && !identityOwnsPk && !idDdl.fragment.includes("PRIMARY KEY")
      ? " PRIMARY KEY"
      : "";
    return `${quoteIdent(col.name)} ${sqlType}${idDdl.fragment}${constraints}${pk}`;
  });
  const fkDefs = foreignKeys.map((fk) => tableForeignKeySql(fk, dialect));
  const body = [...defs, ...fkDefs].join(", ");
  return `CREATE TABLE ${tableRef(table, schema)} (${body})`;
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
