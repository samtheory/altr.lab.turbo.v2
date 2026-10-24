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

  it("maps CREATE TABLE types for Postgres", async () => {
    const { buildCreateTableSql, planCreateTable } = await import("../schema/ddl.js");
    const plan = planCreateTable({
      name: "lab_notes",
      columns: [
        { name: "title", type: "TEXT" },
        { name: "score", type: "REAL", pk: true },
        { name: "blob", type: "BLOB" },
      ],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(buildCreateTableSql(plan.name, plan.columns, "postgres")).toBe(
      'CREATE TABLE "lab_notes" ("title" TEXT, "score" DOUBLE PRECISION PRIMARY KEY, "blob" BYTEA)',
    );
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

  it("ranks embeddings with pgvector or cosine", async () => {
    const jord = await createJordClient({ url: liveUrl });
    try {
      expect(["pgvector", "cosine"]).toContain(jord.vectorBackend);
      const a = Array(8).fill(0);
      a[0] = 1;
      const b = Array(8).fill(0);
      b[1] = 1;
      const ns = `s0020_${Date.now().toString(36)}`;
      expect(
        (
          await jord.upsertEmbedding({
            id: "a",
            namespace: ns,
            embedding: a,
          })
        ).ok,
      ).toBe(true);
      expect(
        (
          await jord.upsertEmbedding({
            id: "b",
            namespace: ns,
            embedding: b,
          })
        ).ok,
      ).toBe(true);
      const search = await jord.searchVectors({
        namespace: ns,
        embedding: a,
        limit: 2,
      });
      expect(search.ok).toBe(true);
      if (!search.ok) return;
      expect(search.backend).toBe(jord.vectorBackend);
      expect(search.hits[0]?.id).toBe("a");
      expect(search.hits[0]!.score).toBeGreaterThan(search.hits[1]!.score);
      await jord.deleteEmbedding(ns, "a");
      await jord.deleteEmbedding(ns, "b");
    } finally {
      await jord.close();
    }
  });
});
