import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { JordUnsupportedError } from "../errors.js";
import { JORD_TABLE_NAMES } from "../schema/table-names.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.join(here, "..", "schema");

describe("Postgres migrate parity", () => {
  it("lists the same control-plane tables in both migrate modules", () => {
    const sqlite = readFileSync(path.join(schemaDir, "migrate.ts"), "utf8");
    const postgres = readFileSync(
      path.join(schemaDir, "migrate-postgres.ts"),
      "utf8",
    );
    for (const name of JORD_TABLE_NAMES) {
      expect(sqlite).toContain(`CREATE TABLE IF NOT EXISTS ${name}`);
      expect(postgres).toContain(`CREATE TABLE IF NOT EXISTS ${name}`);
    }
    expect(postgres).toMatch(/created_at BIGINT/);
    expect(postgres).toMatch(/updated_at BIGINT/);
  });
});

const liveUrl = process.env.JORD_TEST_POSTGRES_URL?.trim();

describe.runIf(Boolean(liveUrl))("PostgresAdapter live", () => {
  it("inserts, OCC-conflicts, and deletes a record", async () => {
    const jord = await createJordClient({ url: liveUrl });
    try {
      expect(jord.dialect).toBe("postgres");
      const inserted = await jord.insertRecord({
        bucket: "lab",
        body: JSON.stringify({ n: 1 }),
      });
      expect(inserted.version).toBe(1);

      const ok = await jord.updateRecord({
        id: inserted.id,
        version: inserted.version,
        body: JSON.stringify({ n: 2 }),
      });
      expect(ok.ok).toBe(true);
      if (!ok.ok) return;
      expect(ok.record.version).toBe(2);

      const conflict = await jord.updateRecord({
        id: inserted.id,
        version: 1,
        body: JSON.stringify({ n: 3 }),
      });
      expect(conflict).toEqual({ ok: false, conflict: true });

      await expect(jord.snapshotTo("/tmp/jord-pg-snap.db")).rejects.toBeInstanceOf(
        JordUnsupportedError,
      );

      expect(await jord.deleteRecord(inserted.id)).toBe(true);
    } finally {
      await jord.close();
    }
  });
});
