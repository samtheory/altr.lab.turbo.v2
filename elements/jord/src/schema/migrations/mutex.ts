const chains = new Map<string, Promise<void>>();

/**
 * In-process runner mutex. The next waiter is registered synchronously so two
 * overlapping calls cannot both pass the "not applied" check.
 */
export function withRunnerMutex<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  chains.set(key, gate);
  const run = previous.then(fn, fn);
  void run.then(
    () => {
      release();
      if (chains.get(key) === gate) chains.delete(key);
    },
    () => {
      release();
      if (chains.get(key) === gate) chains.delete(key);
    },
  );
  return run;
}
