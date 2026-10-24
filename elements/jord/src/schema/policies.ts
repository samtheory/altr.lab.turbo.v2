import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Table access policies (Studio S7). Rules JSON: `{ kind, config }[]`. */
export const jordPolicies = sqliteTable(
  "jord_policies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tableName: text("table_name").notNull(),
    operation: text("operation").notNull(),
    effect: text("effect").notNull(),
    rules: text("rules").notNull().default("[]"),
    priority: integer("priority").notNull().default(0),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("jord_policies_table_op_priority_idx").on(
      t.tableName,
      t.operation,
      t.priority,
    ),
  ],
);

export type JordPolicyRow = typeof jordPolicies.$inferSelect;
export type NewJordPolicyRow = typeof jordPolicies.$inferInsert;
