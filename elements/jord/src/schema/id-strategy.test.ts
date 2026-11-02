import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";
import { generateId, parseIdStrategy } from "./id-strategy.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("id strategy parsers + generators", () => {
  it("parses strategies and rejects bad nanoid size", () => {
    expect(parseIdStrategy({ kind: "uuid_v7" }).ok).toBe(true);
    expect(parseIdStrategy({ kind: "nanoid", size: 2 }).ok).toBe(false);
  });

  it("produces unique values under concurrent generation", async () => {
    const kinds = ["uuid_v4", "uuid_v7", "ulid", "nanoid", "cuid2"] as const;
    for (const kind of kinds) {
      const strategy = parseIdStrategy({ kind });
      expect(strategy.ok).toBe(true);
      if (!strategy.ok) continue;
      const ids = await Promise.all(
        Array.from({ length: 50 }, () =>
          Promise.resolve(generateId(strategy.strategy)),
        ),
      );
      expect(new Set(ids.map(String)).size).toBe(50);
    }
  });
});

describe("S0054 write-path id strategies", () => {
  it("fills uuid/ulid/nanoid/cuid2 on insert and stays unique under concurrency", async () => {
    const dir = await makeTempDir("jord-s0054-");
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    try {
      for (const kind of ["uuid_v4", "uuid_v7", "ulid", "nanoid", "cuid2"] as const) {
        const table = `lab_${kind}`;
        const created = await jord.createTable({
          name: table,
          columns: [
            {
              name: "id",
              type: "TEXT",
              pk: true,
              settings: { idStrategy: { kind } },
            },
            { name: "title", type: "TEXT" },
          ],
        });
        expect(created.ok).toBe(true);

        const results = await Promise.all(
          Array.from({ length: 50 }, (_, i) =>
            jord.insertTableRow({
              table,
              values: { title: `row-${i}` },
            }),
          ),
        );
        expect(results.every((r) => r.ok)).toBe(true);

        const rows = await jord.listTableRows({
          table,
          limit: 100,
          offset: 0,
        });
        expect(rows.ok).toBe(true);
        if (!rows.ok) continue;
        const ids = rows.rows.map((row) => String(row.id));
        expect(ids).toHaveLength(50);
        expect(new Set(ids).size).toBe(50);
      }
    } finally {
      await jord.close();
    }
  });
});
