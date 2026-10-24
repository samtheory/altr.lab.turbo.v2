import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** AFTER write triggers (Studio S7). Actions JSON: `{ kind, config }[]`. */
export const jordTriggers = sqliteTable(
  "jord_triggers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tableName: text("table_name").notNull(),
    timing: text("timing").notNull().default("after"),
    event: text("event").notNull(),
    actions: text("actions").notNull().default("[]"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("jord_triggers_table_event_idx").on(t.tableName, t.event),
  ],
);

export type JordTriggerRow = typeof jordTriggers.$inferSelect;
export type NewJordTriggerRow = typeof jordTriggers.$inferInsert;
