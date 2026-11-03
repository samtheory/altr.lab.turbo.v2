import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Blob object metadata. Bytes live under the storage adapter (local or S3). */
export const jordBlobs = sqliteTable(
  "jord_blobs",
  {
    id: text("id").primaryKey(),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size", { mode: "number" }).notNull(),
    etag: text("etag").notNull(),
    status: text("status").notNull().default("ready"),
    pendingExpiresAt: integer("pending_expires_at", { mode: "number" }),
    uploadId: text("upload_id"),
    derivedFrom: text("derived_from"),
    derivedSrcEtag: text("derived_src_etag"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("jord_blobs_bucket_key_uidx").on(t.bucket, t.key),
    index("jord_blobs_bucket_key_idx").on(t.bucket, t.key),
    index("jord_blobs_pending_expires_idx").on(t.status, t.pendingExpiresAt),
  ],
);

export type JordBlobRow = typeof jordBlobs.$inferSelect;
export type NewJordBlobRow = typeof jordBlobs.$inferInsert;
