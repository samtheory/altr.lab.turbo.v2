import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Multi-step function definitions (Studio S6). */
export const jordFunctions = sqliteTable(
  "jord_functions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    steps: text("steps").notNull().default("[]"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("jord_functions_slug_uidx").on(t.slug)],
);

/** Named HTTP bindings → function (Studio S6). */
export const jordCustomApis = sqliteTable(
  "jord_custom_apis",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    method: text("method").notNull(),
    slug: text("slug").notNull(),
    functionId: text("function_id").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("jord_custom_apis_method_slug_uidx").on(t.method, t.slug),
    index("jord_custom_apis_function_id_idx").on(t.functionId),
  ],
);

export type JordFunctionRow = typeof jordFunctions.$inferSelect;
export type NewJordFunctionRow = typeof jordFunctions.$inferInsert;
export type JordCustomApiRow = typeof jordCustomApis.$inferSelect;
export type NewJordCustomApiRow = typeof jordCustomApis.$inferInsert;
