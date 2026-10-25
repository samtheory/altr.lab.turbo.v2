import { randomUUID } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

import {
  DEFAULT_LOG_RING_CAPACITY,
  type LogEvent,
  type LogLevel,
  type LogSource,
} from "../jobs/log-ring.js";
import { redactMeta, redactSecrets } from "./redact.js";

type Pending = Omit<LogEvent, "id" | "at"> & { at?: number; id?: string };

/**
 * Ring for immediate reads + buffered inserts that skip the hot write queue.
 * Reading `/logs` must not append (the route already returns early).
 */
export class LogBatcher {
  private readonly capacity: number;
  private readonly events: LogEvent[] = [];
  private buffer: LogEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(
    private readonly jord: JordDriverPort | null,
    capacity = DEFAULT_LOG_RING_CAPACITY,
    private readonly flushMs = 250,
  ) {
    this.capacity = Math.max(10, capacity);
  }

  start(): void {
    if (!this.jord || this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushMs);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
  }

  append(input: Pending): LogEvent {
    const event: LogEvent = {
      id: input.id ?? randomUUID(),
      at: input.at ?? Date.now(),
      level: input.level,
      source: input.source,
      message: redactSecrets(input.message).slice(0, 500),
      meta: redactMeta(input.meta),
    };
    this.events.push(event);
    while (this.events.length > this.capacity) this.events.shift();
    this.buffer.push(event);
    return event;
  }

  /** Newest first — sync ring (and recently flushed rows stay here). */
  list(limit = 100, source?: LogSource): LogEvent[] {
    const capped = Math.max(1, Math.min(limit, this.capacity));
    const filtered = source
      ? this.events.filter((e) => e.source === source)
      : this.events;
    return filtered.slice(-capped).reverse();
  }

  async flush(): Promise<void> {
    if (!this.jord || this.flushing || this.buffer.length === 0) return;
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      for (const event of batch) {
        await this.jord.query(
          this.jord.dialect === "postgres"
            ? `INSERT INTO jord_logs (id, at, level, source, message, meta_json) VALUES ($1, $2, $3, $4, $5, $6)`
            : `INSERT INTO jord_logs (id, at, level, source, message, meta_json) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            event.id,
            event.at,
            event.level,
            event.source,
            event.message,
            event.meta ? JSON.stringify(event.meta) : null,
          ],
        );
      }
    } catch {
      this.buffer.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }
}

export type { LogEvent, LogLevel, LogSource };
