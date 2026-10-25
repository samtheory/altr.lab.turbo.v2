import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient, fsPathToFileUrl } from "../index.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

describe("S0024 executeSql read-only", () => {
  it("rejects writes via PRAGMA query_only without parsing the statement", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-sql-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    try {
      await expect(
        jord.executeSql({
          sql: "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('x', 'lab', '{}', 1, 1, 1)",
          readOnly: true,
        }),
      ).rejects.toThrow();

      const rows = await jord.executeSql({
        sql: "SELECT 1 AS n",
        readOnly: true,
      });
      expect(rows.rows).toEqual([{ n: 1 }]);
      expect(rows.columns).toEqual(["n"]);
    } finally {
      await jord.close();
    }
  });
});
