import path from "node:path";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "./app.js";
import { createWriteQueue } from "./queue.js";
import { truncateWalCheckpoint } from "./wal.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

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

async function testApp() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-server-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const app = createJordApp({ jord, enqueueWrite: createWriteQueue() });
  return { app, jord };
}

describe("jord-server routes", () => {
  it("health reports libsql", async () => {
    const { app, jord } = await testApp();
    try {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, dialect: "libsql" });
    } finally {
      await jord.close();
    }
  });

  it("POST then GET by bucket round-trips", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bucket: "lab",
          body: JSON.stringify({ hello: "jord" }),
        }),
      });
      expect(created.status).toBe(201);
      const row = (await created.json()) as { id: string; version: number };
      expect(row.version).toBe(1);

      const list = await app.request("/records?bucket=lab");
      expect(list.status).toBe(200);
      const rows = (await list.json()) as Array<{ id: string }>;
      expect(rows.map((r) => r.id)).toContain(row.id);

      const one = await app.request(`/records/${row.id}`);
      expect(one.status).toBe(200);
    } finally {
      await jord.close();
    }
  });

  it("PATCH with stale version returns 409 and leaves version unchanged", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      const row = (await created.json()) as { id: string; version: number };

      const ok = await app.request(`/records/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: 1, body: '{"v":2}' }),
      });
      expect(ok.status).toBe(200);
      expect(((await ok.json()) as { version: number }).version).toBe(2);

      const stale = await app.request(`/records/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: 1, body: '{"v":stale}' }),
      });
      expect(stale.status).toBe(409);

      const current = await app.request(`/records/${row.id}`);
      const body = (await current.json()) as { version: number; body: string };
      expect(body.version).toBe(2);
      expect(body.body).toBe('{"v":2}');
    } finally {
      await jord.close();
    }
  });

  it("schema list/describe and ADD COLUMN round-trip", async () => {
    const { app, jord } = await testApp();
    try {
      const list = await app.request("/schema/tables");
      expect(list.status).toBe(200);
      expect(((await list.json()) as { tables: string[] }).tables).toContain(
        "records",
      );

      const desc = await app.request("/schema/tables/records");
      expect(desc.status).toBe(200);
      const info = (await desc.json()) as {
        name: string;
        columns: Array<{ name: string }>;
      };
      expect(info.name).toBe("records");
      expect(info.columns.map((c) => c.name)).toContain("bucket");

      const added = await app.request("/schema/tables/records/columns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "studio_flag", type: "INTEGER" }),
      });
      expect(added.status).toBe(201);

      const again = await app.request("/schema/tables/records");
      const cols = (
        (await again.json()) as { columns: Array<{ name: string }> }
      ).columns.map((c) => c.name);
      expect(cols).toContain("studio_flag");

      const dup = await app.request("/schema/tables/records/columns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "studio_flag", type: "INTEGER" }),
      });
      expect(dup.status).toBe(409);
    } finally {
      await jord.close();
    }
  });

  it("truncateWalCheckpoint is callable (shutdown / interval path)", async () => {
    const { jord } = await testApp();
    try {
      await expect(truncateWalCheckpoint(jord)).resolves.toBeUndefined();
    } finally {
      await jord.close();
    }
  });
});
