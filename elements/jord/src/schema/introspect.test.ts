import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LibSqlAdapter } from "../adapter/libsql.js";
import { createJordClient } from "../client.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("schema introspect + ADD COLUMN", () => {
  it("lists records and describes known columns", async () => {
    const dir = await makeTempDir("jord-introspect-");
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });

    try {
      const tables = await jord.listTables();
      expect(tables).toContain("records");

      const info = await jord.describeTable("records");
      expect(info).not.toBeNull();
      const names = info!.columns.map((c) => c.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "bucket",
          "body",
          "metadata",
          "created_at",
          "updated_at",
          "version",
        ]),
      );
      expect(await jord.describeTable("nope")).toBeNull();
      expect(await jord.describeTable("records;drop")).toBeNull();
    } finally {
      await jord.close();
    }
  });

  it("adds a TEXT column and rejects duplicates / bad idents", async () => {
    const dir = await makeTempDir("jord-addcol-");
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });

    try {
      const ok = await jord.addColumn({
        table: "records",
        name: "lab_note",
        type: "TEXT",
      });
      expect(ok).toEqual({ ok: true });

      const info = await jord.describeTable("records");
      expect(info!.columns.some((c) => c.name === "lab_note")).toBe(true);

      const dup = await jord.addColumn({
        table: "records",
        name: "lab_note",
        type: "TEXT",
      });
      expect(dup.ok).toBe(false);
      if (!dup.ok) expect(dup.error).toBe("column_exists");

      const bad = await jord.addColumn({
        table: "records",
        name: "bad-name",
        type: "TEXT",
      });
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.error).toBe("invalid_identifier");
    } finally {
      await jord.close();
    }
  });

  it("creates a user table, rejects reserved and duplicates, and lists rows", async () => {
    const dir = await makeTempDir("jord-create-");
    temps.push(dir);
    const jord = await LibSqlAdapter.open(
      fsPathToFileUrl(path.join(dir, "jord.db")),
    );

    try {
      const created = await jord.createTable({
        name: "lab_notes",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.sql).toContain('"id" TEXT PRIMARY KEY');
      expect(created.sql).toContain('"title" TEXT');

      const info = await jord.describeTable("lab_notes");
      expect(info?.columns.map((c) => c.name)).toEqual(["id", "title"]);
      expect(info?.columns[0]?.pk).toBe(true);

      const again = await jord.createTable({
        name: "lab_notes",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(again.ok).toBe(false);
      if (!again.ok) expect(again.error).toBe("table_exists");

      const reserved = await jord.createTable({
        name: "records",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(reserved.ok).toBe(false);
      if (!reserved.ok) expect(reserved.error).toBe("reserved");

      const jordPrefix = await jord.createTable({
        name: "jord_secrets",
        columns: [{ name: "title", type: "TEXT" }],
      });
      expect(jordPrefix.ok).toBe(false);
      if (!jordPrefix.ok) expect(jordPrefix.error).toBe("reserved");

      await jord.client.execute({
        sql: `INSERT INTO lab_notes (id, title) VALUES (?, ?)`,
        args: ["n1", "hello"],
      });
      const rows = await jord.listTableRows({
        table: "lab_notes",
        limit: 10,
        offset: 0,
      });
      expect(rows.ok).toBe(true);
      if (!rows.ok) return;
      expect(rows.rows).toEqual([{ id: "n1", title: "hello" }]);
    } finally {
      await jord.close();
    }
  });
});
