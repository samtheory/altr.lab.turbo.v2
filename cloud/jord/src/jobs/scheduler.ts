import type { JordDriverPort, JordJob } from "@altr/jord";

import type { WriteQueue } from "../queue.js";
import { getJobKindHandler } from "./kinds.js";
import type { LogRing } from "./log-ring.js";

export const MIN_JOB_INTERVAL_MS = 1000;
export const DEFAULT_SCHEDULER_TICK_MS = 1000;

export type JobScheduler = {
  stop: () => void;
  /** Run a job immediately (admin run-now). */
  runNow: (jobId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** True while a job handler is executing. */
  isBusy: () => boolean;
};

export type JobSchedulerDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  logs: LogRing;
  tickMs?: number;
  /** Skip starting the interval (tests can call runNow / tick manually). */
  autostart?: boolean;
};

async function executeJob(
  deps: JobSchedulerDeps,
  job: JordJob,
): Promise<void> {
  const handler = getJobKindHandler(job.kind);
  const run = await deps.enqueueWrite(() =>
    deps.jord.insertJobRun({ jobId: job.id }),
  );

  deps.logs.append({
    level: "info",
    source: "job",
    message: `job start ${job.name} (${job.kind})`,
    meta: { jobId: job.id, runId: run.id, kind: job.kind },
  });

  if (!handler) {
    const err = `unknown job kind: ${job.kind}`;
    await deps.enqueueWrite(async () => {
      await deps.jord.finishJobRun({
        id: run.id,
        status: "error",
        error: err,
      });
      await deps.jord.updateJob({
        id: job.id,
        lastRunAt: Date.now(),
        lastStatus: "error",
        lastError: err,
        nextRunAt: Date.now() + Math.max(job.intervalMs, MIN_JOB_INTERVAL_MS),
      });
    });
    deps.logs.append({
      level: "error",
      source: "job",
      message: `job error ${job.name}: ${err}`,
      meta: { jobId: job.id, runId: run.id },
    });
    return;
  }

  try {
    const outcome = await handler({ jord: deps.jord, job });
    const resultJson = outcome?.result
      ? JSON.stringify(outcome.result)
      : null;
    const now = Date.now();
    await deps.enqueueWrite(async () => {
      await deps.jord.finishJobRun({
        id: run.id,
        status: "ok",
        result: resultJson,
        finishedAt: now,
      });
      await deps.jord.updateJob({
        id: job.id,
        lastRunAt: now,
        lastStatus: "ok",
        lastError: null,
        nextRunAt: now + Math.max(job.intervalMs, MIN_JOB_INTERVAL_MS),
      });
    });
    deps.logs.append({
      level: "info",
      source: "job",
      message: `job ok ${job.name}`,
      meta: { jobId: job.id, runId: run.id },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const now = Date.now();
    await deps.enqueueWrite(async () => {
      await deps.jord.finishJobRun({
        id: run.id,
        status: "error",
        error: message,
        finishedAt: now,
      });
      await deps.jord.updateJob({
        id: job.id,
        lastRunAt: now,
        lastStatus: "error",
        lastError: message,
        nextRunAt: now + Math.max(job.intervalMs, MIN_JOB_INTERVAL_MS),
      });
    });
    deps.logs.append({
      level: "error",
      source: "job",
      message: `job error ${job.name}: ${message}`,
      meta: { jobId: job.id, runId: run.id },
    });
  }
}

export function startJobScheduler(deps: JobSchedulerDeps): JobScheduler {
  let busy = false;
  let stopped = false;
  const tickMs = deps.tickMs ?? DEFAULT_SCHEDULER_TICK_MS;

  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const due = await deps.jord.listDueJobs(Date.now());
      for (const job of due) {
        if (stopped) break;
        await executeJob(deps, job);
      }
    } catch (err) {
      console.error("[@altr/jord-server] job scheduler tick failed", err);
      deps.logs.append({
        level: "error",
        source: "system",
        message: `scheduler tick failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      busy = false;
    }
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  if (deps.autostart !== false) {
    timer = setInterval(() => {
      void tick();
    }, tickMs);
    if (typeof timer.unref === "function") timer.unref();
  }

  return {
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
    isBusy() {
      return busy;
    },
    async runNow(jobId) {
      const job = await deps.jord.getJob(jobId);
      if (!job) return { ok: false, error: "job_not_found" };
      if (busy) return { ok: false, error: "scheduler_busy" };
      busy = true;
      try {
        await executeJob(deps, job);
        return { ok: true };
      } finally {
        busy = false;
      }
    },
  };
}

/** Seed a disabled wal_checkpoint job when the table is empty. */
export async function seedDefaultJobs(jord: JordDriverPort): Promise<void> {
  const existing = await jord.listJobs();
  if (existing.length > 0) return;
  await jord.insertJob({
    name: "WAL checkpoint",
    kind: "wal_checkpoint",
    enabled: false,
    intervalMs: 5 * 60_000,
    config: "{}",
  });
}
