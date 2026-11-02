import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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

describe("S0053 column settings round-trip", () => {
  it("persists settings, validates writes, and requires confirm for unsafe DDL", async () => {
    const dir = await makeTempDir("jord-s0053-");
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    try {
      const created = await jord.createTable({
        name: "lab_posts",
        columns: [
          { name: "id", type: "TEXT", pk: true },
          {
            name: "title",
            type: "TEXT",
            settings: {
              nullable: false,
              default: { kind: "literal", value: "draft" },
              validation: { minLength: 2, maxLength: 20, pattern: "^[a-z0-9_]+$" },
              comment: "slug-like title",
            },
          },
          {
            name: "updated_at",
            type: "INTEGER",
            settings: { autoUpdateTimestamp: true },
          },
        ],
      });
      expect(created.ok).toBe(true);

      const info = await jord.describeTable("lab_posts");
      expect(info?.columns.find((c) => c.name === "title")?.settings).toMatchObject({
        nullable: false,
        validation: { minLength: 2, maxLength: 20, pattern: "^[a-z0-9_]+$" },
        comment: "slug-like title",
      });

      const bad = await jord.insertTableRow({
        table: "lab_posts",
        values: { id: "1", title: "A" },
      });
      expect(bad.ok).toBe(false);
      if (!bad.ok) {
        expect(bad.error).toBe("validation");
        expect(bad.field).toBe("title");
      }

      const ok = await jord.insertTableRow({
        table: "lab_posts",
        values: { id: "1", title: "hello" },
      });
      expect(ok.ok).toBe(true);

      const updated = await jord.updateTableRow({
        table: "lab_posts",
        pk: "1",
        values: { title: "hello2" },
      });
      expect(updated.ok).toBe(true);
      const rows = await jord.listTableRows({
        table: "lab_posts",
        limit: 10,
        offset: 0,
      });
      expect(rows.ok && typeof rows.rows[0]?.updated_at === "number").toBe(true);

      const unsafe = await jord.alterColumn({
        table: "lab_posts",
        column: "title",
        type: "INTEGER",
      });
      expect(unsafe.ok).toBe(false);
      if (!unsafe.ok) expect(unsafe.error).toBe("confirm_required");

      const dropNoConfirm = await jord.dropColumn({
        table: "lab_posts",
        column: "updated_at",
      });
      expect(dropNoConfirm.ok).toBe(false);
      if (!dropNoConfirm.ok) expect(dropNoConfirm.error).toBe("confirm_required");

      const dropped = await jord.dropColumn({
        table: "lab_posts",
        column: "updated_at",
        confirm: true,
      });
      expect(dropped.ok).toBe(true);
    } finally {
      await jord.close();
    }
  });
});
