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

      const inserted = await jord.insertTableRow({
        table: "lab_notes",
        values: { id: "n2", title: "second" },
      });
      expect(inserted.ok).toBe(true);
      const dupPk = await jord.insertTableRow({
        table: "lab_notes",
        values: { id: "n2", title: "again" },
      });
      expect(dupPk.ok).toBe(false);
      if (!dupPk.ok) expect(dupPk.error).toBe("pk_exists");
      const updated = await jord.updateTableRow({
        table: "lab_notes",
        pk: "n2",
        values: { title: "edited" },
      });
      expect(updated.ok).toBe(true);
      const removed = await jord.deleteTableRow({
        table: "lab_notes",
        pk: "n2",
      });
      expect(removed.ok).toBe(true);
      const missing = await jord.deleteTableRow({
        table: "lab_notes",
        pk: "n2",
      });
      expect(missing.ok).toBe(false);
      if (!missing.ok) expect(missing.error).toBe("not_found");
      const reservedWrite = await jord.insertTableRow({
        table: "records",
        values: { id: "x" },
      });
      expect(reservedWrite.ok).toBe(false);
      if (!reservedWrite.ok) expect(reservedWrite.error).toBe("reserved");
    } finally {
      await jord.close();
    }
  });

  it("drops, renames, and alters columns on user tables", async () => {
    const dir = await makeTempDir("jord-ddl-alter-");
    temps.push(dir);
    const jord = await LibSqlAdapter.open(
      fsPathToFileUrl(path.join(dir, "jord.db")),
    );

    try {
      const created = await jord.createTable({
        name: "lab_items",
        columns: [
          { name: "id", type: "TEXT", pk: true },
          { name: "title", type: "TEXT" },
          { name: "score", type: "INTEGER" },
        ],
      });
      expect(created.ok).toBe(true);

      await jord.insertTableRow({
        table: "lab_items",
        values: { id: "1", title: "a", score: 3 },
      });

      const renamedCol = await jord.alterColumn({
        table: "lab_items",
        column: "title",
        name: "label",
      });
      expect(renamedCol.ok).toBe(true);

      const typed = await jord.alterColumn({
        table: "lab_items",
        column: "score",
        type: "REAL",
      });
      expect(typed.ok).toBe(true);

      const droppedCol = await jord.dropColumn({
        table: "lab_items",
        column: "label",
      });
      expect(droppedCol.ok).toBe(true);

      const pkDrop = await jord.dropColumn({
        table: "lab_items",
        column: "id",
      });
      expect(pkDrop.ok).toBe(false);
      if (!pkDrop.ok) expect(pkDrop.error).toBe("pk_required");

      const renamed = await jord.renameTable({
        name: "lab_items",
        newName: "lab_stuff",
      });
      expect(renamed.ok).toBe(true);
      expect(await jord.describeTable("lab_items")).toBeNull();
      expect(await jord.describeTable("lab_stuff")).not.toBeNull();

      const reservedDrop = await jord.dropTable({ name: "records" });
      expect(reservedDrop.ok).toBe(false);
      if (!reservedDrop.ok) expect(reservedDrop.error).toBe("reserved");

      const dropped = await jord.dropTable({ name: "lab_stuff" });
      expect(dropped.ok).toBe(true);
      expect(await jord.describeTable("lab_stuff")).toBeNull();

      const missing = await jord.dropTable({ name: "lab_stuff" });
      expect(missing.ok).toBe(false);
      if (!missing.ok) expect(missing.error).toBe("table_not_found");
    } finally {
      await jord.close();
    }
  });
});
