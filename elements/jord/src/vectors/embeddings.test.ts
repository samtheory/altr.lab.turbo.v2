import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient } from "../client.js";
import { fsPathToFileUrl } from "../url.js";

const temps: string[] = [];

async function rmTempDir(dir: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM") throw err;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
}

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("jord embeddings", () => {
  it("upserts and ranks nearest neighbor", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-emb-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    try {
      const a = Array(8).fill(0);
      a[0] = 1;
      const b = Array(8).fill(0);
      b[1] = 1;
      const ua = await jord.upsertEmbedding({
        id: "a",
        namespace: "lab",
        embedding: a,
      });
      expect(ua.ok).toBe(true);
      await jord.upsertEmbedding({ id: "b", namespace: "lab", embedding: b });
      const search = await jord.searchVectors({
        namespace: "lab",
        embedding: a,
        limit: 2,
      });
      expect(search.ok).toBe(true);
      if (search.ok) {
        expect(search.hits[0]?.id).toBe("a");
        expect(search.hits[0]!.score).toBeGreaterThan(search.hits[1]!.score);
      }
    } finally {
      await jord.close();
    }
  });
});
