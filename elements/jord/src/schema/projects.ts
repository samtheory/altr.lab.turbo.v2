import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Control-plane project registry (S0042). Not the project target database. */
export const jordProjects = sqliteTable(
  "jord_projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    engine: text("engine").notNull(),
    target: text("target").notNull(),
    tlsMode: text("tls_mode"),
    dbUser: text("db_user"),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    archivedAt: integer("archived_at", { mode: "number" }),
  },
  (t) => [
    uniqueIndex("jord_projects_slug_uidx").on(t.slug),
    index("jord_projects_status_idx").on(t.status),
  ],
);

/** Hashed publishable / secret / barrier keys per project (S0042). */
export const jordProjectKeys = sqliteTable(
  "jord_project_keys",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    kind: text("kind").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(),
    last4: text("last4").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    rotatedAt: integer("rotated_at", { mode: "number" }),
  },
  (t) => [
    index("jord_project_keys_project_idx").on(t.projectId),
    uniqueIndex("jord_project_keys_project_kind_uidx").on(t.projectId, t.kind),
  ],
);

export type JordProjectRow = typeof jordProjects.$inferSelect;
export type NewJordProjectRow = typeof jordProjects.$inferInsert;
export type JordProjectKeyRow = typeof jordProjectKeys.$inferSelect;
export type NewJordProjectKeyRow = typeof jordProjectKeys.$inferInsert;

export type JordProjectEngine = "libsql-file" | "libsql-turso" | "postgres";
export type JordProjectKeyKind = "publishable" | "secret" | "barrier";
export type JordProjectStatus = "active" | "archived";
