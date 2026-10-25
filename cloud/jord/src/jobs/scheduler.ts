import type { JordDriverPort, JordJob } from "@altr/jord";

import type { WriteQueue } from "../queue.js";
import { getJobKindHandler } from "./kinds.js";
import type { LogEvent, LogRing } from "./log-ring.js";

export const MIN_JOB_INTERVAL_MS = 1000;
export const DEFAULT_SCHEDULER_TICK_MS = 1000;

export type JobScheduler = {
  stop: () => void;
  /** Run a job immediately (admin run-now). */
  runNow: (jobId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** True while a job handler is executing. */
  isBusy: () => boolean;
};

type LogSink = Pick<LogRing, "append"> | {
  append: (input: Omit<LogEvent, "id" | "at"> & { at?: number; id?: string }) => LogEvent;
};

export type JobSchedulerDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  logs: LogSink;
  tickMs?: number;
  /** Skip starting the interval (tests can call runNow / tick manually). */
  autostart?: boolean;
};

async function executeJob(
  deps: JobSchedulerDeps,
  job: JordJob,
): Promise<void> {
  // Jobs are admin-authored; on Postgres a run with no session sees no FORCE RLS rows.
  deps.jord.bindRlsSession?.({ role: "admin" });
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

/** Seed default jobs when missing (wal checkpoint + outbox prune). */
export async function seedDefaultJobs(jord: JordDriverPort): Promise<void> {
  const existing = await jord.listJobs();
  const kinds = new Set(existing.map((job) => job.kind));
  if (!kinds.has("wal_checkpoint") && existing.length === 0) {
    await jord.insertJob({
      name: "WAL checkpoint",
      kind: "wal_checkpoint",
      enabled: false,
      intervalMs: 5 * 60_000,
      config: "{}",
    });
  }
  const refreshed = await jord.listJobs();
  if (!refreshed.some((job) => job.kind === "changes_prune")) {
    await jord.insertJob({
      name: "Outbox prune",
      kind: "changes_prune",
      enabled: true,
      intervalMs: 60 * 60_000,
      config: "{}",
    });
  }
  const afterPrune = await jord.listJobs();
  if (!afterPrune.some((job) => job.kind === "blobs_gc")) {
    await jord.insertJob({
      name: "Blob pending GC",
      kind: "blobs_gc",
      enabled: true,
      intervalMs: 15 * 60_000,
      config: "{}",
    });
  }
}
