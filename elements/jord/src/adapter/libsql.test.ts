import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { JordSlice0UrlError } from "../errors.js";
import { makeTempDir, rmTempDir } from "../test-temp.js";
import { fsPathToFileUrl } from "../url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function tempFileUrl(name = "jord.db"): Promise<string> {
  const dir = await makeTempDir("jord-");
  temps.push(dir);
  return fsPathToFileUrl(path.join(dir, name));
}

describe("createJordClient / LibSqlAdapter", () => {
  it("creates missing parent directory and opens file:", async () => {
    const parent = await makeTempDir("jord-parent-");
    temps.push(parent);
    const nested = path.join(parent, "missing", "data", "jord.db");
    const url = fsPathToFileUrl(nested);

    const jord = await createJordClient({ url });
    try {
      const mode = await jord.client.execute("PRAGMA journal_mode");
      const busy = await jord.client.execute("PRAGMA busy_timeout");
      const sync = await jord.client.execute("PRAGMA synchronous");

      expect(String(mode.rows[0]?.[0] ?? mode.rows[0]?.journal_mode).toLowerCase()).toBe(
        "wal",
      );
      expect(Number(busy.rows[0]?.[0] ?? busy.rows[0]?.busy_timeout)).toBe(5000);
      // SQLite: NORMAL = 1
      expect(Number(sync.rows[0]?.[0] ?? sync.rows[0]?.synchronous)).toBe(1);
    } finally {
      await jord.close();
    }
  });

  it("rejects postgres: with a Slice 0 error", async () => {
    await expect(
      createJordClient({ url: "postgres://localhost/jord" }),
    ).rejects.toBeInstanceOf(JordSlice0UrlError);

    await expect(
      createJordClient({ url: "postgres://localhost/jord" }),
    ).rejects.toThrow(/Slice 0 accepts only file:/);
  });

  it("rejects libsql: with a Slice 0 error", async () => {
    await expect(
      createJordClient({ url: "libsql://example.turso.io" }),
    ).rejects.toThrow(/Slice 0 accepts only file:/);
  });

  it("opens a clean temp file: URL", async () => {
    const url = await tempFileUrl();
    const jord = await createJordClient({ url });
    await jord.close();
  });
});
