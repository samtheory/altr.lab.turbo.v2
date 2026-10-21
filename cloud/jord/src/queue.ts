/**
 * Single in-process serial write queue. Hot mutations (POST/PATCH) enqueue
 * here so two HTTP requests never write the libSQL file concurrently.
 */
export type WriteQueue = <T>(fn: () => Promise<T>) => Promise<T>;

export function createWriteQueue(): WriteQueue {
  let tail: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
