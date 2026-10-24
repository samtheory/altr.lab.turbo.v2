import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Local blob object metadata (Studio S10). Bytes live under data/blobs/. */
export const jordBlobs = sqliteTable(
  "jord_blobs",
  {
    id: text("id").primaryKey(),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size", { mode: "number" }).notNull(),
    etag: text("etag").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("jord_blobs_bucket_key_uidx").on(t.bucket, t.key),
    index("jord_blobs_bucket_key_idx").on(t.bucket, t.key),
  ],
);

export type JordBlobRow = typeof jordBlobs.$inferSelect;
export type NewJordBlobRow = typeof jordBlobs.$inferInsert;
