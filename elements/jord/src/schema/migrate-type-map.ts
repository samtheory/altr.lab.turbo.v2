/** SQLite affinity → Postgres type for the S0024 migrate wizard. */

export type SqliteAffinity = "TEXT" | "INTEGER" | "REAL" | "BLOB";

const AFFINITY_TO_PG: Record<SqliteAffinity, string> = {
  TEXT: "text",
  INTEGER: "bigint",
  REAL: "double precision",
  BLOB: "bytea",
};

export function mapSqliteTypeToPostgres(sqliteType: string): string {
  const upper = sqliteType.trim().toUpperCase();
  if (upper.includes("INT")) return AFFINITY_TO_PG.INTEGER;
  if (upper.includes("CHAR") || upper.includes("CLOB") || upper.includes("TEXT")) {
    return AFFINITY_TO_PG.TEXT;
  }
  if (upper.includes("BLOB") || upper.length === 0) return AFFINITY_TO_PG.BLOB;
  if (
    upper.includes("REAL") ||
    upper.includes("FLOA") ||
    upper.includes("DOUB")
  ) {
    return AFFINITY_TO_PG.REAL;
  }
  return AFFINITY_TO_PG.TEXT;
}

/** Shadow / ANN tables from S0020 — rebuild on the target; never copy. */
export function shouldSkipMigrateTable(name: string): boolean {
  return name.toLowerCase().startsWith("jord_vix_");
}
