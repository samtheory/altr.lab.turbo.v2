import type { LogEvent } from "../jobs/log-ring.js";

export type LogSink = {
  append: (
    input: Omit<LogEvent, "id" | "at"> & { at?: number; id?: string },
  ) => LogEvent;
  list: (limit?: number, source?: LogEvent["source"]) => LogEvent[];
};
