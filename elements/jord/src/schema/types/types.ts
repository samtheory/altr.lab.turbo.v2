/** Dialect-aware column type registry (S0052 / jord-F0024). */

export type JordDialect = "libsql" | "postgres";

export type TypeParams = Record<string, number | string>;

export type TypeParamDef = {
  name: string;
  kind: "int" | "string";
  required?: boolean;
  min?: number;
  max?: number;
  /** Default when omitted on toSql. */
  default?: number | string;
};

export type DialectSql = {
  /** Render the SQL type fragment for CREATE/ALTER. */
  render: (params: TypeParams) => string;
  /**
   * Match an introspected type string. Return params on hit, null on miss.
   * Matching is case-insensitive on the raw string.
   */
  parse: (rawType: string) => TypeParams | null;
};

export type TypeCodec = {
  /** Coarse affinity used by row-write until S0053 codecs land. */
  affinity: "TEXT" | "INTEGER" | "REAL" | "BLOB" | "BOOLEAN";
};

export type TypeUiMeta = {
  label: string;
  /** Short hint for Studio (params, validation). */
  hint?: string;
};

export type RegistryEntry = {
  id: string;
  family:
    | "strings"
    | "numbers"
    | "boolean"
    | "time"
    | "identity"
    | "documents"
    | "binary"
    | "network"
    | "enumerated";
  label: string;
  dialects: {
    libsql?: DialectSql;
    postgres?: DialectSql;
  };
  params?: TypeParamDef[];
  codec: TypeCodec;
  ui: TypeUiMeta;
  /**
   * When migrating SQLite → Postgres, prefer this postgres SQL fragment
   * (overrides dialects.postgres.render with empty params). Used so
   * INTEGER affinity stays `bigint` for the S0024 wizard.
   */
  migratePostgres?: string;
};

export type KnownLogicalType = {
  kind: "known";
  id: string;
  params: TypeParams;
  raw: string;
  readOnly: false;
};

export type CustomLogicalType = {
  kind: "custom";
  raw: string;
  readOnly: true;
};

export type LogicalColumnType = KnownLogicalType | CustomLogicalType;
