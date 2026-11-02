/** SQLite affinity → Postgres type for the S0024 migrate wizard (via type registry). */

import { mapSqliteTypeToPostgres as mapViaRegistry } from "./types/migrate.js";

export type SqliteAffinity = "TEXT" | "INTEGER" | "REAL" | "BLOB";

/** Re-export of the registry migrate path — single mapping source (S0052). */
export function mapSqliteTypeToPostgres(sqliteType: string): string {
  return mapViaRegistry(sqliteType);
}

/** Shadow / ANN tables from S0020 — rebuild on the target; never copy. */
export function shouldSkipMigrateTable(name: string): boolean {
  return name.toLowerCase().startsWith("jord_vix_");
}
