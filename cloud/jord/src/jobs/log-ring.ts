import { randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";
export type LogSource = "http" | "job" | "system" | "trigger";

export type LogEvent = {
  id: string;
  at: number;
  level: LogLevel;
  source: LogSource;
  message: string;
  meta?: Record<string, unknown>;
};

export const DEFAULT_LOG_RING_CAPACITY = 500;

export class LogRing {
  private readonly capacity: number;
  private readonly events: LogEvent[] = [];

  constructor(capacity = DEFAULT_LOG_RING_CAPACITY) {
    this.capacity = Math.max(10, capacity);
  }

  append(
    input: Omit<LogEvent, "id" | "at"> & { at?: number; id?: string },
  ): LogEvent {
    const event: LogEvent = {
      id: input.id ?? randomUUID(),
      at: input.at ?? Date.now(),
      level: input.level,
      source: input.source,
      message: input.message.slice(0, 500),
      meta: input.meta,
    };
    this.events.push(event);
    while (this.events.length > this.capacity) {
      this.events.shift();
    }
    return event;
  }

  /** Newest first. */
  list(limit = 100, source?: LogSource): LogEvent[] {
    const capped = Math.max(1, Math.min(limit, this.capacity));
    const filtered = source
      ? this.events.filter((e) => e.source === source)
      : this.events;
    return filtered.slice(-capped).reverse();
  }
}
