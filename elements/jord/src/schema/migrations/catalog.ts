import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SqlMigration = {
  id: string;
  name: string;
  /** Raw file text. Checksum is computed from this, including comments. */
  sql: string;
  filename: string;
};

export type MigrationDialect = "libsql" | "postgres";

const FILE_NAME = /^(\d{4})_(.+)\.sql$/;

function migrationsDir(dialect: MigrationDialect): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "..", "..", "migrations", dialect);
}

/** Ordered forward-only SQL files for one dialect. */
export function loadSqlMigrations(dialect: MigrationDialect): SqlMigration[] {
  const dir = migrationsDir(dialect);
  const filenames = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const migrations: SqlMigration[] = [];
  for (const filename of filenames) {
    const match = FILE_NAME.exec(filename);
    if (!match) {
      throw new Error(
        `[@altr/jord] migration filename must be NNNN_name.sql (got ${filename})`,
      );
    }
    const id = match[1] ?? "";
    const name = match[2] ?? "";
    if (migrations.some((migration) => migration.id === id)) {
      throw new Error(`[@altr/jord] duplicate migration id ${id}`);
    }
    const sql = readFileSync(path.join(dir, filename), "utf8");
    migrations.push({ id, name, sql, filename });
  }
  return migrations;
}

export function migrationFilePath(
  dialect: MigrationDialect,
  filename: string,
): string {
  return path.join(migrationsDir(dialect), filename);
}
