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
  const dir = await makeTempDir("jord-jobs-");
  temps.push(dir);
  return createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
}

describe("jord jobs schema", () => {
  it("inserts job, lists due, records run finish", async () => {
    const jord = await openTemp();
    try {
      const job = await jord.insertJob({
        name: "Echo lab",
        kind: "echo",
        enabled: true,
        intervalMs: 60_000,
        config: JSON.stringify({ message: "hi" }),
      });
      expect(job.kind).toBe("echo");
      expect(job.enabled).toBe(true);

      const due = await jord.listDueJobs(Date.now() + 1);
      expect(due.map((j) => j.id)).toContain(job.id);

      const run = await jord.insertJobRun({ jobId: job.id });
      expect(run.status).toBe("running");

      const finished = await jord.finishJobRun({
        id: run.id,
        status: "ok",
        result: JSON.stringify({ echoed: true }),
      });
      expect(finished?.status).toBe("ok");

      await jord.updateJob({
        id: job.id,
        lastRunAt: Date.now(),
        lastStatus: "ok",
        lastError: null,
        nextRunAt: Date.now() + 60_000,
      });

      const runs = await jord.listJobRuns(job.id);
      expect(runs).toHaveLength(1);
      expect(runs[0]?.status).toBe("ok");

      expect(await jord.deleteJob(job.id)).toBe(true);
      expect(await jord.getJob(job.id)).toBeNull();
      expect(await jord.listJobRuns(job.id)).toHaveLength(0);
    } finally {
      await jord.close();
    }
  });
});
