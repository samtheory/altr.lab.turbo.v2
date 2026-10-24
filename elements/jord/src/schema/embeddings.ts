import { blob, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Embedding rows for searchVectors (Studio S11). Bytes = Float32 LE. */
export const jordEmbeddings = sqliteTable(
  "jord_embeddings",
  {
    id: text("id").primaryKey(),
    namespace: text("namespace").notNull(),
    refId: text("ref_id"),
    dims: integer("dims", { mode: "number" }).notNull(),
    embedding: blob("embedding", { mode: "buffer" }).notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("jord_embeddings_namespace_updated_idx").on(t.namespace, t.updatedAt)],
);

export type JordEmbeddingRow = typeof jordEmbeddings.$inferSelect;
export type NewJordEmbeddingRow = typeof jordEmbeddings.$inferInsert;
