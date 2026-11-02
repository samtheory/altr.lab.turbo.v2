import type { JordColumnInfo, JordTableInfo } from "../port.js";
import {
  applyAutoUpdateTimestamps,
  validateColumnValue,
} from "./column-settings.js";
import { isReservedCreateTableName, isValidSqlIdent } from "./ddl.js";
import { generateId, idStrategyDdl } from "./id-strategy.js";

/** Bound parameter for libSQL (`?`) and Postgres (`$n`). */
export type SqlValue = string | number | Uint8Array | null;

export type TableRowWriteCode =
  | "invalid_identifier"
  | "reserved"
  | "no_pk"
  | "missing_pk"
  | "unknown_column"
  | "bad_value"
  | "validation"
  | "empty_patch";

export type TableRowWriteFailure = {
  ok: false;
  error: TableRowWriteCode;
  message: string;
  field?: string;
  reason?: string;
};

export type PlannedInsert = {
  ok: true;
  table: string;
  pkColumn: string;
  pkValue: SqlValue;
  columns: string[];
  args: SqlValue[];
};

export type PlannedUpdate = {
  ok: true;
  table: string;
  pkColumn: string;
  pkValue: SqlValue;
  setColumns: string[];
  args: SqlValue[];
};

export type PlannedDelete = {
  ok: true;
  table: string;
  pkColumn: string;
  pkValue: SqlValue;
};

type ColumnKind = "TEXT" | "INTEGER" | "REAL" | "BLOB";

export function columnKind(sqlType: string): ColumnKind {
  const t = sqlType.trim().toUpperCase();
  if (t.includes("BLOB") || t.includes("BYTEA")) return "BLOB";
  if (t.includes("INT")) return "INTEGER";
  if (
    t.includes("REAL") ||
    t.includes("FLOA") ||
    t.includes("DOUBLE") ||
    t.includes("NUMERIC")
  ) {
    return "REAL";
  }
  return "TEXT";
}

function fail(
  error: TableRowWriteCode,
  message: string,
  extra?: { field?: string; reason?: string },
): TableRowWriteFailure {
  return { ok: false, error, message, ...extra };
}

export function coerceColumnValue(
  sqlType: string,
  value: unknown,
): { ok: true; value: SqlValue } | TableRowWriteFailure {
  if (value === null) return { ok: true, value: null };
  const kind = columnKind(sqlType);
  if (kind === "TEXT") {
    if (typeof value !== "string") {
      return fail("bad_value", "TEXT columns require a string or null");
    }
    return { ok: true, value };
  }
  if (kind === "INTEGER") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return fail("bad_value", "INTEGER columns require an integer or null");
    }
    return { ok: true, value };
  }
  if (kind === "REAL") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return fail("bad_value", "REAL columns require a finite number or null");
    }
    return { ok: true, value };
  }
  if (typeof value !== "string") {
    return fail("bad_value", "BLOB columns require a base64 string or null");
  }
  return { ok: true, value: Buffer.from(value, "base64") };
}

export function coercePkValue(
  column: JordColumnInfo,
  raw: string,
): { ok: true; value: SqlValue } | TableRowWriteFailure {
  const kind = columnKind(column.type);
  if (kind === "INTEGER") {
    if (!/^-?\d+$/.test(raw)) {
      return fail("bad_value", "primary key must be an integer");
    }
    return { ok: true, value: Number(raw) };
  }
  if (kind === "REAL") {
    const n = Number(raw);
    if (!Number.isFinite(n) || raw.trim() === "") {
      return fail("bad_value", "primary key must be a finite number");
    }
    return { ok: true, value: n };
  }
  if (kind === "BLOB") {
    return coerceColumnValue(column.type, raw);
  }
  return { ok: true, value: raw };
}

function gateTable(name: string): TableRowWriteFailure | null {
  if (!isValidSqlIdent(name)) {
    return fail(
      "invalid_identifier",
      "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
    );
  }
  if (isReservedCreateTableName(name)) {
    return fail("reserved", `table ${name} is reserved`);
  }
  return null;
}

function primaryKey(
  info: JordTableInfo,
): { ok: true; column: JordColumnInfo } | TableRowWriteFailure {
  const pks = info.columns.filter((col) => col.pk);
  if (pks.length !== 1) {
    return fail("no_pk", "user table writes require exactly one primary key");
  }
  return { ok: true, column: pks[0]! };
}

function isValues(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isSqlBackedId(strategy: NonNullable<JordColumnInfo["settings"]>["idStrategy"]): boolean {
  if (!strategy) return false;
  return (
    strategy.kind === "identity" ||
    strategy.kind === "serial" ||
    strategy.kind === "custom" ||
    (strategy.kind === "uuid_v4" &&
      idStrategyDdl(strategy, "postgres", "TEXT").appSide === false)
  );
}

function isAppSideId(strategy: NonNullable<JordColumnInfo["settings"]>["idStrategy"]): boolean {
  if (!strategy) return false;
  if (strategy.kind === "identity" || strategy.kind === "serial" || strategy.kind === "custom") {
    return false;
  }
  // uuid_v4 is app-side on libSQL; always generate in the planner so both dialects work.
  return (
    strategy.kind === "uuid_v4" ||
    strategy.kind === "uuid_v7" ||
    strategy.kind === "ulid" ||
    strategy.kind === "nanoid" ||
    strategy.kind === "cuid2" ||
    strategy.kind === "sequence"
  );
}

export function planInsertRow(
  info: JordTableInfo,
  values: unknown,
): PlannedInsert | TableRowWriteFailure {
  const gated = gateTable(info.name);
  if (gated) return gated;
  const pk = primaryKey(info);
  if (!pk.ok) return pk;
  if (!isValues(values)) {
    return fail("bad_value", "values must be an object");
  }
  const stamped = applyAutoUpdateTimestamps(info.columns, {
    ...(values as Record<string, unknown>),
  });
  const byName = new Map(info.columns.map((col) => [col.name, col]));
  for (const key of Object.keys(stamped)) {
    if (!byName.has(key)) {
      return fail("unknown_column", `unknown column ${key}`);
    }
  }

  for (const col of info.columns) {
    if (stamped[col.name] !== undefined && stamped[col.name] !== null) continue;
    const strategy = col.settings?.idStrategy;
    if (isAppSideId(strategy)) {
      stamped[col.name] = generateId(strategy!);
    }
  }

  const pkMissing =
    stamped[pk.column.name] === undefined || stamped[pk.column.name] === null;
  if (pkMissing && !isSqlBackedId(pk.column.settings?.idStrategy) && !isAppSideId(pk.column.settings?.idStrategy)) {
    return fail("missing_pk", `primary key ${pk.column.name} is required`);
  }

  const columns: string[] = [];
  const args: SqlValue[] = [];
  for (const col of info.columns) {
    const missing =
      !(col.name in stamped) ||
      stamped[col.name] === undefined ||
      stamped[col.name] === null;
    if (missing) {
      if (isSqlBackedId(col.settings?.idStrategy)) continue;
      if ((col.notnull || col.settings?.nullable === false) && !col.pk) {
        return fail("bad_value", `column ${col.name} is required`);
      }
      if (col.pk) {
        return fail("missing_pk", `primary key ${col.name} is required`);
      }
      continue;
    }
    const raw = stamped[col.name];
    const ruled = validateColumnValue(col.name, raw, col.settings);
    if (!ruled.ok) {
      return fail("validation", ruled.reason, {
        field: ruled.field,
        reason: ruled.reason,
      });
    }
    const coerced = coerceColumnValue(col.type, raw);
    if (!coerced.ok) {
      return fail("bad_value", `${col.name}: ${coerced.message}`);
    }
    const requiredNull =
      col.notnull || col.settings?.nullable === false;
    if (coerced.value === null && requiredNull) {
      return fail("bad_value", `column ${col.name} cannot be null`);
    }
    columns.push(col.name);
    args.push(coerced.value);
  }

  const pkArg = args[columns.indexOf(pk.column.name)];
  return {
    ok: true,
    table: info.name,
    pkColumn: pk.column.name,
    pkValue: pkArg ?? null,
    columns,
    args,
  };
}

export function planUpdateRow(
  info: JordTableInfo,
  pkRaw: string,
  values: unknown,
): PlannedUpdate | TableRowWriteFailure {
  const gated = gateTable(info.name);
  if (gated) return gated;
  const pk = primaryKey(info);
  if (!pk.ok) return pk;
  const pkValue = coercePkValue(pk.column, pkRaw);
  if (!pkValue.ok) return pkValue;
  if (!isValues(values)) {
    return fail("bad_value", "values must be an object");
  }
  const stamped = applyAutoUpdateTimestamps(info.columns, values);
  const byName = new Map(info.columns.map((col) => [col.name, col]));
  const setColumns: string[] = [];
  const args: SqlValue[] = [];
  for (const [key, raw] of Object.entries(stamped)) {
    if (key === pk.column.name) continue;
    const col = byName.get(key);
    if (!col) return fail("unknown_column", `unknown column ${key}`);
    const ruled = validateColumnValue(col.name, raw, col.settings);
    if (!ruled.ok) {
      return fail("validation", ruled.reason, {
        field: ruled.field,
        reason: ruled.reason,
      });
    }
    const coerced = coerceColumnValue(col.type, raw);
    if (!coerced.ok) return fail("bad_value", `${col.name}: ${coerced.message}`);
    const requiredNull =
      col.notnull || col.settings?.nullable === false;
    if (coerced.value === null && requiredNull) {
      return fail("bad_value", `column ${col.name} cannot be null`);
    }
    setColumns.push(col.name);
    args.push(coerced.value);
  }
  if (setColumns.length === 0) {
    return fail("empty_patch", "update needs at least one non-key column");
  }
  return {
    ok: true,
    table: info.name,
    pkColumn: pk.column.name,
    pkValue: pkValue.value,
    setColumns,
    args,
  };
}

export function planDeleteRow(
  info: JordTableInfo,
  pkRaw: string,
): PlannedDelete | TableRowWriteFailure {
  const gated = gateTable(info.name);
  if (gated) return gated;
  const pk = primaryKey(info);
  if (!pk.ok) return pk;
  const pkValue = coercePkValue(pk.column, pkRaw);
  if (!pkValue.ok) return pkValue;
  return {
    ok: true,
    table: info.name,
    pkColumn: pk.column.name,
    pkValue: pkValue.value,
  };
}
