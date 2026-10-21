/** Whitelisted SQLite column types for additive live save (Studio S2). */
export const JORD_COLUMN_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;

export type JordColumnType = (typeof JORD_COLUMN_TYPES)[number];

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

export function buildAddColumnSql(
  table: string,
  column: string,
  type: JordColumnType,
): string {
  return `ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(column)} ${type}`;
}
