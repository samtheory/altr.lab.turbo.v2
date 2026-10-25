import { afterEach, describe, expect, it } from "vitest";

import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestDb } from "../testing/harness.js";
import { startJobScheduler } from "./scheduler.js";

const open: TestDb[] = [];

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

describe.each(TEST_BACKENDS)("job scheduler (%s)", (backend) => {
  it("a job run outside any request still sees RLS-protected rows", async () => {
    const db = await openTestDb(backend);
    open.push(db);
    const { jord } = db;
    const now = Date.now();
    for (const id of ["j1", "j2"]) {
      await db.ddl.query(
        `INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
         VALUES (${db.ph(1)}, 'jobs', '{}', NULL, ${db.ph(2)}, ${db.ph(3)}, 1)`,
        [id, now, now],
      );
    }
    await db.ddl.setTableRls({ tableName: "records", rlsEnabled: true, ownerColumn: null });
    await db.ddl.insertPolicy({
      name: "users read lab",
      tableName: "records",
      operation: "select",
      effect: "allow",
      priority: 0,
      rules: JSON.stringify([{ kind: "role_in", config: { roles: ["user"] } }]),
    });
    await db.ddl.syncRecordsPoliciesRls?.();
    const job = await jord.insertJob({
      name: "count jobs bucket",
      kind: "records_count",
      intervalMs: 60_000,
      config: JSON.stringify({ bucket: "jobs" }),
    });
    const scheduler = startJobScheduler({
      jord,
      enqueueWrite: createWriteQueue(),
      logs: { append: (event) => ({ id: "x", at: Date.now(), ...event }) },
      autostart: false,
    });
    try {
      expect(await scheduler.runNow(job.id)).toEqual({ ok: true });
    } finally {
      scheduler.stop();
    }
    const runs = await jord.listJobRuns(job.id);
    expect(runs[0]?.status).toBe("ok");
    expect(JSON.parse(runs[0]!.result!)).toEqual({ bucket: "jobs", count: 2 });
  });
});
