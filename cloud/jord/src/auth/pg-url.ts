import { samePostgresConnection } from "@altr/jord";

function isPostgresUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw.startsWith("postgres://") || raw.startsWith("postgresql://");
}

/**
 * Postgres runtime must name a distinct migrate URL.
 * `file:` and `libsql:` skip this check.
 */
export function assertPostgresMigrateUrl(env: NodeJS.ProcessEnv): void {
  const database = env.DATABASE_URL?.trim() ?? "";
  if (!isPostgresUrl(database)) return;

  const migrate = env.JORD_MIGRATE_URL;
  if (migrate == null || migrate.trim() === "") {
    throw new Error(
      "JORD_MIGRATE_URL is required when DATABASE_URL is postgres",
    );
  }
  if (samePostgresConnection(migrate, database)) {
    throw new Error(
      "JORD_MIGRATE_URL and DATABASE_URL are the same connection",
    );
  }
}
