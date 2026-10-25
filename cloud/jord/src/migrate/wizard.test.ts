import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { getMigrateJob, runMigrateJob, startMigrateJob } from "./wizard.js";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
};

const open: TestDb[] = [];
afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

async function boot() {
  const db = await openTestDb("file");
  open.push(db);
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
  });
  return { app, db };
}

async function sourcePath(db: TestDb): Promise<string> {
  const rows = await db.jord.query(`PRAGMA database_list`);
  return String(rows.find((r) => r.name === "main")!.file);
}

describe("migrate target must not be the source (SF-5)", () => {
  it("rejects every spelling of the source path with 400 and clears nothing", async () => {
    const { app, db } = await boot();
    await db.jord.query(
      "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('keep','lab','{}',1,1,1)",
    );
    const src = await sourcePath(db);
    const forms = [
      fsPathToFileUrl(src),
      `file:${src}`,
      `${fsPathToFileUrl(src)}?mode=rwc`,
      fsPathToFileUrl(src.toUpperCase()),
      fsPathToFileUrl(path.join(path.dirname(src), ".", path.basename(src))),
      fsPathToFileUrl(path.join(path.dirname(src), "sub", "..", path.basename(src))),
    ].filter((form, i) => i !== 3 || process.platform === "win32");

    for (const targetUrl of forms) {
      const res = await app.request("/migrate/jobs", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ targetUrl }),
      });
      expect(res.status, targetUrl).toBe(400);
    }
    const left = await db.jord.query("SELECT id FROM records WHERE id = 'keep'");
    expect(left).toHaveLength(1);
    const jobs = await db.jord.query("SELECT id FROM jord_migrate_jobs");
    expect(jobs).toHaveLength(0);
  });

  it("still accepts a different file target", async () => {
    const { app } = await boot();
    const dir = await mkdtemp(path.join(tmpdir(), "jord-b10-"));
    try {
      const res = await app.request("/migrate/jobs", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ targetUrl: fsPathToFileUrl(path.join(dir, "t.db")) }),
      });
      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});

describe("migrate job setup failure (SF-4)", () => {
  it("ends the job in error status instead of throwing", async () => {
    const { db } = await boot();
    const job = await startMigrateJob({
      source: db.jord,
      targetUrl: "file:./never-used.db",
    });
    // Simulate the in-memory target having expired: run a second time after
    // the first run consumed it.
    await runMigrateJob({ source: db.jord, jobId: job.id }).catch(() => undefined);
    const again = await runMigrateJob({ source: db.jord, jobId: job.id });
    expect(again.status).toBe("error");
    expect(again.errorText).toBe("migrate_target_expired");
    expect((await getMigrateJob(db.jord, job.id))?.status).toBe("error");
  });

  it("the route call site swallows and logs a rejected run", async () => {
    const { app, db } = await boot();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dir = await mkdtemp(path.join(tmpdir(), "jord-b10-"));
    try {
      // First SELECT is startMigrateJob's persist; the 2nd is runMigrateJob's
      // getMigrateJob (outside its try) -> run rejects after the 201.
      const realQuery = db.jord.query.bind(db.jord);
      let selects = 0;
      vi.spyOn(db.jord, "query").mockImplementation(async (sql, args) => {
        if (/SELECT \* FROM jord_migrate_jobs/.test(sql) && ++selects >= 2) {
          throw new Error("persist down");
        }
        return realQuery(sql, args);
      });
      const res = await app.request("/migrate/jobs", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ targetUrl: fsPathToFileUrl(path.join(dir, "t.db")) }),
      });
      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 300));
      await new Promise((r) => setImmediate(r));
      expect(err.mock.calls.some((c) => String(c[0]).includes("migrate job failed"))).toBe(true);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
      err.mockRestore();
      vi.restoreAllMocks();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
