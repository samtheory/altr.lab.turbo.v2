import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";
import { records } from "./records.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("records schema", () => {
  it("creates table with version and INTEGER timestamps; Drizzle uses mode number", async () => {
    const dir = await makeTempDir("jord-schema-");
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });

    try {
      expect(jord.dialect).toBe("libsql");
      if (!jord.client) throw new Error("expected libsql client");
      const info = await jord.client.execute("PRAGMA table_info(records)");
      const cols = new Map(
        info.rows.map((r) => [
          String(r.name ?? r[1]),
          String(r.type ?? r[2]).toUpperCase(),
        ]),
      );

      expect(cols.get("version")).toBe("INTEGER");
      expect(cols.get("created_at")).toBe("INTEGER");
      expect(cols.get("updated_at")).toBe("INTEGER");
      expect(cols.has("bucket")).toBe(true);

      const indexes = await jord.client.execute("PRAGMA index_list(records)");
      const indexNames = indexes.rows.map((r) => String(r.name ?? r[1]));
      expect(indexNames).toContain("records_bucket_created_at_idx");

      // Drizzle column config: mode 'number' on both timestamp fields
      expect(records.createdAt.dataType).toBe("number");
      expect(records.updatedAt.dataType).toBe("number");
    } finally {
      await jord.close();
    }
  });
});
