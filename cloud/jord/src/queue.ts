/**
 * Single in-process serial write queue. Hot mutations (POST/PATCH) enqueue
 * here so two HTTP requests never write the libSQL file concurrently.
 */
export type WriteQueue = (<T>(fn: () => Promise<T>) => Promise<T>) & {
  drain: () => Promise<void>;
  pending: () => number;
};

/** @deprecated Use WriteQueue directly — createWriteQueue returns a callable queue. */
export type WriteQueueHandle = WriteQueue;

export function asEnqueue(q: WriteQueue | { enqueue: WriteQueue }): WriteQueue {
  return typeof q === "function" ? q : q.enqueue;
}

export function createWriteQueue(): WriteQueue {
  let tail: Promise<unknown> = Promise.resolve();
  let pendingCount = 0;

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    pendingCount++;
    const run = tail.then(fn, fn).finally(() => {
      pendingCount--;
    });
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return Object.assign(enqueue, {
    drain: (): Promise<void> => tail.then(() => undefined),
    pending: (): number => pendingCount,
  });
}
