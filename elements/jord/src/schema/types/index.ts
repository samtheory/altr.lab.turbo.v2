export type {
  CustomLogicalType,
  DialectSql,
  JordDialect,
  KnownLogicalType,
  LogicalColumnType,
  RegistryEntry,
  TypeCodec,
  TypeParamDef,
  TypeParams,
  TypeUiMeta,
} from "./types.js";

export {
  LEGACY_TYPE_ALIASES,
  TYPE_REGISTRY,
  getTypeEntry,
  listTypeEntries,
  listTypeIdsForDialect,
} from "./registry.js";

export { toSql, type ToSqlResult } from "./to-sql.js";
export { fromSql } from "./from-sql.js";
export { mapSqliteTypeToPostgres as mapSqliteTypeViaRegistry } from "./migrate.js";
export {
  normalizeColumn,
  normalizeColumns,
  type JordColumnInfoWithLogical,
  type RawColumnInfo,
} from "./introspect.js";
