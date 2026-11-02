import { randomUUID } from "node:crypto";
import path from "node:path";

import { Client } from "pg";
import { afterEach, describe, expect, it } from "vitest";

import { LibSqlAdapter } from "../adapter/libsql.js";
import { PostgresAdapter } from "../adapter/postgres.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";
import { quoteQualified } from "./ddl.js";
import {
  defaultSchemaFor,
  isSystemSchemaName,
  LIBSQL_SCHEMA,
  PG_DEFAULT_SCHEMA,
} from "./schema-scope.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function openLibsql(): Promise<LibSqlAdapter> {
  const dir = await makeTempDir("jord-schema-scope-");
  temps.push(dir);
  return LibSqlAdapter.open(fsPathToFileUrl(path.join(dir, "jord.db")));
}

describe("schema-scope helpers", () => {
  it("picks the default schema per dialect", () => {
    expect(defaultSchemaFor("postgres")).toBe(PG_DEFAULT_SCHEMA);
    expect(defaultSchemaFor("libsql")).toBe(LIBSQL_SCHEMA);
    expect(PG_DEFAULT_SCHEMA).toBe("public");
    expect(LIBSQL_SCHEMA).toBe("main");
  });

  it("flags Postgres system namespaces", () => {
    expect(isSystemSchemaName("pg_catalog")).toBe(true);
    expect(isSystemSchemaName("pg_toast")).toBe(true);
    expect(isSystemSchemaName("information_schema")).toBe(true);
    expect(isSystemSchemaName("public")).toBe(false);
    expect(isSystemSchemaName("app")).toBe(false);
  });

  it("quotes schema-qualified names and rejects bad identifiers", () => {
    expect(quoteQualified("app", "notes")).toBe('"app"."notes"');
    expect(() => quoteQualified('a"b', "notes")).toThrow(/schema identifier/);
    expect(() => quoteQualified("app", 'no"tes')).toThrow(/identifier/);
    expect(() => quoteQualified("app; DROP", "notes")).toThrow();
  });
});

describe("LibSqlAdapter schema scope", () => {
  it("lists only main and treats it as the default", async () => {
    const jord = await openLibsql();
    try {
      expect(jord.defaultSchema).toBe("main");
      expect(await jord.listSchemas()).toEqual([{ name: "main", readOnly: true }]);
      expect(await jord.resolveSchema()).toEqual({ ok: true, schema: "main" });
      expect(await jord.resolveSchema(null)).toEqual({ ok: true, schema: "main" });
      expect(await jord.resolveSchema("main")).toEqual({ ok: true, schema: "main" });
    } finally {
      await jord.close();
    }
  });

  it("rejects unknown or malformed schemas", async () => {
    const jord = await openLibsql();
    try {
      for (const bad of ["public", "app", 'ma"in', "main; DROP TABLE records"]) {
        const resolved = await jord.resolveSchema(bad);
        expect(resolved.ok).toBe(false);
        if (!resolved.ok) expect(resolved.error).toBe("unknown_schema");
      }
    } finally {
      await jord.close();
    }
  });

  it("scopes introspection and DDL to main and fails closed elsewhere", async () => {
    const jord = await openLibsql();
    try {
      const created = await jord.createTable({
        name: "lab_notes",
        schema: "main",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(created.ok).toBe(true);

      expect(await jord.listTables("main")).toContain("lab_notes");
      expect(await jord.listTables("app")).toEqual([]);

      const info = await jord.describeTable("lab_notes", "main");
      expect(info?.schema).toBe("main");
      expect((await jord.describeTable("lab_notes"))?.schema).toBe("main");
      expect(await jord.describeTable("lab_notes", "app")).toBeNull();

      const elsewhere = await jord.createTable({
        name: "lab_other",
        schema: "app",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(elsewhere.ok).toBe(false);
      if (!elsewhere.ok) expect(elsewhere.error).toBe("unknown_schema");
      expect(await jord.describeTable("lab_other")).toBeNull();

      const rows = await jord.listTableRows({
        table: "lab_notes",
        schema: "app",
        limit: 5,
        offset: 0,
      });
      expect(rows.ok).toBe(false);
      if (!rows.ok) expect(rows.error).toBe("unknown_schema");

      const write = await jord.insertTableRow({
        table: "lab_notes",
        schema: "app",
        values: { id: "1", title: "x" },
      });
      expect(write.ok).toBe(false);
      if (!write.ok) expect(write.error).toBe("unknown_schema");

      const drop = await jord.dropTable({ name: "lab_notes", schema: "app" });
      expect(drop.ok).toBe(false);
      if (!drop.ok) expect(drop.error).toBe("unknown_schema");
      expect(await jord.describeTable("lab_notes")).not.toBeNull();
    } finally {
      await jord.close();
    }
  });

  it("persists schema_name on jord_table_rls and jord_tracked_tables", async () => {
    const jord = await openLibsql();
    try {
      const columns = async (table: string) =>
        (await jord.query(`SELECT name FROM pragma_table_info('${table}')`)).map((r) =>
          String(r.name),
        );
      expect(await columns("jord_table_rls")).toContain("schema_name");
      expect(await columns("jord_tracked_tables")).toContain("schema_name");

      // The baseline `records` row survives the 0011 rebuild under `main`.
      const tracked = await jord.query(
        "SELECT schema_name FROM jord_tracked_tables WHERE table_name = 'records'",
      );
      expect(tracked).toEqual([{ schema_name: "main" }]);

      const saved = await jord.setTableRls({
        tableName: "lab_notes",
        rlsEnabled: true,
        ownerColumn: "owner_id",
      });
      expect(saved).toMatchObject({
        tableName: "lab_notes",
        schema: "main",
        rlsEnabled: true,
        ownerColumn: "owner_id",
      });
      expect(await jord.getTableRls("lab_notes")).toMatchObject({ schema: "main" });
      expect(await jord.getTableRls("lab_notes", "main")).toMatchObject({
        rlsEnabled: true,
      });
      expect(await jord.getTableRls("lab_notes", "app")).toBeNull();
    } finally {
      await jord.close();
    }
  });

  it("keeps rls and tracking rows with the table across a rename", async () => {
    const jord = await openLibsql();
    try {
      await jord.createTable({
        name: "lab_a",
        columns: [{ name: "title", type: "TEXT" }],
      });
      await jord.setTableRls({ tableName: "lab_a", rlsEnabled: true });
      await jord.query(
        "INSERT INTO jord_tracked_tables (table_name, tracked_at) VALUES ('lab_a', 1)",
      );
      const renamed = await jord.renameTable({ name: "lab_a", newName: "lab_b" });
      expect(renamed.ok).toBe(true);
      expect(await jord.getTableRls("lab_a")).toBeNull();
      expect(await jord.getTableRls("lab_b")).toMatchObject({ rlsEnabled: true });
      const tracked = await jord.query(
        "SELECT schema_name, table_name FROM jord_tracked_tables WHERE table_name = 'lab_b'",
      );
      expect(tracked).toEqual([{ schema_name: "main", table_name: "lab_b" }]);
    } finally {
      await jord.close();
    }
  });
});

const liveUrl = process.env.JORD_TEST_POSTGRES_URL?.trim();

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

describe.runIf(Boolean(liveUrl))("PostgresAdapter schema scope (live)", () => {
  async function withScratch<T>(
    work: (jord: PostgresAdapter, ownerUrl: string) => Promise<T>,
  ): Promise<T> {
    const database = `jord_s49_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const admin = new Client({ connectionString: liveUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${database}`);
    const ownerUrl = withDatabase(liveUrl!, database);
    const jord = await PostgresAdapter.open(ownerUrl);
    try {
      return await work(jord, ownerUrl);
    } finally {
      await jord.close();
      await admin
        .query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`)
        .catch(() => undefined);
      await admin.end();
    }
  }

  it("lists schemas, resolves them, and rejects unknown names", async () => {
    await withScratch(async (jord) => {
      expect(jord.defaultSchema).toBe("public");
      await jord.query("CREATE SCHEMA app");
      const names = (await jord.listSchemas()).map((s) => s.name);
      expect(names).toContain("public");
      expect(names).toContain("app");
      expect(names).not.toContain("information_schema");
      expect(names.some((n) => n.startsWith("pg_"))).toBe(false);
      expect((await jord.listSchemas()).every((s) => s.readOnly === false)).toBe(true);

      expect(await jord.resolveSchema()).toEqual({ ok: true, schema: "public" });
      expect(await jord.resolveSchema("app")).toEqual({ ok: true, schema: "app" });
      for (const bad of ["nope", "pg_catalog", "information_schema", 'a"b']) {
        const resolved = await jord.resolveSchema(bad);
        expect(resolved.ok).toBe(false);
        if (!resolved.ok) expect(resolved.error).toBe("unknown_schema");
      }
    });
  });

  it("creates, introspects, and mutates a table in a non-public schema", async () => {
    await withScratch(async (jord) => {
      await jord.query("CREATE SCHEMA app");
      const inApp = await jord.createTable({
        name: "notes",
        schema: "app",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(inApp.ok).toBe(true);
      if (inApp.ok) expect(inApp.sql).toContain('"app"."notes"');

      // Same name in public is independent.
      const inPublic = await jord.createTable({
        name: "notes",
        columns: [{ name: "body", type: "TEXT" }],
      });
      expect(inPublic.ok).toBe(true);

      expect(await jord.listTables("app")).toEqual(["notes"]);
      expect(await jord.listTables()).toContain("notes");
      expect(await jord.listTables("app")).not.toContain("records");

      const appInfo = await jord.describeTable("notes", "app");
      expect(appInfo?.schema).toBe("app");
      expect(appInfo?.columns.map((c) => c.name)).toEqual(["id", "title"]);
      const publicInfo = await jord.describeTable("notes");
      expect(publicInfo?.schema).toBe("public");
      expect(publicInfo?.columns.map((c) => c.name)).toEqual(["id", "body"]);
      expect(await jord.describeTable("notes", "nope")).toBeNull();

      const dup = await jord.createTable({
        name: "notes",
        schema: "app",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(dup.ok).toBe(false);
      if (!dup.ok) expect(dup.error).toBe("table_exists");

      const unknown = await jord.createTable({
        name: "notes",
        schema: "nope",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) expect(unknown.error).toBe("unknown_schema");

      expect(
        (await jord.insertTableRow({ table: "notes", schema: "app", values: { id: "1", title: "a" } }))
          .ok,
      ).toBe(true);
      expect(
        (await jord.insertTableRow({ table: "notes", values: { id: "9", body: "p" } })).ok,
      ).toBe(true);

      const appRows = await jord.listTableRows({
        table: "notes",
        schema: "app",
        limit: 10,
        offset: 0,
      });
      expect(appRows.ok && appRows.rows).toEqual([{ id: "1", title: "a" }]);
      const publicRows = await jord.listTableRows({ table: "notes", limit: 10, offset: 0 });
      expect(publicRows.ok && publicRows.rows).toEqual([{ id: "9", body: "p" }]);

      expect(
        (await jord.updateTableRow({ table: "notes", schema: "app", pk: "1", values: { title: "b" } }))
          .ok,
      ).toBe(true);

      expect(
        (await jord.addColumn({ table: "notes", schema: "app", name: "score", type: "INTEGER" })).ok,
      ).toBe(true);
      expect((await jord.describeTable("notes", "app"))?.columns.map((c) => c.name)).toContain(
        "score",
      );
      expect((await jord.describeTable("notes"))?.columns.map((c) => c.name)).not.toContain(
        "score",
      );

      expect(
        (
          await jord.alterColumn({
            table: "notes",
            schema: "app",
            column: "score",
            type: "REAL",
            confirm: true,
          })
        ).ok,
      ).toBe(true);
      expect(
        (await jord.alterColumn({ table: "notes", schema: "app", column: "title", name: "label" }))
          .ok,
      ).toBe(true);
      const afterAlter = await jord.listTableRows({
        table: "notes",
        schema: "app",
        limit: 10,
        offset: 0,
      });
      expect(afterAlter.ok && afterAlter.rows[0]).toMatchObject({ id: "1", label: "b" });

      expect(
        (await jord.dropColumn({
          table: "notes",
          schema: "app",
          column: "score",
          confirm: true,
        })).ok,
      ).toBe(true);
      expect(
        (await jord.renameTable({ name: "notes", newName: "memos", schema: "app" })).ok,
      ).toBe(true);
      expect(await jord.listTables("app")).toEqual(["memos"]);
      expect(await jord.describeTable("notes")).not.toBeNull();

      expect((await jord.deleteTableRow({ table: "memos", schema: "app", pk: "1" })).ok).toBe(true);
      expect(
        (await jord.dropTable({ name: "memos", schema: "app", confirm: true })).ok,
      ).toBe(true);
      expect(await jord.listTables("app")).toEqual([]);
      expect(await jord.describeTable("notes")).not.toBeNull();

      const gone = await jord.dropTable({ name: "memos", schema: "nope" });
      expect(gone.ok).toBe(false);
      if (!gone.ok) expect(gone.error).toBe("unknown_schema");
    });
  });

  it("scopes jord_table_rls and native RLS to the schema", async () => {
    await withScratch(async (jord) => {
      await jord.query("CREATE SCHEMA app");
      await jord.createTable({ name: "notes", schema: "app", columns: [{ name: "title", type: "TEXT" }] });
      await jord.createTable({ name: "notes", columns: [{ name: "title", type: "TEXT" }] });

      const saved = await jord.setTableRls({
        tableName: "notes",
        schema: "app",
        rlsEnabled: true,
      });
      expect(saved).toMatchObject({ tableName: "notes", schema: "app", rlsEnabled: true });
      expect(await jord.getTableRls("notes", "app")).toMatchObject({ rlsEnabled: true });
      expect(await jord.getTableRls("notes")).toBeNull();

      await jord.syncRecordsPoliciesRls();
      const flags = await jord.query(
        `SELECT n.nspname AS schema, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relname = 'notes' ORDER BY n.nspname`,
      );
      expect(flags).toEqual([
        { schema: "app", rls: true, forced: true },
        { schema: "public", rls: false, forced: false },
      ]);

      // Rename moves the flag within its own schema only.
      await jord.setTableRls({ tableName: "notes", rlsEnabled: false });
      expect(
        (await jord.renameTable({ name: "notes", newName: "memos", schema: "app" })).ok,
      ).toBe(true);
      expect(await jord.getTableRls("memos", "app")).toMatchObject({ rlsEnabled: true });
      expect(await jord.getTableRls("notes", "app")).toBeNull();
      expect(await jord.getTableRls("notes")).toMatchObject({ rlsEnabled: false });
    });
  });
});
