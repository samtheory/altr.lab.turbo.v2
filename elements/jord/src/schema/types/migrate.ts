import { fromSql } from "./from-sql.js";
import { getTypeEntry } from "./registry.js";

/**
 * SQLite declared type → Postgres DDL fragment for the S0024 migrate wizard.
 * Prefer registry `migratePostgres`, then postgres `toSql` render, else `text`.
 */
export function mapSqliteTypeToPostgres(sqliteType: string): string {
  const logical = fromSql("libsql", sqliteType);
  if (logical.kind === "known") {
    const entry = getTypeEntry(logical.id);
    if (entry?.migratePostgres) return entry.migratePostgres;
    const pg = entry?.dialects.postgres;
    if (pg) return pg.render(logical.params);
  }

  // Affinity fallthrough for undeclared / weird SQLite types (matches S0024).
  const upper = sqliteType.trim().toUpperCase();
  if (upper.includes("INT")) return "bigint";
  if (upper.includes("CHAR") || upper.includes("CLOB") || upper.includes("TEXT")) {
    return "text";
  }
  if (upper.includes("BLOB") || upper.length === 0) return "bytea";
  if (
    upper.includes("REAL") ||
    upper.includes("FLOA") ||
    upper.includes("DOUB")
  ) {
    return "double precision";
  }
  return "text";
}
