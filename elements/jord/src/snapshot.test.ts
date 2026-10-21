import { access } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "./client.js";
import { snapshotDatabase } from "./snapshot.js";
import { makeTempDir, rmTempDir } from "./test-temp.js";
import { fsPathToFileUrl } from "./url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("snapshotDatabase", () => {
  it("writes a readable snapshot via VACUUM INTO", async () => {
    const dir = await makeTempDir("jord-snap-");
    temps.push(dir);
    const dbPath = path.join(dir, "jord.db");
    const url = fsPathToFileUrl(dbPath);
    const dest = path.join(dir, "snapshots", "jord-test.db");

    const jord = await createJordClient({ url });
    try {
      await jord.insertRecord({ bucket: "lab", body: '{"ok":true}' });
    } finally {
      await jord.close();
    }

    const written = await snapshotDatabase({ url, destPath: dest });
    expect(written).toBe(path.resolve(dest));
    await access(written);

    const reader = createClient({ url: fsPathToFileUrl(written) });
    try {
      const rs = await reader.execute(
        "SELECT bucket, body FROM records WHERE bucket = 'lab'",
      );
      expect(rs.rows.length).toBe(1);
      expect(String(rs.rows[0]?.body ?? rs.rows[0]?.[1])).toContain("ok");
    } finally {
      reader.close();
    }
  });
});
