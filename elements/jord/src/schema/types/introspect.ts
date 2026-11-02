import { fromSql } from "./from-sql.js";
import type { JordDialect, LogicalColumnType } from "./types.js";

/** Minimal column shape from adapters (avoids port ↔ types cycles). */
export type RawColumnInfo = {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
};

export type JordColumnInfoWithLogical = RawColumnInfo & {
  logicalType: LogicalColumnType;
};

/** Attach registry logical type to a raw introspected column. */
export function normalizeColumn(
  dialect: JordDialect,
  column: RawColumnInfo,
): JordColumnInfoWithLogical {
  return {
    ...column,
    logicalType: fromSql(dialect, column.type),
  };
}

export function normalizeColumns(
  dialect: JordDialect,
  columns: readonly RawColumnInfo[],
): JordColumnInfoWithLogical[] {
  return columns.map((c) => normalizeColumn(dialect, c));
}
