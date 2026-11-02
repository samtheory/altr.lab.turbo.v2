import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Bucket registry (S0066). Bytes stay behind JordStoragePort; this row owns provider + limits. */
export const jordBuckets = sqliteTable(
  "jord_buckets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    endpoint: text("endpoint"),
    region: text("region"),
    physicalBucket: text("physical_bucket"),
    keyPrefix: text("key_prefix"),
    forcePathStyle: integer("force_path_style", { mode: "number" })
      .notNull()
      .default(0),
    /** Sealed by SecretPort in S0067; unused on env-backed rows. */
    accessKeySealed: text("access_key_sealed"),
    secretKeySealed: text("secret_key_sealed"),
    sessionTokenSealed: text("session_token_sealed"),
    publicRead: integer("public_read", { mode: "number" }).notNull().default(0),
    maxObjectBytes: integer("max_object_bytes", { mode: "number" }),
    /** JSON string array of allowed MIME types; null/empty = allow all. */
    allowedMimeTypes: text("allowed_mime_types"),
    signTtlSeconds: integer("sign_ttl_seconds", { mode: "number" }),
    status: text("status").notNull().default("active"),
    linkedTable: text("linked_table"),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    lastWriteAt: integer("last_write_at", { mode: "number" }),
  },
  (t) => [
    uniqueIndex("jord_buckets_name_uidx").on(t.name),
    index("jord_buckets_status_idx").on(t.status),
  ],
);

export type JordBucketRow = typeof jordBuckets.$inferSelect;
export type NewJordBucketRow = typeof jordBuckets.$inferInsert;

export const JORD_BUCKET_PROVIDERS = [
  "local",
  "s3",
  "r2",
  "minio",
  "s3-compatible",
] as const;
export type JordBucketProvider = (typeof JORD_BUCKET_PROVIDERS)[number];

export const JORD_BUCKET_STATUSES = ["active", "paused"] as const;
export type JordBucketStatus = (typeof JORD_BUCKET_STATUSES)[number];
