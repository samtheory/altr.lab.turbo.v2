import {
  MAX_REALTIME_SUBSCRIBERS,
  type JordChangeEvent,
} from "./types.js";

export type RealtimeListener = (event: JordChangeEvent) => void;

export type RealtimeSubscribeFilter = {
  table: string;
  id?: string | null;
};

/**
 * In-process fanout for one jord-server process. No Redis.
 * Listener throws are swallowed so a bad subscriber cannot roll back a write.
 */
export class RealtimeBus {
  private readonly listeners = new Set<RealtimeListener>();

  get size(): number {
    return this.listeners.size;
  }

  /**
   * @returns unsubscribe, or null when the subscriber cap is reached.
   */
  trySubscribe(listener: RealtimeListener): (() => void) | null {
    if (this.listeners.size >= MAX_REALTIME_SUBSCRIBERS) return null;
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe with table / optional id filter applied before the listener runs.
   */
  trySubscribeFiltered(
    filter: RealtimeSubscribeFilter,
    listener: RealtimeListener,
  ): (() => void) | null {
    return this.trySubscribe((event) => {
      if (event.table !== filter.table) return;
      if (filter.id && event.id !== filter.id) return;
      listener(event);
    });
  }

  publish(event: JordChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[@altr/jord-server] realtime listener failed", err);
      }
    }
  }
}
