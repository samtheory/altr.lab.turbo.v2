import path from "node:path";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "./app.js";
import {
  signSessionToken,
  type JordAuthConfig,
  type JordRole,
} from "./auth/index.js";
import { GeneratedApiRegistry } from "./generated-api/index.js";
import { LogRing, startJobScheduler } from "./jobs/index.js";
import { createWriteQueue } from "./queue.js";
import { truncateWalCheckpoint } from "./wal.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const temps: string[] = [];

const TEST_AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
};

function authHeaders(
  roleOrRaw: JordRole | "raw" = "admin",
): Record<string, string> {
  if (roleOrRaw === "raw") {
    return { Authorization: `Bearer ${TEST_AUTH.secret}` };
  }
  const token = signSessionToken(roleOrRaw, TEST_AUTH.secret);
  return { Authorization: `Bearer ${token}` };
}

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

async function testApp(opts?: { generatedApi?: GeneratedApiRegistry }) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-server-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const generatedApi = opts?.generatedApi ?? new GeneratedApiRegistry();
  const enqueueWrite = createWriteQueue();
  const logs = new LogRing();
  const scheduler = startJobScheduler({
    jord,
    enqueueWrite,
    logs,
    autostart: false,
  });
  const app = createJordApp({
    jord,
    enqueueWrite,
    auth: TEST_AUTH,
    generatedApi,
    logs,
    scheduler,
  });
  return {
    app,
    jord,
    generatedApi,
    logs,
    scheduler,
    stop() {
      scheduler.stop();
    },
  };
}

describe("jord-server routes", () => {
  it("health reports libsql without auth", async () => {
    const { app, jord } = await testApp();
    try {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, dialect: "libsql" });
    } finally {
      await jord.close();
    }
  });

  it("protected routes return 401 without Authorization", async () => {
    const { app, jord } = await testApp();
    try {
      const res = await app.request("/records?bucket=lab");
      expect(res.status).toBe(401);
    } finally {
      await jord.close();
    }
  });

  it("protected routes return 401 with bad token", async () => {
    const { app, jord } = await testApp();
    try {
      const res = await app.request("/records?bucket=lab", {
        headers: { Authorization: "Bearer wrong" },
      });
      expect(res.status).toBe(401);
    } finally {
      await jord.close();
    }
  });

  it("POST then GET by bucket round-trips with bearer", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("raw"),
        },
        body: JSON.stringify({
          bucket: "lab",
          body: JSON.stringify({ hello: "jord" }),
        }),
      });
      expect(created.status).toBe(201);
      const row = (await created.json()) as { id: string; version: number };
      expect(row.version).toBe(1);

      const list = await app.request("/records?bucket=lab", {
        headers: authHeaders("raw"),
      });
      expect(list.status).toBe(200);
      const rows = (await list.json()) as Array<{ id: string }>;
      expect(rows.map((r) => r.id)).toContain(row.id);

      const one = await app.request(`/records/${row.id}`, {
        headers: authHeaders("admin"),
      });
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
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      const row = (await created.json()) as { id: string; version: number };

      const ok = await app.request(`/records/${row.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ version: 1, body: '{"v":2}' }),
      });
      expect(ok.status).toBe(200);
      expect(((await ok.json()) as { version: number }).version).toBe(2);

      const stale = await app.request(`/records/${row.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ version: 1, body: '{"v":stale}' }),
      });
      expect(stale.status).toBe(409);

      const current = await app.request(`/records/${row.id}`, {
        headers: authHeaders("readonly"),
      });
      const body = (await current.json()) as { version: number; body: string };
      expect(body.version).toBe(2);
      expect(body.body).toBe('{"v":2}');
    } finally {
      await jord.close();
    }
  });

  it("readonly cannot write records (403)", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("readonly"),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(created.status).toBe(403);
    } finally {
      await jord.close();
    }
  });

  it("editor can write records but cannot ADD COLUMN (403)", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(created.status).toBe(201);

      const added = await app.request("/schema/tables/records/columns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ name: "editor_flag", type: "INTEGER" }),
      });
      expect(added.status).toBe(403);
    } finally {
      await jord.close();
    }
  });

  it("schema list/describe and ADD COLUMN round-trip as admin", async () => {
    const { app, jord } = await testApp();
    try {
      const list = await app.request("/schema/tables", {
        headers: authHeaders("admin"),
      });
      expect(list.status).toBe(200);
      expect(((await list.json()) as { tables: string[] }).tables).toContain(
        "records",
      );

      const desc = await app.request("/schema/tables/records", {
        headers: authHeaders("admin"),
      });
      expect(desc.status).toBe(200);
      const info = (await desc.json()) as {
        name: string;
        columns: Array<{ name: string }>;
      };
      expect(info.name).toBe("records");
      expect(info.columns.map((c) => c.name)).toContain("bucket");

      const added = await app.request("/schema/tables/records/columns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({ name: "studio_flag", type: "INTEGER" }),
      });
      expect(added.status).toBe(201);

      const again = await app.request("/schema/tables/records", {
        headers: authHeaders("readonly"),
      });
      const cols = (
        (await again.json()) as { columns: Array<{ name: string }> }
      ).columns.map((c) => c.name);
      expect(cols).toContain("studio_flag");

      const dup = await app.request("/schema/tables/records/columns", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
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

  it("DELETE /records/:id removes the row", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      const row = (await created.json()) as { id: string };

      const deleted = await app.request(`/records/${row.id}`, {
        method: "DELETE",
        headers: authHeaders("editor"),
      });
      expect(deleted.status).toBe(200);
      expect(await deleted.json()).toEqual({ ok: true, id: row.id });

      const missing = await app.request(`/records/${row.id}`, {
        headers: authHeaders("readonly"),
      });
      expect(missing.status).toBe(404);

      const again = await app.request(`/records/${row.id}`, {
        method: "DELETE",
        headers: authHeaders("editor"),
      });
      expect(again.status).toBe(404);
    } finally {
      await jord.close();
    }
  });

  it("readonly cannot DELETE records (403)", async () => {
    const { app, jord } = await testApp();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      const row = (await created.json()) as { id: string };

      const deleted = await app.request(`/records/${row.id}`, {
        method: "DELETE",
        headers: authHeaders("readonly"),
      });
      expect(deleted.status).toBe(403);
    } finally {
      await jord.close();
    }
  });

  it("generated API catalog lists records CRUD ops", async () => {
    const { app, jord } = await testApp();
    try {
      const res = await app.request("/apis/generated", {
        headers: authHeaders("readonly"),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        resources: Array<{
          id: string;
          enabled: boolean;
          operations: Array<{ method: string; path: string }>;
        }>;
      };
      expect(body.resources).toHaveLength(1);
      expect(body.resources[0]?.id).toBe("records");
      expect(body.resources[0]?.enabled).toBe(true);
      const methods = body.resources[0]?.operations.map((o) => o.method) ?? [];
      expect(methods).toEqual(
        expect.arrayContaining(["GET", "POST", "PATCH", "DELETE"]),
      );
    } finally {
      await jord.close();
    }
  });

  it("admin can disable generated records API → 503; editor/readonly cannot toggle", async () => {
    const { app, jord } = await testApp();
    try {
      const editorToggle = await app.request("/apis/generated/records", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({ enabled: false }),
      });
      expect(editorToggle.status).toBe(403);

      const readonlyToggle = await app.request("/apis/generated/records", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("readonly"),
        },
        body: JSON.stringify({ enabled: false }),
      });
      expect(readonlyToggle.status).toBe(403);

      const disabled = await app.request("/apis/generated/records", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({ enabled: false }),
      });
      expect(disabled.status).toBe(200);
      expect(((await disabled.json()) as { enabled: boolean }).enabled).toBe(
        false,
      );

      const list = await app.request("/records?bucket=lab", {
        headers: authHeaders("admin"),
      });
      expect(list.status).toBe(503);
      expect(((await list.json()) as { error: string }).error).toBe(
        "api_disabled",
      );

      const catalog = await app.request("/apis/generated", {
        headers: authHeaders("readonly"),
      });
      expect(catalog.status).toBe(200);
      expect(
        (
          (await catalog.json()) as {
            resources: Array<{ enabled: boolean }>;
          }
        ).resources[0]?.enabled,
      ).toBe(false);

      const enabled = await app.request("/apis/generated/records", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({ enabled: true }),
      });
      expect(enabled.status).toBe(200);

      const listOk = await app.request("/records?bucket=lab", {
        headers: authHeaders("admin"),
      });
      expect(listOk.status).toBe(200);
    } finally {
      await jord.close();
    }
  });

  it("admin creates echo job, run-now succeeds; editor cannot manage", async () => {
    const ctx = await testApp();
    try {
      const denied = await ctx.app.request("/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("editor"),
        },
        body: JSON.stringify({
          name: "Nope",
          kind: "echo",
          interval_ms: 5000,
        }),
      });
      expect(denied.status).toBe(403);

      const created = await ctx.app.request("/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({
          name: "Echo once",
          kind: "echo",
          enabled: false,
          interval_ms: 5000,
          config: JSON.stringify({ message: "lab" }),
        }),
      });
      expect(created.status).toBe(201);
      const job = (await created.json()) as { id: string; kind: string };
      expect(job.kind).toBe("echo");

      const runDenied = await ctx.app.request(`/jobs/${job.id}/run`, {
        method: "POST",
        headers: authHeaders("readonly"),
      });
      expect(runDenied.status).toBe(403);

      const ran = await ctx.app.request(`/jobs/${job.id}/run`, {
        method: "POST",
        headers: authHeaders("admin"),
      });
      expect(ran.status).toBe(200);

      const runs = await ctx.app.request(`/jobs/${job.id}/runs`, {
        headers: authHeaders("readonly"),
      });
      expect(runs.status).toBe(200);
      const body = (await runs.json()) as {
        runs: Array<{ status: string }>;
      };
      expect(body.runs.length).toBeGreaterThanOrEqual(1);
      expect(body.runs[0]?.status).toBe("ok");

      const logs = await ctx.app.request("/logs?source=job", {
        headers: authHeaders("readonly"),
      });
      expect(logs.status).toBe(200);
      const logBody = (await logs.json()) as {
        events: Array<{ source: string }>;
      };
      expect(logBody.events.some((e) => e.source === "job")).toBe(true);
    } finally {
      ctx.stop();
      await ctx.jord.close();
    }
  });
});
