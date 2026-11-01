/**
 * Schema scope for user tables (S0049).
 *
 * Postgres exposes many schemas (default `public`); libSQL has one, `main`.
 * `quoteQualified` lives in `ddl.ts` next to `quoteIdent` (no import cycle)
 * and is re-exported here as the schema-scope surface.
 */
export { quoteQualified } from "./ddl.js";

/** Default user-table schema on Postgres. */
export const PG_DEFAULT_SCHEMA = "public";
/** libSQL / SQLite exposes one schema: the attached `main` database. */
export const LIBSQL_SCHEMA = "main";

export type JordSchemaInfo = {
  name: string;
  /**
   * Informational only (libSQL `main`): never used to gate DDL.
   * Always false on Postgres.
   */
  readOnly: boolean;
};

export function defaultSchemaFor(dialect: "libsql" | "postgres"): string {
  return dialect === "postgres" ? PG_DEFAULT_SCHEMA : LIBSQL_SCHEMA;
}

/** Postgres system namespaces that are never user schemas. */
export function isSystemSchemaName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith("pg_") || lower === "information_schema";
}
