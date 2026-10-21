import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "./client.js";
import { makeTempDir, rmTempDir } from "./test-temp.js";
import { fsPathToFileUrl } from "./url.js";

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function openTemp() {
  const dir = await makeTempDir("jord-occ-");
  temps.push(dir);
  return createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
}

describe("records OCC", () => {
  it("insert starts at version 1; matching update bumps version and updated_at", async () => {
    const jord = await openTemp();
    try {
      const inserted = await jord.insertRecord({
        bucket: "lab",
        body: JSON.stringify({ note: "a" }),
      });
      expect(inserted.version).toBe(1);

      await new Promise((r) => setTimeout(r, 5));

      const updated = await jord.updateRecord({
        id: inserted.id,
        version: 1,
        body: JSON.stringify({ note: "b" }),
      });
      expect(updated.ok).toBe(true);
      if (!updated.ok) return;
      expect(updated.record.version).toBe(2);
      expect(updated.record.updatedAt).toBeGreaterThanOrEqual(inserted.updatedAt);
      expect(updated.record.body).toContain("b");
    } finally {
      await jord.close();
    }
  });

  it("second update with the same version conflicts; row stays at version 2", async () => {
    const jord = await openTemp();
    try {
      const inserted = await jord.insertRecord({
        bucket: "lab",
        body: "{}",
      });

      const first = await jord.updateRecord({
        id: inserted.id,
        version: 1,
        body: JSON.stringify({ n: 1 }),
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.record.version).toBe(2);

      const second = await jord.updateRecord({
        id: inserted.id,
        version: 1,
        body: JSON.stringify({ n: 2 }),
      });
      expect(second).toEqual({ ok: false, conflict: true });

      const row = await jord.getRecord(inserted.id);
      expect(row?.version).toBe(2);
      expect(row?.body).toBe(JSON.stringify({ n: 1 }));
    } finally {
      await jord.close();
    }
  });

  it("list by bucket returns newest first with version", async () => {
    const jord = await openTemp();
    try {
      const a = await jord.insertRecord({ bucket: "lab", body: "1" });
      await new Promise((r) => setTimeout(r, 5));
      const b = await jord.insertRecord({ bucket: "lab", body: "2" });
      await jord.insertRecord({ bucket: "other", body: "x" });

      const list = await jord.listRecordsByBucket("lab");
      expect(list.map((r) => r.id)).toEqual([b.id, a.id]);
      expect(list.every((r) => typeof r.version === "number")).toBe(true);
    } finally {
      await jord.close();
    }
  });

  it("deleteRecord removes the row; missing id returns false", async () => {
    const jord = await openTemp();
    try {
      const inserted = await jord.insertRecord({
        bucket: "lab",
        body: "{}",
      });
      expect(await jord.deleteRecord(inserted.id)).toBe(true);
      expect(await jord.getRecord(inserted.id)).toBeNull();
      expect(await jord.deleteRecord(inserted.id)).toBe(false);
    } finally {
      await jord.close();
    }
  });
});
