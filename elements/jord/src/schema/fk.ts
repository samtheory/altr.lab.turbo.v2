/**
 * Foreign keys / relationships (S0055 / jord-F0024).
 * Schema-qualified targets, composite keys, ON DELETE/UPDATE, cardinality.
 */

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function isValidSqlIdent(name: string): boolean {
  return IDENT_RE.test(name);
}

function quoteIdent(name: string): string {
  return `"${name}"`;
}

function quoteQualified(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

export const FK_ACTIONS = [
  "cascade",
  "set null",
  "restrict",
  "no action",
  "set default",
] as const;

export type FkAction = (typeof FK_ACTIONS)[number];

export type ForeignKeyTarget = {
  schema: string;
  table: string;
  columns: string[];
};

/** Declared FK (create / add / table-level). */
export type ForeignKeySpec = {
  columns: string[];
  references: ForeignKeyTarget;
  onDelete?: FkAction;
  onUpdate?: FkAction;
  name?: string;
};

/** Column-settings shorthand for a single-column FK. */
export type ColumnForeignKey = {
  schema: string;
  table: string;
  column: string;
  onDelete?: FkAction;
  onUpdate?: FkAction;
};

export type FkCardinality = "1:1" | "1:N" | "M:N";

export type ForeignKeyInfo = ForeignKeySpec & {
  cardinality: FkCardinality;
};

export type FkParseError = {
  ok: false;
  error: "invalid_fk";
  message: string;
};

const ACTION_SQL: Record<FkAction, string> = {
  cascade: "CASCADE",
  "set null": "SET NULL",
  restrict: "RESTRICT",
  "no action": "NO ACTION",
  "set default": "SET DEFAULT",
};

export function isFkAction(value: unknown): value is FkAction {
  return typeof value === "string" && (FK_ACTIONS as readonly string[]).includes(value);
}

export function parseFkAction(
  raw: unknown,
  field: string,
): { ok: true; value: FkAction } | FkParseError {
  if (!isFkAction(raw)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: `${field} must be one of ${FK_ACTIONS.join(", ")}`,
    };
  }
  return { ok: true, value: raw };
}

export function parseColumnForeignKey(
  raw: unknown,
): { ok: true; value: ColumnForeignKey } | FkParseError {
  if (raw == null) {
    return { ok: false, error: "invalid_fk", message: "foreignKey must be an object" };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_fk", message: "foreignKey must be an object" };
  }
  const src = raw as Record<string, unknown>;
  if (typeof src.schema !== "string" || !isValidSqlIdent(src.schema)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreignKey.schema must be a valid SQL identifier",
    };
  }
  if (typeof src.table !== "string" || !isValidSqlIdent(src.table)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreignKey.table must be a valid SQL identifier",
    };
  }
  if (typeof src.column !== "string" || !isValidSqlIdent(src.column)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreignKey.column must be a valid SQL identifier",
    };
  }
  const out: ColumnForeignKey = {
    schema: src.schema,
    table: src.table,
    column: src.column,
  };
  if (src.onDelete !== undefined) {
    const action = parseFkAction(src.onDelete, "foreignKey.onDelete");
    if (!action.ok) return action;
    out.onDelete = action.value;
  }
  if (src.onUpdate !== undefined) {
    const action = parseFkAction(src.onUpdate, "foreignKey.onUpdate");
    if (!action.ok) return action;
    out.onUpdate = action.value;
  }
  return { ok: true, value: out };
}

export function parseForeignKeySpec(
  raw: unknown,
): { ok: true; value: ForeignKeySpec } | FkParseError {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_fk", message: "foreign key must be an object" };
  }
  const src = raw as Record<string, unknown>;
  if (!Array.isArray(src.columns) || src.columns.length === 0) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreign key columns must be a non-empty string array",
    };
  }
  if (!src.columns.every((c) => typeof c === "string" && isValidSqlIdent(c))) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreign key columns must be valid SQL identifiers",
    };
  }
  const refs = src.references;
  if (!refs || typeof refs !== "object" || Array.isArray(refs)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreign key references must be an object",
    };
  }
  const ref = refs as Record<string, unknown>;
  if (typeof ref.schema !== "string" || !isValidSqlIdent(ref.schema)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "references.schema must be a valid SQL identifier",
    };
  }
  if (typeof ref.table !== "string" || !isValidSqlIdent(ref.table)) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "references.table must be a valid SQL identifier",
    };
  }
  if (!Array.isArray(ref.columns) || ref.columns.length === 0) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "references.columns must be a non-empty string array",
    };
  }
  if (!ref.columns.every((c) => typeof c === "string" && isValidSqlIdent(c))) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "references.columns must be valid SQL identifiers",
    };
  }
  if (src.columns.length !== ref.columns.length) {
    return {
      ok: false,
      error: "invalid_fk",
      message: "foreign key column count must match references.columns",
    };
  }

  const out: ForeignKeySpec = {
    columns: src.columns as string[],
    references: {
      schema: ref.schema,
      table: ref.table,
      columns: ref.columns as string[],
    },
  };
  if (src.name !== undefined) {
    if (typeof src.name !== "string" || !isValidSqlIdent(src.name)) {
      return {
        ok: false,
        error: "invalid_fk",
        message: "foreign key name must be a valid SQL identifier",
      };
    }
    out.name = src.name;
  }
  if (src.onDelete !== undefined) {
    const action = parseFkAction(src.onDelete, "onDelete");
    if (!action.ok) return action;
    out.onDelete = action.value;
  }
  if (src.onUpdate !== undefined) {
    const action = parseFkAction(src.onUpdate, "onUpdate");
    if (!action.ok) return action;
    out.onUpdate = action.value;
  }
  return { ok: true, value: out };
}

export function columnFkToSpec(
  localColumn: string,
  fk: ColumnForeignKey,
): ForeignKeySpec {
  return {
    columns: [localColumn],
    references: {
      schema: fk.schema,
      table: fk.table,
      columns: [fk.column],
    },
    onDelete: fk.onDelete,
    onUpdate: fk.onUpdate,
  };
}

/** Dialect gate for schema-qualified targets. */
export function assertFkDialectSupport(
  dialect: "libsql" | "postgres",
  spec: ForeignKeySpec,
  defaultSchema: string,
): { ok: true } | { ok: false; error: "fk_unsupported"; message: string } {
  if (dialect === "libsql") {
    if (spec.references.schema !== defaultSchema && spec.references.schema !== "main") {
      return {
        ok: false,
        error: "fk_unsupported",
        message: `libSQL foreign keys cannot target schema ${JSON.stringify(spec.references.schema)}; only "${defaultSchema}" is supported`,
      };
    }
  }
  return { ok: true };
}

/**
 * libSQL/SQLite cannot ADD CONSTRAINT via ALTER. Refuse composite (or any)
 * FK add that is not part of CREATE / ADD COLUMN.
 */
export function refuseLibsqlAlterFk(): {
  ok: false;
  error: "fk_unsupported";
  message: string;
} {
  return {
    ok: false,
    error: "fk_unsupported",
    message:
      "libSQL cannot add a FOREIGN KEY via ALTER TABLE; declare it on CREATE TABLE or ADD COLUMN (REFERENCES), or rebuild the table",
  };
}

function actionClauses(spec: Pick<ForeignKeySpec, "onDelete" | "onUpdate">): string {
  const parts: string[] = [];
  if (spec.onDelete) parts.push(`ON DELETE ${ACTION_SQL[spec.onDelete]}`);
  if (spec.onUpdate) parts.push(`ON UPDATE ${ACTION_SQL[spec.onUpdate]}`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function refTableSql(target: ForeignKeyTarget, dialect: "libsql" | "postgres"): string {
  if (dialect === "libsql") {
    // SQLite does not use schema.table for ordinary attached-main tables.
    return quoteIdent(target.table);
  }
  return quoteQualified(target.schema, target.table);
}

/** Inline column REFERENCES fragment (single-column only). */
export function columnReferencesSql(
  fk: ColumnForeignKey | undefined,
  dialect: "libsql" | "postgres",
): string {
  if (!fk) return "";
  const cols = fk.column;
  const target =
    dialect === "libsql"
      ? `${quoteIdent(fk.table)}(${quoteIdent(cols)})`
      : `${quoteQualified(fk.schema, fk.table)}(${quoteIdent(cols)})`;
  return ` REFERENCES ${target}${actionClauses({
    onDelete: fk.onDelete,
    onUpdate: fk.onUpdate,
  })}`;
}

/** Table-level FOREIGN KEY (…) REFERENCES … fragment (no leading comma). */
export function tableForeignKeySql(
  spec: ForeignKeySpec,
  dialect: "libsql" | "postgres",
): string {
  const local = spec.columns.map(quoteIdent).join(", ");
  const remote = spec.references.columns.map(quoteIdent).join(", ");
  const name = spec.name ? `CONSTRAINT ${quoteIdent(spec.name)} ` : "";
  return `${name}FOREIGN KEY (${local}) REFERENCES ${refTableSql(spec.references, dialect)}(${remote})${actionClauses(spec)}`;
}

export function previewForeignKeySql(
  table: string,
  schema: string | undefined,
  spec: ForeignKeySpec,
  dialect: "libsql" | "postgres",
): string {
  const tbl =
    schema && dialect === "postgres"
      ? quoteQualified(schema, table)
      : quoteIdent(table);
  return `ALTER TABLE ${tbl} ADD ${tableForeignKeySql(spec, dialect)};`;
}

export type ColumnShape = {
  name: string;
  pk: boolean;
  unique?: boolean;
};

/**
 * Cardinality from uniqueness of the local FK columns and join-table shape.
 * - unique/PK local columns → 1:1
 * - otherwise → 1:N
 * - table with exactly two FKs whose columns cover a composite PK → M:N
 */
export function deriveCardinality(
  fk: ForeignKeySpec,
  columns: readonly ColumnShape[],
  allFks: readonly ForeignKeySpec[],
): FkCardinality {
  if (allFks.length === 2) {
    const covered = new Set(allFks.flatMap((f) => f.columns));
    const pkCols = columns.filter((c) => c.pk).map((c) => c.name);
    if (
      pkCols.length >= 2 &&
      pkCols.every((c) => covered.has(c)) &&
      covered.size === pkCols.length
    ) {
      return "M:N";
    }
  }

  const local = fk.columns;
  const uniqueLocals = local.every((name) => {
    const col = columns.find((c) => c.name === name);
    return col?.pk === true || col?.unique === true;
  });
  return uniqueLocals ? "1:1" : "1:N";
}

export function attachCardinality(
  fks: ForeignKeySpec[],
  columns: readonly ColumnShape[],
): ForeignKeyInfo[] {
  return fks.map((fk) => ({
    ...fk,
    cardinality: deriveCardinality(fk, columns, fks),
  }));
}

/** Normalize PRAGMA foreign_key_list / pg rows into ForeignKeySpec[]. */
export function groupSqliteForeignKeys(
  rows: Array<{
    id: number;
    seq: number;
    table: string;
    from: string;
    to: string;
    on_update: string;
    on_delete: string;
  }>,
  schema: string,
): ForeignKeySpec[] {
  const byId = new Map<number, ForeignKeySpec>();
  for (const row of rows) {
    let spec = byId.get(row.id);
    if (!spec) {
      spec = {
        columns: [],
        references: { schema, table: row.table, columns: [] },
        onDelete: sqliteAction(row.on_delete),
        onUpdate: sqliteAction(row.on_update),
      };
      byId.set(row.id, spec);
    }
    // seq order
    while (spec.columns.length <= row.seq) {
      spec.columns.push("");
      spec.references.columns.push("");
    }
    spec.columns[row.seq] = row.from;
    spec.references.columns[row.seq] = row.to;
  }
  return [...byId.values()].map((spec) => ({
    ...spec,
    columns: spec.columns.filter(Boolean),
    references: {
      ...spec.references,
      columns: spec.references.columns.filter(Boolean),
    },
  }));
}

function sqliteAction(raw: string): FkAction | undefined {
  const normalized = raw.trim().toUpperCase().replace(/_/g, " ");
  switch (normalized) {
    case "CASCADE":
      return "cascade";
    case "SET NULL":
      return "set null";
    case "RESTRICT":
      return "restrict";
    case "NO ACTION":
      return "no action";
    case "SET DEFAULT":
      return "set default";
    default:
      return undefined;
  }
}

export function postgresAction(raw: string): FkAction | undefined {
  return sqliteAction(raw);
}

export type FkTargetColumn = {
  name: string;
  pk: boolean;
  unique?: boolean;
};

/**
 * Ensure the referenced table/columns exist and look like a key
 * (PK or UNIQUE on every referenced column for single-col; composite PK covered).
 */
export function validateFkTarget(
  spec: ForeignKeySpec,
  target:
    | {
        name: string;
        schema?: string;
        columns: readonly FkTargetColumn[];
      }
    | null,
): { ok: true } | FkParseError {
  if (!target) {
    return {
      ok: false,
      error: "invalid_fk",
      message: `referenced table ${spec.references.schema}.${spec.references.table} not found`,
    };
  }
  for (const col of spec.references.columns) {
    if (!target.columns.some((c) => c.name === col)) {
      return {
        ok: false,
        error: "invalid_fk",
        message: `referenced column ${col} not found on ${spec.references.table}`,
      };
    }
  }
  if (spec.references.columns.length === 1) {
    const col = target.columns.find((c) => c.name === spec.references.columns[0]);
    if (!col?.pk && !col?.unique) {
      return {
        ok: false,
        error: "invalid_fk",
        message: `referenced column ${col?.name} must be PRIMARY KEY or UNIQUE`,
      };
    }
  } else {
    const pkSet = new Set(
      target.columns.filter((c) => c.pk).map((c) => c.name),
    );
    const allPk = spec.references.columns.every((c) => pkSet.has(c));
    if (!allPk) {
      return {
        ok: false,
        error: "invalid_fk",
        message: "composite foreign key must reference primary key columns",
      };
    }
  }
  return { ok: true };
}
