import { Pool } from "pg";

import { isValidSqlIdent, quoteIdent } from "./ddl.js";
import { ensurePostgresSchema } from "./migrate-postgres.js";
import { migrationLockKey } from "./migrations/runner.js";

export const JORD_APP_ROLE = "jord_app";

export type RoleProbe = {
  name: string;
  createRole: boolean;
  bypassRls: boolean;
  owns: string[];
};

/** GRANT + ENABLE + FORCE RLS for each simple identifier. Unsafe names are skipped. */
export function jordAppGrantStatements(tables: readonly string[]): string[] {
  const statements: string[] = [];
  for (const table of tables) {
    if (!isValidSqlIdent(table)) continue;
    const name = quoteIdent(table);
    statements.push(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${name} TO ${JORD_APP_ROLE}`,
    );
    statements.push(`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY`);
    statements.push(`ALTER TABLE ${name} FORCE ROW LEVEL SECURITY`);
  }
  return statements;
}

/**
 * Plan create-or-grant for `jord_app`.
 * Missing role requires CREATEROLE. An existing role must not bypass RLS or own tables.
 */
export function planJordApp(input: {
  migrate: RoleProbe;
  app: RoleProbe | null;
  tables: readonly string[];
}): { statements: string[]; createdRole: boolean } | { error: string } {
  if (input.app === null) {
    if (!input.migrate.createRole) {
      return {
        error:
          "migrate role lacks CREATEROLE, so jord_app cannot be created",
      };
    }
    return {
      createdRole: true,
      statements: [
        `CREATE ROLE ${JORD_APP_ROLE} LOGIN`,
        ...jordAppGrantStatements(input.tables),
      ],
    };
  }

  if (input.app.bypassRls) {
    return { error: "jord_app has BYPASSRLS" };
  }

  if (input.app.owns.length > 0) {
    const owned = input.app.owns[0] ?? "";
    return {
      error: `jord_app must not own application tables (${owned})`,
    };
  }

  return {
    createdRole: false,
    statements: jordAppGrantStatements(input.tables),
  };
}

/** DML grants only. FORCE RLS stays on the tables passed to `planJordApp`. */
export function jordAppDmlGrants(tables: readonly string[]): string[] {
  const statements: string[] = [];
  for (const table of tables) {
    if (!isValidSqlIdent(table)) continue;
    statements.push(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${quoteIdent(table)} TO ${JORD_APP_ROLE}`,
    );
  }
  return statements;
}

type Queryable = {
  query: (
    sql: string,
    args?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

/**
 * Owner connection (`JORD_MIGRATE_URL`): apply migrations, create or verify
 * `jord_app`, grant DML, and FORCE RLS on the tables named in `rlsTables`.
 */
export async function runOwnerMigration(
  migrateUrl: string,
  dmlTables: readonly string[],
  rlsTables: readonly string[] = [],
): Promise<void> {
  const pool = new Pool({ connectionString: migrateUrl });
  try {
    await ensurePostgresSchema(pool, migrationLockKey(migrateUrl));
    const enabled =
      rlsTables.length > 0
        ? rlsTables
        : (
            await pool.query(
              "SELECT table_name FROM jord_table_rls WHERE rls_enabled IS TRUE",
            )
          ).rows.map((row) => String(row.table_name));
    const me = await pool.query(
      "SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user",
    );
    const app = await pool.query(
      "SELECT rolbypassrls FROM pg_roles WHERE rolname = $1",
      [JORD_APP_ROLE],
    );
    const owned = await pool.query(
      `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_roles r ON r.oid = c.relowner
       WHERE r.rolname = $1 AND c.relkind = 'r'`,
      [JORD_APP_ROLE],
    );
    const plan = planJordApp({
      migrate: {
        name: "migrate",
        createRole: me.rows[0]?.rolcreaterole === true,
        bypassRls: false,
        owns: [],
      },
      app:
        app.rows.length === 0
          ? null
          : {
              name: JORD_APP_ROLE,
              createRole: false,
              bypassRls: app.rows[0]?.rolbypassrls === true,
              owns: owned.rows.map((row) => String(row.name)),
            },
      tables: enabled,
    });
    if ("error" in plan) {
      throw new Error(`[@altr/jord] ${plan.error}`);
    }
    for (const sql of plan.statements) {
      await pool.query(sql);
    }
    for (const sql of jordAppDmlGrants(dmlTables)) {
      await pool.query(sql);
    }
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${JORD_APP_ROLE}`,
    );
    await pool.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${JORD_APP_ROLE}`,
    );
  } finally {
    await pool.end();
  }
}

/** Runtime pool must not own application tables or bypass RLS. */
export async function assertRuntimeRole(queryable: Queryable): Promise<void> {
  const role = await queryable.query(
    "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user",
  );
  if (role.rows[0]?.rolbypassrls === true) {
    throw new Error("[@altr/jord] runtime role has BYPASSRLS");
  }
  const owned = await queryable.query(
    `SELECT c.relname AS name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND n.nspname = 'public'
       AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
     LIMIT 1`,
  );
  const name = owned.rows[0]?.name;
  if (typeof name === "string" && name.length > 0) {
    throw new Error(
      `[@altr/jord] runtime role owns application table ${name}`,
    );
  }
}
