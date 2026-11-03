import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type { ColumnSettings } from "./schema/column-settings.js";
import type { JordColumnType } from "./schema/ddl.js";
import type {
  ForeignKeyInfo,
  ForeignKeySpec,
} from "./schema/fk.js";
import type { schema } from "./schema/records.js";
import type { JordSchemaInfo } from "./schema/schema-scope.js";
import type { LogicalColumnType } from "./schema/types/types.js";

export type { ColumnSettings } from "./schema/column-settings.js";
export type { JordColumnType } from "./schema/ddl.js";
export type {
  ColumnForeignKey,
  FkAction,
  FkCardinality,
  ForeignKeyInfo,
  ForeignKeySpec,
  ForeignKeyTarget,
} from "./schema/fk.js";
export type { JordSchemaInfo } from "./schema/schema-scope.js";
export type { LogicalColumnType } from "./schema/types/types.js";

/** Outcome of validating a `?schema=` value against the live schema list. */
export type ResolveSchemaResult =
  | { ok: true; schema: string }
  | { ok: false; error: "unknown_schema"; message: string };

/** PRAGMA table_info–shaped column (Studio schema browser). */
export type JordColumnInfo = {
  name: string;
  /** Raw SQL type from the dialect (unchanged). */
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
  /** Registry mapping (S0052); omitted only by older callers. */
  logicalType?: LogicalColumnType;
  /** Jord column settings (S0053); validation / auto-update / comment. */
  settings?: ColumnSettings;
};

export type JordTableInfo = {
  name: string;
  /** Owning schema (`public` / `main` unless another was requested). */
  schema?: string;
  columns: JordColumnInfo[];
  /** Declared foreign keys (S0055), including composite. */
  foreignKeys?: ForeignKeyInfo[];
};

export type AddColumnInput = {
  table: string;
  name: string;
  type: JordColumnType;
  /** Defaults to the adapter's default schema. */
  schema?: string;
  settings?: ColumnSettings;
  /** Required when adding NOT NULL without a default. */
  confirm?: boolean;
};

export type AddColumnResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid_identifier"
        | "invalid_type"
        | "invalid_settings"
        | "invalid_fk"
        | "fk_unsupported"
        | "confirm_required"
        | "table_not_found"
        | "column_exists"
        | "unknown_schema";
      message: string;
    };

export type CreateTableInput = {
  name: string;
  columns: Array<{
    name: string;
    type: JordColumnType;
    pk?: boolean;
    settings?: ColumnSettings;
  }>;
  /** Table-level / composite foreign keys (S0055). */
  foreignKeys?: ForeignKeySpec[];
  /** Defaults to the adapter's default schema. */
  schema?: string;
};

export type CreateTableResult =
  | { ok: true; sql: string }
  | {
      ok: false;
      error:
        | "invalid_identifier"
        | "invalid_type"
        | "invalid_settings"
        | "invalid_fk"
        | "fk_unsupported"
        | "no_columns"
        | "duplicate_column"
        | "multiple_pk"
        | "reserved"
        | "table_exists"
        | "unknown_schema";
      message: string;
    };

/** Add a table-level FK after create (Postgres). libSQL refuses with fk_unsupported. */
export type AddForeignKeyInput = {
  table: string;
  schema?: string;
  foreignKey: ForeignKeySpec;
};

export type AddForeignKeyResult =
  | { ok: true; sql: string }
  | {
      ok: false;
      error:
        | "invalid_identifier"
        | "invalid_fk"
        | "fk_unsupported"
        | "table_not_found"
        | "column_not_found"
        | "unknown_schema";
      message: string;
    };

export type TableCell = string | number | boolean | null;

/** `column = value` terms ANDed together. */
export type RowPredicate = Array<{ column: string; value: string }>;

/**
 * Row scope from matching allow policies: a row is visible when any
 * predicate matches (OR of ANDs). An empty list matches no rows.
 */
export type RowScope = { anyOf: RowPredicate[] };

export type ListTableRowsInput = {
  table: string;
  /** Defaults to the adapter's default schema. */
  schema?: string;
  limit: number;
  offset: number;
  /**
   * Restrict rows to the scope. A predicate on an unknown column matches
   * nothing (fail closed); libSQL has no database RLS to fall back on.
   */
  rowScope?: RowScope;
  /**
   * When true, also run `COUNT(*)` (same scope) and return `total`.
   * Studio paging uses this; keep off for hot paths that only need a window.
   */
  includeTotal?: boolean;
};

export type ListTableRowsResult =
  | {
      ok: true;
      columns: string[];
      rows: Array<Record<string, TableCell>>;
      limit: number;
      offset: number;
      /** Present when `includeTotal` was requested. */
      total?: number;
    }
  | {
      ok: false;
      error: "invalid_identifier" | "table_not_found" | "unknown_schema";
      message: string;
    };

export type TableRowWriteError =
  | "invalid_identifier"
  | "reserved"
  | "unknown_schema"
  | "table_not_found"
  | "no_pk"
  | "missing_pk"
  | "unknown_column"
  | "bad_value"
  | "validation"
  | "empty_patch"
  | "pk_exists"
  | "not_found"
  /** Conditional `old` values no longer match the row (HTTP 409). */
  | "conflict";

export type TableRowValues = Record<string, unknown>;

export type MutateTableRowResult =
  | { ok: true }
  | {
      ok: false;
      error: TableRowWriteError;
      message: string;
      /** Present when error is `validation` (HTTP 422). */
      field?: string;
      reason?: string;
    };

export type InsertTableRowInput = {
  table: string;
  schema?: string;
  values: TableRowValues;
};

export type UpdateTableRowInput = {
  table: string;
  schema?: string;
  pk: string;
  values: TableRowValues;
  /**
   * Optional compare-and-swap snapshot of previous column values.
   * When set, the UPDATE matches only if those columns still equal `old`
   * (null-safe). Zero matches → `conflict` (409).
   */
  old?: TableRowValues;
};

export type DeleteTableRowInput = {
  table: string;
  schema?: string;
  pk: string;
};

export type SchemaDdlError =
  | "invalid_identifier"
  | "reserved"
  | "unknown_schema"
  | "table_not_found"
  | "table_exists"
  | "column_not_found"
  | "column_exists"
  | "pk_required"
  | "pk_type_change"
  | "invalid_type"
  | "invalid_settings"
  | "confirm_required"
  | "empty_patch"
  | "type_change_failed";

export type SchemaDdlResult =
  | { ok: true }
  | { ok: false; error: SchemaDdlError; message: string };

export type DropTableInput = {
  name: string;
  schema?: string;
  /** Required — drop is destructive. */
  confirm?: boolean;
};

export type RenameTableInput = {
  name: string;
  newName: string;
  schema?: string;
};

export type DropColumnInput = {
  table: string;
  column: string;
  schema?: string;
  /** Required — drop is destructive. */
  confirm?: boolean;
};

export type AlterColumnInput = {
  table: string;
  schema?: string;
  column: string;
  name?: string;
  type?: JordColumnType;
  settings?: ColumnSettings;
  /** Required for type change or NOT NULL without default. */
  confirm?: boolean;
};

export const JORD_BLOB_STATUSES = ["pending", "ready"] as const;
export type JordBlobStatus = (typeof JORD_BLOB_STATUSES)[number];

export type JordBlob = {
  id: string;
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  etag: string;
  status: JordBlobStatus;
  pendingExpiresAt: number | null;
  uploadId: string | null;
  /** Original key when this row is a transform derivative (S0082), else null. */
  derivedFrom: string | null;
  /** Original etag the derivative was rendered from. */
  derivedSrcEtag: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpsertBlobMetaInput = {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  etag: string;
  status?: JordBlobStatus;
  pendingExpiresAt?: number | null;
  uploadId?: string | null;
  /** Set ONLY by the transform service; omitted = keep existing value. */
  derivedFrom?: string | null;
  derivedSrcEtag?: string | null;
};

/** Embedding metadata without the raw float buffer (list/search). */
export type JordEmbeddingMeta = {
  id: string;
  namespace: string;
  refId: string | null;
  dims: number;
  metadata: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpsertEmbeddingInput = {
  id: string;
  namespace: string;
  embedding: number[];
  refId?: string | null;
  metadata?: string | null;
};

export type UpsertEmbeddingResult =
  | { ok: true; row: JordEmbeddingMeta }
  | {
      ok: false;
      error: "invalid_namespace" | "invalid_embedding" | "dims_mismatch";
      message: string;
    };

export type SearchVectorsInput = {
  namespace: string;
  embedding: number[];
  limit?: number;
};

export type VectorSearchHit = {
  id: string;
  refId: string | null;
  score: number;
  metadata: string | null;
  dims: number;
};

/** Which engine ranked `searchVectors`. `cosine` is the in-process fallback. */
export type VectorBackend = "libsql-vector" | "pgvector" | "cosine";

export type SearchVectorsResult =
  | { ok: true; hits: VectorSearchHit[]; backend: VectorBackend }
  | {
      ok: false;
      error: "invalid_namespace" | "invalid_embedding" | "dims_mismatch";
      message: string;
    };

export type JordRecord = {
  id: string;
  bucket: string;
  body: string;
  metadata: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
};

export type InsertRecordInput = {
  bucket: string;
  body: string;
  metadata?: string | null;
};

export type UpdateRecordInput = {
  id: string;
  /** Caller’s expected version; must match or update conflicts. */
  version: number;
  body?: string;
  metadata?: string | null;
  bucket?: string;
};

/** Library OCC result — HTTP layer maps `conflict` to 409. */
export type UpdateRecordResult =
  | { ok: true; record: JordRecord }
  | { ok: false; conflict: true };

export type JordJobStatus = "ok" | "error";

export type JordJob = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  intervalMs: number;
  config: string;
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastStatus: JordJobStatus | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type InsertJobInput = {
  name: string;
  kind: string;
  enabled?: boolean;
  intervalMs: number;
  config?: string;
  nextRunAt?: number | null;
};

export type UpdateJobInput = {
  id: string;
  name?: string;
  kind?: string;
  enabled?: boolean;
  intervalMs?: number;
  config?: string;
  nextRunAt?: number | null;
  lastRunAt?: number | null;
  lastStatus?: JordJobStatus | null;
  lastError?: string | null;
};

export type JordJobRunStatus = "running" | "ok" | "error";

export type JordJobRun = {
  id: string;
  jobId: string;
  status: JordJobRunStatus;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  result: string | null;
};

export type InsertJobRunInput = {
  jobId: string;
  startedAt?: number;
};

export type FinishJobRunInput = {
  id: string;
  status: "ok" | "error";
  error?: string | null;
  result?: string | null;
  finishedAt?: number;
};

export type JordHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type JordFunction = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** JSON array of `{ kind, config }` steps. */
  steps: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type InsertFunctionInput = {
  name: string;
  slug: string;
  description?: string | null;
  steps?: string;
  enabled?: boolean;
};

export type UpdateFunctionInput = {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  steps?: string;
  enabled?: boolean;
};

export type DeleteFunctionResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "has_dependents"; dependents?: number };

export type JordCustomApi = {
  id: string;
  name: string;
  method: JordHttpMethod;
  slug: string;
  functionId: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type InsertCustomApiInput = {
  name: string;
  method: JordHttpMethod;
  slug: string;
  functionId: string;
  enabled?: boolean;
};

export type UpdateCustomApiInput = {
  id: string;
  name?: string;
  method?: JordHttpMethod;
  slug?: string;
  functionId?: string;
  enabled?: boolean;
};

export type JordPolicyOperation = "select" | "insert" | "update" | "delete";
export type JordPolicyEffect = "allow" | "deny";

export type JordPolicy = {
  id: string;
  name: string;
  tableName: string;
  operation: JordPolicyOperation;
  effect: JordPolicyEffect;
  /** JSON array of `{ kind, config }` rules (AND). */
  rules: string;
  priority: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type InsertPolicyInput = {
  name: string;
  tableName: string;
  operation: JordPolicyOperation;
  effect: JordPolicyEffect;
  rules?: string;
  priority?: number;
  enabled?: boolean;
};

export type UpdatePolicyInput = {
  id: string;
  name?: string;
  tableName?: string;
  operation?: JordPolicyOperation;
  effect?: JordPolicyEffect;
  rules?: string;
  priority?: number;
  enabled?: boolean;
};

export type JordTriggerTiming = "after";
export type JordTriggerEvent = "insert" | "update" | "delete";

export type JordTrigger = {
  id: string;
  name: string;
  tableName: string;
  timing: JordTriggerTiming;
  event: JordTriggerEvent;
  /** JSON array of `{ kind, config }` actions. */
  actions: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type InsertTriggerInput = {
  name: string;
  tableName: string;
  event: JordTriggerEvent;
  timing?: JordTriggerTiming;
  actions?: string;
  enabled?: boolean;
};

export type UpdateTriggerInput = {
  id: string;
  name?: string;
  tableName?: string;
  event?: JordTriggerEvent;
  timing?: JordTriggerTiming;
  actions?: string;
  enabled?: boolean;
};

export type JordDb = LibSQLDatabase<typeof schema>;

export type TableRlsFlag = {
  tableName: string;
  /** Schema of the flagged table (`jord_table_rls.schema_name`). */
  schema?: string;
  rlsEnabled: boolean;
  ownerColumn: string | null;
};

export type JordDialect = "libsql" | "postgres";

/** Safe URL scheme on the open client (no host/path). */
export type JordUrlSchemeLabel = "file" | "libsql" | "postgres";

/**
 * Dialect-agnostic surface. LibSqlAdapter (`file:` / `libsql://`) and
 * PostgresAdapter (`postgres://` / `postgresql://`) both implement this.
 */
export interface JordDriverPort {
  readonly dialect: JordDialect;
  /**
   * Connection scheme without secrets: `file` | `libsql` | `postgres`.
   * Use for WAL gating and /health — never expose the raw URL.
   */
  readonly urlScheme: JordUrlSchemeLabel;
  /**
   * Vector engine probed at open: `libsql-vector`, `pgvector`, or `cosine`.
   * A single search may still fall back to cosine; that result's `backend` says which ran.
   */
  readonly vectorBackend: VectorBackend;
  /**
   * Raw libSQL client — present when `dialect === "libsql"`.
   * Prefer port methods; only use for pragmas / dialect-specific SQL.
   */
  readonly client?: Client;
  /**
   * Drizzle over libSQL — present when `dialect === "libsql"`.
   */
  readonly db?: JordDb;

  close(): Promise<void>;
  /**
   * Parameterized control-plane SQL for server modules (auth identity).
   * Not an HTTP surface. Placeholders are dialect-native (`?` or `$1`).
   */
  query(
    sql: string,
    args?: Array<string | number | null>,
  ): Promise<Array<Record<string, unknown>>>;
  /**
   * Run `work` in one write transaction. Port calls made inside `work`
   * join it; a throw rolls everything back. Nested calls join the outer one.
   * File libSQL: `BEGIN IMMEDIATE` on the shared connection. Hosted
   * `libsql://`: one interactive `client.transaction("write")`; statements
   * issued inside `work` (drizzle and raw) are routed to it, so it is atomic too.
   * Postgres: one pooled client.
   */
  transaction<T>(work: () => Promise<T>): Promise<T>;
  /**
   * Studio SQL console. Read-only uses a dedicated connection with
   * `PRAGMA query_only=ON` (libSQL) or `BEGIN READ ONLY` (Postgres).
   * Writes use the main client; the server must enqueue them.
   */
  executeSql(input: {
    sql: string;
    args?: Array<string | number | null>;
    readOnly: boolean;
    timeoutMs?: number;
    rowCap?: number;
    signal?: AbortSignal;
  }): Promise<{
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
    elapsedMs: number;
  }>;
  /**
   * `PRAGMA wal_checkpoint(TRUNCATE)` on local file libSQL.
   * No-op on hosted `libsql://` and Postgres.
   */
  checkpointTruncate(): Promise<void>;

  insertRecord(input: InsertRecordInput): Promise<JordRecord>;
  getRecord(id: string): Promise<JordRecord | null>;
  listRecordsByBucket(bucket: string): Promise<JordRecord[]>;
  updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult>;
  /** Hard delete. Returns true if a row was removed. */
  deleteRecord(id: string): Promise<boolean>;

  listJobs(): Promise<JordJob[]>;
  getJob(id: string): Promise<JordJob | null>;
  insertJob(input: InsertJobInput): Promise<JordJob>;
  updateJob(input: UpdateJobInput): Promise<JordJob | null>;
  deleteJob(id: string): Promise<boolean>;
  listJobRuns(jobId: string, limit?: number): Promise<JordJobRun[]>;
  insertJobRun(input: InsertJobRunInput): Promise<JordJobRun>;
  finishJobRun(input: FinishJobRunInput): Promise<JordJobRun | null>;
  /** Enabled jobs with next_run_at <= now (or null treated as due). */
  listDueJobs(nowMs: number): Promise<JordJob[]>;

  listFunctions(): Promise<JordFunction[]>;
  getFunction(id: string): Promise<JordFunction | null>;
  getFunctionBySlug(slug: string): Promise<JordFunction | null>;
  insertFunction(input: InsertFunctionInput): Promise<JordFunction>;
  updateFunction(input: UpdateFunctionInput): Promise<JordFunction | null>;
  deleteFunction(id: string): Promise<DeleteFunctionResult>;

  listCustomApis(): Promise<JordCustomApi[]>;
  getCustomApi(id: string): Promise<JordCustomApi | null>;
  getCustomApiByMethodSlug(
    method: JordHttpMethod,
    slug: string,
  ): Promise<JordCustomApi | null>;
  insertCustomApi(input: InsertCustomApiInput): Promise<JordCustomApi>;
  updateCustomApi(input: UpdateCustomApiInput): Promise<JordCustomApi | null>;
  deleteCustomApi(id: string): Promise<boolean>;
  countCustomApisByFunction(functionId: string): Promise<number>;

  listPolicies(): Promise<JordPolicy[]>;
  getPolicy(id: string): Promise<JordPolicy | null>;
  /** Enabled policies for table+operation, sorted priority desc (deny before allow at equal priority). */
  listPoliciesFor(
    tableName: string,
    operation: JordPolicyOperation,
  ): Promise<JordPolicy[]>;
  insertPolicy(input: InsertPolicyInput): Promise<JordPolicy>;
  updatePolicy(input: UpdatePolicyInput): Promise<JordPolicy | null>;
  deletePolicy(id: string): Promise<boolean>;

  listTriggers(): Promise<JordTrigger[]>;
  getTrigger(id: string): Promise<JordTrigger | null>;
  /** Enabled triggers for table+event. */
  listTriggersFor(
    tableName: string,
    event: JordTriggerEvent,
  ): Promise<JordTrigger[]>;
  insertTrigger(input: InsertTriggerInput): Promise<JordTrigger>;
  updateTrigger(input: UpdateTriggerInput): Promise<JordTrigger | null>;
  deleteTrigger(id: string): Promise<boolean>;

  /**
   * Dialect SQL emit seam for native triggers (Postgres / future).
   * LibSqlAdapter returns null in S7 — app hooks are the primary path.
   */
  compileTriggerSql?(def: JordTrigger): string | null;

  /**
   * Bind request role/bucket/uid/claims for Postgres RLS GUCs
   * (`jord.role`, `jord.bucket`, `jord.uid`, `jord.claims`).
   * No-op on libSQL. Uses async context: every later port call in the same
   * request (including write-queue callbacks enqueued from it) sees it.
   */
  bindRlsSession?(input: {
    role: string;
    bucket?: string | null;
    uid?: string | null;
    claims?: Record<string, unknown> | null;
  }): void;

  /**
   * Per-table RLS flag from `jord_table_rls`, or null when the row is absent.
   * `schema` defaults to `defaultSchema`.
   */
  getTableRls(tableName: string, schema?: string): Promise<TableRlsFlag | null>;
  /** Upsert `jord_table_rls` on `(schema_name, table_name)`. */
  setTableRls(input: {
    tableName: string;
    schema?: string;
    rlsEnabled: boolean;
    ownerColumn?: string | null;
  }): Promise<TableRlsFlag>;

  /**
   * Native CREATE POLICY for one Jord policy, or null when this dialect
   * does not compile it (libSQL) or the policy is not compilable.
   */
  compilePolicySql?(policy: JordPolicy, schema?: string): string | null;

  /**
   * Rebuild Postgres RLS on `records` and every `rls_enabled` user table
   * from `jord_policies`, and grant DML to `jord_app` when it exists.
   * Needs the table owner (migrate connection). No-op on libSQL.
   */
  syncRecordsPoliciesRls?(): Promise<void>;

  /**
   * Schema searched when a method gets no `schema`: `public` (Postgres) or
   * `main` (libSQL).
   */
  readonly defaultSchema: string;
  /**
   * Schemas a request may target. Postgres: non-system schemas the current
   * role can USE. libSQL: always `main`.
   */
  listSchemas(): Promise<JordSchemaInfo[]>;
  /**
   * Validate `input` (null/empty → `defaultSchema`) against `listSchemas`.
   * Unknown or malformed names fail with `unknown_schema`.
   */
  resolveSchema(input?: string | null): Promise<ResolveSchemaResult>;

  /**
   * User tables in `schema` (default `defaultSchema`). An unknown schema
   * yields an empty list; resolve first when you need the error.
   */
  listTables(schema?: string): Promise<string[]>;
  /**
   * Columns; null if table or schema is missing. The result carries `schema`.
   */
  describeTable(name: string, schema?: string): Promise<JordTableInfo | null>;
  /** Additive DDL only — ADD COLUMN with type whitelist. */
  addColumn(input: AddColumnInput): Promise<AddColumnResult>;
  /** CREATE TABLE for user tables. Rejects reserved names and existing tables. */
  createTable(input: CreateTableInput): Promise<CreateTableResult>;
  /**
   * Add a table-level FOREIGN KEY after create (Postgres `ALTER TABLE ADD`).
   * libSQL returns `fk_unsupported` — declare on CREATE / ADD COLUMN instead.
   */
  addForeignKey(input: AddForeignKeyInput): Promise<AddForeignKeyResult>;
  /** Read-only page of rows. Limit is clamped to 1–100. */
  listTableRows(input: ListTableRowsInput): Promise<ListTableRowsResult>;
  /** Insert one row into a user table. Rejects reserved names and duplicate PKs. */
  insertTableRow(input: InsertTableRowInput): Promise<MutateTableRowResult>;
  /** Patch non-key columns of one user-table row identified by its primary key. */
  updateTableRow(input: UpdateTableRowInput): Promise<MutateTableRowResult>;
  /** Delete one user-table row by primary key. */
  deleteTableRow(input: DeleteTableRowInput): Promise<MutateTableRowResult>;

  /** DROP TABLE for user tables. Rejects reserved names. */
  dropTable(input: DropTableInput): Promise<SchemaDdlResult>;
  /** RENAME TABLE for user tables. */
  renameTable(input: RenameTableInput): Promise<SchemaDdlResult>;
  /** DROP COLUMN (non-PK) on a user table. */
  dropColumn(input: DropColumnInput): Promise<SchemaDdlResult>;
  /** Rename and/or change type of a user-table column. */
  alterColumn(input: AlterColumnInput): Promise<SchemaDdlResult>;

  /** Distinct blob buckets that have at least one object (metadata). */
  listBlobBuckets(): Promise<string[]>;
  listBlobs(bucket: string): Promise<JordBlob[]>;
  getBlobMeta(bucket: string, key: string): Promise<JordBlob | null>;
  /** Insert or replace metadata for (bucket, key). */
  upsertBlobMeta(input: UpsertBlobMetaInput): Promise<JordBlob>;
  /** Delete metadata row. Returns true if a row was removed. */
  deleteBlobMeta(bucket: string, key: string): Promise<boolean>;
  /** Pending rows whose pending_expires_at is at or before `nowMs`. */
  listExpiredPendingBlobs(nowMs: number): Promise<JordBlob[]>;
  /** All blob metadata rows (copy/verify plan; may be large). */
  listAllBlobMeta(): Promise<JordBlob[]>;

  listVectorNamespaces(): Promise<string[]>;
  listEmbeddings(namespace: string): Promise<JordEmbeddingMeta[]>;
  getEmbedding(namespace: string, id: string): Promise<JordEmbeddingMeta | null>;
  upsertEmbedding(input: UpsertEmbeddingInput): Promise<UpsertEmbeddingResult>;
  deleteEmbedding(namespace: string, id: string): Promise<boolean>;
  searchVectors(input: SearchVectorsInput): Promise<SearchVectorsResult>;

  /**
   * Consistent snapshot via SQLite `VACUUM INTO` (libSQL only).
   * Postgres throws JordUnsupportedError.
   */
  snapshotTo(destPath: string): Promise<string>;
}
