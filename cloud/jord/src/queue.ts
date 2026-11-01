/**
 * In-process write queue. libSQL stays serial (concurrency 1). Postgres may
 * run up to `JORD_PG_WRITE_CONCURRENCY` jobs at once (default 1, max 8).
 */

export const PG_WRITE_CONCURRENCY_MIN = 1;
export const PG_WRITE_CONCURRENCY_MAX = 8;
export const DEFAULT_PG_WRITE_CONCURRENCY = 1;

export type WriteQueue = {
  /** Optional `kind` is used by OTel `jord.write` spans (S0039). */
  <T>(fn: () => Promise<T>, kind?: string): Promise<T>;
  drain: () => Promise<void>;
  /** Waiting + in-flight jobs. */
  pending: () => number;
  /** Currently executing jobs. */
  inFlight: () => number;
};

/** @deprecated Use WriteQueue directly — createWriteQueue returns a callable queue. */
export type WriteQueueHandle = WriteQueue;

export type CreateWriteQueueOptions = {
  /** Max concurrent jobs. Clamped callers should pass 1…8; default 1. */
  concurrency?: number;
};

export function asEnqueue(q: WriteQueue | { enqueue: WriteQueue }): WriteQueue {
  return typeof q === "function" ? q : q.enqueue;
}

type QueueJob = {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

let libsqlConcurrencyWarned = false;

/** Test-only: reset the one-shot libSQL concurrency warning. */
export function resetLibsqlWriteConcurrencyWarningForTests(): void {
  libsqlConcurrencyWarned = false;
}

/**
 * Resolve write-queue width from env.
 * - Postgres: integer `1…8`, default `1`; out-of-range / non-integer → throw.
 * - libSQL: always `1`; warn once if env asks for anything else.
 */
export function resolveWriteConcurrency(
  env: NodeJS.ProcessEnv = process.env,
  dialect: "postgres" | "libsql" = "libsql",
): number {
  const raw = env.JORD_PG_WRITE_CONCURRENCY?.trim();

  if (dialect !== "postgres") {
    if (
      raw !== undefined &&
      raw !== "" &&
      raw !== String(DEFAULT_PG_WRITE_CONCURRENCY)
    ) {
      if (!libsqlConcurrencyWarned) {
        libsqlConcurrencyWarned = true;
        console.warn(
          "[@altr/jord-server] JORD_PG_WRITE_CONCURRENCY is ignored for libSQL (writes stay serial)",
        );
      }
    }
    return DEFAULT_PG_WRITE_CONCURRENCY;
  }

  if (raw === undefined || raw === "") {
    return DEFAULT_PG_WRITE_CONCURRENCY;
  }

  const n = Number(raw);
  if (
    !Number.isInteger(n) ||
    n < PG_WRITE_CONCURRENCY_MIN ||
    n > PG_WRITE_CONCURRENCY_MAX
  ) {
    throw new Error(
      `JORD_PG_WRITE_CONCURRENCY must be an integer from ${PG_WRITE_CONCURRENCY_MIN} to ${PG_WRITE_CONCURRENCY_MAX} (got ${JSON.stringify(raw)})`,
    );
  }
  return n;
}

export function createWriteQueue(
  options: CreateWriteQueueOptions = {},
): WriteQueue {
  const concurrency = Math.max(
    1,
    Math.floor(options.concurrency ?? DEFAULT_PG_WRITE_CONCURRENCY),
  );
  const waiting: QueueJob[] = [];
  let inFlightCount = 0;
  let pendingCount = 0;
  const drainWaiters: Array<() => void> = [];

  function notifyDrain(): void {
    if (pendingCount !== 0) return;
    while (drainWaiters.length > 0) {
      drainWaiters.shift()?.();
    }
  }

  function pump(): void {
    while (inFlightCount < concurrency && waiting.length > 0) {
      const job = waiting.shift()!;
      inFlightCount++;
      void Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => {
          inFlightCount--;
          pendingCount--;
          notifyDrain();
          pump();
        });
    }
  }

  function enqueue<T>(fn: () => Promise<T>, _kind?: string): Promise<T> {
    pendingCount++;
    return new Promise<T>((resolve, reject) => {
      waiting.push({
        fn,
        resolve: (value) => resolve(value as T),
        reject,
      });
      pump();
    });
  }

  return Object.assign(enqueue, {
    drain: (): Promise<void> => {
      if (pendingCount === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        drainWaiters.push(resolve);
      });
    },
    pending: (): number => pendingCount,
    inFlight: (): number => inFlightCount,
  });
}
