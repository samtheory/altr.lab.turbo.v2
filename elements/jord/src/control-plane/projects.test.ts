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

describe("control-plane migrations (S0042)", () => {
  it("creates jord_projects and jord_project_keys on libSQL boot", async () => {
    const dir = await makeTempDir("jord-cp-");
    temps.push(dir);
    const url = fsPathToFileUrl(path.join(dir, "jord.db"));
    const jord = await createJordClient({ url });
    try {
      const client = jord.client;
      if (!client) throw new Error("expected libsql client");
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      const names = new Set(tables.rows.map((row) => String(row.name)));
      expect(names.has("jord_projects")).toBe(true);
      expect(names.has("jord_project_keys")).toBe(true);

      const applied = await client.execute(
        "SELECT id FROM jord_migrations WHERE id = '0009'",
      );
      expect(applied.rows).toHaveLength(1);
    } finally {
      await jord.close();
    }
  });
});
