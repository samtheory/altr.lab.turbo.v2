export type SchemaColumn = {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

export const COLUMN_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export function previewAddColumnSql(
  table: string,
  column: string,
  type: ColumnType,
): string {
  return `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};`;
}

/** Same reserved set as jord CREATE / DDL alter. */
export function isAlterableUserTable(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower !== "records" &&
    !lower.startsWith("jord_") &&
    !lower.startsWith("sqlite_") &&
    !lower.startsWith("pg_")
  );
}
