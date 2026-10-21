import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Scheduled job definitions (Studio S5). */
export const jordJobs = sqliteTable(
  "jord_jobs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    intervalMs: integer("interval_ms", { mode: "number" }).notNull(),
    config: text("config").notNull().default("{}"),
    nextRunAt: integer("next_run_at", { mode: "number" }),
    lastRunAt: integer("last_run_at", { mode: "number" }),
    lastStatus: text("last_status"),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("jord_jobs_enabled_next_run_idx").on(t.enabled, t.nextRunAt)],
);

/** Job execution history. */
export const jordJobRuns = sqliteTable(
  "jord_job_runs",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull(),
    status: text("status").notNull(),
    startedAt: integer("started_at", { mode: "number" }).notNull(),
    finishedAt: integer("finished_at", { mode: "number" }),
    error: text("error"),
    result: text("result"),
  },
  (t) => [index("jord_job_runs_job_started_idx").on(t.jobId, t.startedAt)],
);

export type JordJobRow = typeof jordJobs.$inferSelect;
export type NewJordJobRow = typeof jordJobs.$inferInsert;
export type JordJobRunRow = typeof jordJobRuns.$inferSelect;
export type NewJordJobRunRow = typeof jordJobRuns.$inferInsert;
