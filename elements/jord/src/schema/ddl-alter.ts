import type { JordColumnInfo, JordTableInfo } from "../port.js";
import {
  type JordColumnType,
  isJordColumnType,
  isReservedCreateTableName,
  isValidSqlIdent,
  pgColumnType,
  quoteIdent,
} from "./ddl.js";
import { columnKind } from "./row-write.js";

export type SchemaDdlError =
  | "invalid_identifier"
  | "reserved"
  | "table_not_found"
  | "table_exists"
  | "column_not_found"
  | "column_exists"
  | "pk_required"
  | "pk_type_change"
  | "invalid_type"
  | "empty_patch"
  | "type_change_failed";

export type SchemaDdlFailure = {
  ok: false;
  error: SchemaDdlError;
  message: string;
};

function fail(error: SchemaDdlError, message: string): SchemaDdlFailure {
  return { ok: false, error, message };
}

export function requireUserTableName(
  name: string,
): { ok: true; name: string } | SchemaDdlFailure {
  if (!isValidSqlIdent(name)) {
    return fail(
      "invalid_identifier",
      "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
    );
  }
  if (isReservedCreateTableName(name)) {
    return fail("reserved", `table ${name} is reserved`);
  }
  return { ok: true, name };
}

export function planDropTable(
  name: string,
): { ok: true; name: string } | SchemaDdlFailure {
  return requireUserTableName(name);
}

/** Control-plane tables keyed by user table name; a rename moves their rows. */
export const TABLE_NAME_METADATA = [
  "jord_table_rls",
  "jord_policies",
  "jord_triggers",
  "jord_tracked_tables",
] as const;

export function planRenameTable(
  from: string,
  to: string,
): { ok: true; from: string; to: string } | SchemaDdlFailure {
  const src = requireUserTableName(from);
  if (!src.ok) return src;
  const dest = requireUserTableName(to);
  if (!dest.ok) return dest;
  if (src.name === dest.name) {
    return fail("invalid_identifier", "new table name must differ");
  }
  return { ok: true, from: src.name, to: dest.name };
}

export function toJordColumnType(sqlType: string): JordColumnType {
  return columnKind(sqlType);
}

export type PlannedColumn = {
  name: string;
  type: JordColumnType;
  pk: boolean;
};

export function planDropColumn(
  info: JordTableInfo,
  column: string,
): { ok: true; table: string; column: string } | SchemaDdlFailure {
  if (!isValidSqlIdent(column)) {
    return fail(
      "invalid_identifier",
      "column name must match [a-zA-Z_][a-zA-Z0-9_]*",
    );
  }
  const col = info.columns.find((c) => c.name === column);
  if (!col) {
    return fail("column_not_found", `column ${column} not found`);
  }
  if (col.pk) {
    return fail("pk_required", "cannot drop the primary key column");
  }
  if (info.columns.length <= 1) {
    return fail("pk_required", "table must keep at least one column");
  }
  return { ok: true, table: info.name, column };
}

export type PlannedAlterColumn =
  | {
      ok: true;
      mode: "rename";
      table: string;
      from: string;
      to: string;
    }
  | {
      ok: true;
      mode: "rebuild";
      table: string;
      from: string;
      to: string;
      nextType: JordColumnType;
      columns: PlannedColumn[];
    };

/**
 * Rename and/or change type. Pure rename uses ALTER RENAME COLUMN.
 * Any type change rebuilds the table (SQLite has no ALTER TYPE).
 */
export function planAlterColumn(
  info: JordTableInfo,
  column: string,
  patch: { name?: string; type?: JordColumnType },
): PlannedAlterColumn | SchemaDdlFailure {
  if (!isValidSqlIdent(column)) {
    return fail(
      "invalid_identifier",
      "column name must match [a-zA-Z_][a-zA-Z0-9_]*",
    );
  }
  const hasRename = typeof patch.name === "string" && patch.name.length > 0;
  const hasType = patch.type !== undefined;
  if (!hasRename && !hasType) {
    return fail("empty_patch", "name and/or type is required");
  }

  const col = info.columns.find((c) => c.name === column);
  if (!col) {
    return fail("column_not_found", `column ${column} not found`);
  }

  const nextName = hasRename ? patch.name! : column;
  if (!isValidSqlIdent(nextName)) {
    return fail(
      "invalid_identifier",
      "column name must match [a-zA-Z_][a-zA-Z0-9_]*",
    );
  }
  if (nextName !== column && info.columns.some((c) => c.name === nextName)) {
    return fail("column_exists", `column ${nextName} already exists`);
  }

  const currentType = toJordColumnType(col.type);
  const nextType = hasType ? patch.type! : currentType;
  if (hasType && !isJordColumnType(nextType)) {
    return fail(
      "invalid_type",
      `type must be one of TEXT, INTEGER, REAL, BLOB (got ${JSON.stringify(patch.type)})`,
    );
  }

  if (col.pk && hasType && nextType !== currentType) {
    return fail("pk_type_change", "cannot change primary key column type");
  }

  if (!hasType || nextType === currentType) {
    if (nextName === column) {
      return fail("empty_patch", "nothing to change");
    }
    return {
      ok: true,
      mode: "rename",
      table: info.name,
      from: column,
      to: nextName,
    };
  }

  const columns: PlannedColumn[] = info.columns.map((c) => {
    if (c.name === column) {
      return { name: nextName, type: nextType, pk: c.pk };
    }
    return {
      name: c.name,
      type: toJordColumnType(c.type),
      pk: c.pk,
    };
  });

  return {
    ok: true,
    mode: "rebuild",
    table: info.name,
    from: column,
    to: nextName,
    nextType,
    columns,
  };
}

export function buildTypeChangeSelect(
  info: JordTableInfo,
  fromColumn: string,
  toColumn: string,
  nextType: JordColumnType,
  dialect: "libsql" | "postgres",
): string {
  const sqlType = dialect === "postgres" ? pgColumnType(nextType) : nextType;
  return info.columns
    .map((c) => {
      if (c.name === fromColumn) {
        return `CAST(${quoteIdent(c.name)} AS ${sqlType}) AS ${quoteIdent(toColumn)}`;
      }
      return quoteIdent(c.name);
    })
    .join(", ");
}

/** Temporary table name for rebuild (never user-facing). */
export function rebuildTempName(table: string): string {
  return `__jord_rebuild_${table}`;
}

export function buildRebuildCreateSql(
  tempName: string,
  columns: readonly PlannedColumn[],
  dialect: "libsql" | "postgres",
): string {
  const defs = columns.map((col) => {
    const sqlType = dialect === "postgres" ? pgColumnType(col.type) : col.type;
    return `${quoteIdent(col.name)} ${sqlType}${col.pk ? " PRIMARY KEY" : ""}`;
  });
  return `CREATE TABLE ${quoteIdent(tempName)} (${defs.join(", ")})`;
}

export function buildRebuildCopySql(
  table: string,
  tempName: string,
  info: JordTableInfo,
  fromColumn: string,
  toColumn: string,
  nextType: JordColumnType,
  dialect: "libsql" | "postgres",
): string {
  const select = buildTypeChangeSelect(
    info,
    fromColumn,
    toColumn,
    nextType,
    dialect,
  );
  return `INSERT INTO ${quoteIdent(tempName)} SELECT ${select} FROM ${quoteIdent(table)}`;
}
