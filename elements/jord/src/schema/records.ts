import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { jordBlobs } from "./blobs.js";
import { jordCustomApis, jordFunctions } from "./functions.js";
import { jordJobRuns, jordJobs } from "./jobs.js";
import { jordPolicies } from "./policies.js";
import { jordTriggers } from "./triggers.js";

/**
 * Generic JSON scratchpad. Not for typed trading entities.
 * Timestamps: 64-bit-safe integer ms via `mode: "number"`.
 */
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    bucket: text("bucket").notNull(),
    body: text("body").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("records_bucket_created_at_idx").on(t.bucket, t.createdAt),
  ],
);

export type RecordRow = typeof records.$inferSelect;
export type NewRecordRow = typeof records.$inferInsert;

export const schema = {
  records,
  jordJobs,
  jordJobRuns,
  jordFunctions,
  jordCustomApis,
  jordPolicies,
  jordTriggers,
  jordBlobs,
};
