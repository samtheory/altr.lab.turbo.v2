import type { WriteQueue } from "../queue.js";
import { setWriteQueueDepthProvider } from "./metrics.js";
import { withWriteSpan } from "./spans.js";

/**
 * Wrap a write queue so each job gets a `jord.write` span (kind + wait ms)
 * and the queue depth gauge can observe `pending()`.
 */
export function instrumentWriteQueue(
  queue: WriteQueue,
  defaultKind = "write",
): WriteQueue {
  setWriteQueueDepthProvider(() => queue.pending());

  function enqueue<T>(fn: () => Promise<T>, kind?: string): Promise<T> {
    const enqueuedAt = Date.now();
    const jobKind = kind?.trim() || defaultKind;
    return queue(async () => {
      const waitMs = Math.max(0, Date.now() - enqueuedAt);
      return withWriteSpan({ kind: jobKind, waitMs }, fn);
    });
  }

  return Object.assign(enqueue, {
    drain: () => queue.drain(),
    pending: () => queue.pending(),
    inFlight: () => queue.inFlight(),
  });
}
