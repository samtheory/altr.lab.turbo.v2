import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createJordClient,
  fsPathToFileUrl,
  JORD_APP_ROLE,
  runOwnerMigration,
  type JordDriverPort,
} from "@altr/jord";
import { Client } from "pg";

/** Owner/superuser URL for a scratch Postgres; tests create one database each. */
export const PG_URL = process.env.JORD_TEST_POSTGRES_URL?.trim() ?? "";

export type TestBackend = "file" | "postgres";

/** `file` always; `postgres` too when JORD_TEST_POSTGRES_URL is set. */
export const TEST_BACKENDS: TestBackend[] = PG_URL ? ["file", "postgres"] : ["file"];

const APP_PASSWORD = "jord_app_test";

export type TestDb = {
  backend: TestBackend;
  /** Runtime port. On Postgres this is a `jord_app` pool (FORCE RLS applies). */
  jord: JordDriverPort;
  /** Table-owner port for DDL and RLS sync (same object on file). */
  ddl: JordDriverPort;
  /** Placeholder for the n-th arg (1-based). */
  ph: (n: number) => string;
  /** Raw DDL on the owner connection, then re-grant / re-sync RLS. */
  ownerSql: (sql: string) => Promise<void>;
  close: () => Promise<void>;
};

function withDatabase(url: string, database: string, user?: { name: string; password: string }): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  if (user) {
    parsed.username = user.name;
    parsed.password = user.password;
  }
  return parsed.toString();
}

async function ensureAppRole(admin: Client): Promise<void> {
  await admin.query(
    `DO $$ BEGIN
       CREATE ROLE ${JORD_APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}';
     EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
     END $$`,
  );
}

export async function openTestDb(backend: TestBackend): Promise<TestDb> {
  if (backend === "file") {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-test-"));
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    return {
      backend,
      jord,
      ddl: jord,
      ph: () => "?",
      ownerSql: async (sql) => {
        await jord.query(sql);
      },
      close: async () => {
        await jord.close();
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      },
    };
  }

  const database = `jord_t_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const admin = new Client({ connectionString: PG_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${database}`);
  await ensureAppRole(admin);
  const ownerUrl = withDatabase(PG_URL, database);
  const ddl = await createJordClient({ url: ownerUrl });
  await runOwnerMigration(ownerUrl, []);
  const jord = await createJordClient({
    url: withDatabase(PG_URL, database, { name: JORD_APP_ROLE, password: APP_PASSWORD }),
    postgresDdl: false,
  });
  return {
    backend,
    jord,
    ddl,
    ph: (n) => `$${n}`,
    ownerSql: async (sql) => {
      await ddl.query(sql);
      await ddl.syncRecordsPoliciesRls?.();
    },
    close: async () => {
      await jord.close();
      await ddl.close();
      await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`).catch(() => undefined);
      await admin.end();
    },
  };
}
