import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient, type Client } from "@libsql/client";
import { and, asc, desc, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type {
  AddColumnInput,
  AddColumnResult,
  AlterColumnInput,
  CreateTableInput,
  CreateTableResult,
  DeleteFunctionResult,
  DropColumnInput,
  DropTableInput,
  RenameTableInput,
  SchemaDdlResult,
  FinishJobRunInput,
  InsertCustomApiInput,
  InsertFunctionInput,
  InsertJobInput,
  InsertJobRunInput,
  InsertPolicyInput,
  DeleteTableRowInput,
  InsertRecordInput,
  InsertTableRowInput,
  MutateTableRowResult,
  UpdateTableRowInput,
  InsertTriggerInput,
  JordColumnInfo,
  JordCustomApi,
  JordDb,
  JordDriverPort,
  JordFunction,
  JordHttpMethod,
  JordJob,
  JordJobRun,
  JordJobStatus,
  JordPolicy,
  JordPolicyEffect,
  JordPolicyOperation,
  JordRecord,
  JordTableInfo,
  TableRlsFlag,
  JordTrigger,
  JordTriggerEvent,
  JordTriggerTiming,
  JordBlob,
  JordEmbeddingMeta,
  ListTableRowsInput,
  ListTableRowsResult,
  SearchVectorsInput,
  SearchVectorsResult,
  VectorBackend,
  VectorSearchHit,
  UpsertBlobMetaInput,
  UpsertEmbeddingInput,
  UpsertEmbeddingResult,
  UpdateCustomApiInput,
  UpdateFunctionInput,
  UpdateJobInput,
  UpdatePolicyInput,
  UpdateRecordInput,
  UpdateRecordResult,
  UpdateTriggerInput,
} from "../port.js";
import {
  buildAddColumnSql,
  buildCreateTableSql,
  clampRowWindow,
  isJordColumnType,
  isReservedCreateTableName,
  isValidSqlIdent,
  planCreateTable,
  quoteIdent,
  toTableCell,
} from "../schema/ddl.js";
import { rowScopeSql } from "../schema/row-scope.js";
import {
  buildRebuildCopySql,
  buildRebuildCreateSql,
  planAlterColumn,
  planDropColumn,
  planDropTable,
  planRenameTable,
  TABLE_NAME_METADATA,
  rebuildTempName,
  requireUserTableName,
} from "../schema/ddl-alter.js";
import {
  planDeleteRow,
  planInsertRow,
  planUpdateRow,
} from "../schema/row-write.js";
import { JordUnsupportedError } from "../errors.js";
import { jordBlobs } from "../schema/blobs.js";
import { jordEmbeddings } from "../schema/embeddings.js";
import { jordCustomApis, jordFunctions } from "../schema/functions.js";
import { jordJobRuns, jordJobs } from "../schema/jobs.js";
import { jordPolicies } from "../schema/policies.js";
import { records, schema } from "../schema/records.js";
import { jordTriggers } from "../schema/triggers.js";
import { ensureRecordsSchema } from "../schema/migrate.js";
import { migrationLockKey } from "../schema/migrations/runner.js";
import {
  clampSqlRowCap,
  clampSqlTimeout,
} from "../schema/sql-console.js";
import {
  fileUrlToFsPath,
  requireLibsqlAuthToken,
  type JordUrlScheme,
} from "../url.js";
import { clampSearchLimit, packF32, validateEmbeddingArray } from "../vectors/f32.js";
import {
  LIBSQL_VECTOR_PROBE_SQL,
  libsqlProbeOk,
  quoteShadowIdent,
  shadowIndexDdl,
  shadowIndexName,
  shadowTableDdl,
  shadowTableName,
  useLibsqlAnn,
} from "../vectors/hard.js";
import { isValidVectorNamespace } from "../vectors/names.js";
import { rankByCosine } from "../vectors/search.js";

export type LibSqlOpenOptions = {
  /** Hosted libsql auth; defaults to env tokens. */
  authToken?: string;
};

const POLICY_OPS = new Set<JordPolicyOperation>([
  "select",
  "insert",
  "update",
  "delete",
]);
const POLICY_EFFECTS = new Set<JordPolicyEffect>(["allow", "deny"]);
const TRIGGER_EVENTS = new Set<JordTriggerEvent>([
  "insert",
  "update",
  "delete",
]);

function asPolicyOp(value: string): JordPolicyOperation {
  return POLICY_OPS.has(value as JordPolicyOperation)
    ? (value as JordPolicyOperation)
    : "select";
}

function asPolicyEffect(value: string): JordPolicyEffect {
  return POLICY_EFFECTS.has(value as JordPolicyEffect)
    ? (value as JordPolicyEffect)
    : "deny";
}

function asTriggerEvent(value: string): JordTriggerEvent {
  return TRIGGER_EVENTS.has(value as JordTriggerEvent)
    ? (value as JordTriggerEvent)
    : "insert";
}

function asTriggerTiming(value: string): JordTriggerTiming {
  return value === "after" ? "after" : "after";
}

const HTTP_METHODS = new Set<JordHttpMethod>([
  "GET",
  "POST",
  "PATCH",
  "DELETE",
]);

function asHttpMethod(value: string): JordHttpMethod {
  if (HTTP_METHODS.has(value as JordHttpMethod)) {
    return value as JordHttpMethod;
  }
  return "GET";
}

const WAL_PRAGMAS = [
  "PRAGMA journal_mode = WAL",
  "PRAGMA busy_timeout = 5000",
  "PRAGMA synchronous = NORMAL",
] as const;

function mapRow(row: typeof records.$inferSelect): JordRecord {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function mapBlob(row: typeof jordBlobs.$inferSelect): JordBlob {
  const status =
    row.status === "pending" || row.status === "ready" ? row.status : "ready";
  return {
    id: row.id,
    bucket: row.bucket,
    key: row.key,
    contentType: row.contentType,
    size: row.size,
    etag: row.etag,
    status,
    pendingExpiresAt: row.pendingExpiresAt ?? null,
    uploadId: row.uploadId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEmbeddingMeta(
  row: typeof jordEmbeddings.$inferSelect,
): JordEmbeddingMeta {
  return {
    id: row.id,
    namespace: row.namespace,
    refId: row.refId ?? null,
    dims: row.dims,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapJob(row: typeof jordJobs.$inferSelect): JordJob {
  const lastStatus =
    row.lastStatus === "ok" || row.lastStatus === "error"
      ? (row.lastStatus as JordJobStatus)
      : null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    enabled: Boolean(row.enabled),
    intervalMs: row.intervalMs,
    config: row.config,
    nextRunAt: row.nextRunAt ?? null,
    lastRunAt: row.lastRunAt ?? null,
    lastStatus,
    lastError: row.lastError ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapJobRun(row: typeof jordJobRuns.$inferSelect): JordJobRun {
  const status =
    row.status === "running" || row.status === "ok" || row.status === "error"
      ? row.status
      : "error";
  return {
    id: row.id,
    jobId: row.jobId,
    status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? null,
    error: row.error ?? null,
    result: row.result ?? null,
  };
}

function mapFunction(row: typeof jordFunctions.$inferSelect): JordFunction {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    steps: row.steps,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCustomApi(row: typeof jordCustomApis.$inferSelect): JordCustomApi {
  return {
    id: row.id,
    name: row.name,
    method: asHttpMethod(row.method),
    slug: row.slug,
    functionId: row.functionId,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPolicy(row: typeof jordPolicies.$inferSelect): JordPolicy {
  return {
    id: row.id,
    name: row.name,
    tableName: row.tableName,
    operation: asPolicyOp(row.operation),
    effect: asPolicyEffect(row.effect),
    rules: row.rules,
    priority: row.priority,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rlsEnabledFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value === 1n;
  if (typeof value === "number") return value === 1;
  return value === "1" || value === "t" || value === "true";
}

function mapTableRls(row: Record<string, unknown>): TableRlsFlag {
  const owner = row.owner_column;
  return {
    tableName: String(row.table_name ?? ""),
    rlsEnabled: rlsEnabledFlag(row.rls_enabled),
    ownerColumn: owner == null ? null : String(owner),
  };
}

function mapTrigger(row: typeof jordTriggers.$inferSelect): JordTrigger {
  return {
    id: row.id,
    name: row.name,
    tableName: row.tableName,
    timing: asTriggerTiming(row.timing),
    event: asTriggerEvent(row.event),
    actions: row.actions,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function probeLibsqlVectorBackend(client: Client): Promise<VectorBackend> {
  try {
    const rs = await client.execute(LIBSQL_VECTOR_PROBE_SQL);
    if (libsqlProbeOk(rs.rows[0]?.d)) return "libsql-vector";
  } catch {
    // Older engines have no vector_distance_cos — cosine search still works.
  }
  return "cosine";
}

const inLibsqlTx = new AsyncLocalStorage<boolean>();

export class LibSqlAdapter implements JordDriverPort {
  readonly dialect = "libsql" as const;
  readonly urlScheme: Extract<JordUrlScheme, "file" | "libsql">;
  readonly vectorBackend: VectorBackend;
  readonly client: Client;
  readonly db: JordDb;
  private readonly connectionUrl: string;
  private readonly authToken?: string;

  private constructor(
    client: Client,
    urlScheme: Extract<JordUrlScheme, "file" | "libsql">,
    vectorBackend: VectorBackend,
    connectionUrl: string,
    authToken?: string,
  ) {
    this.client = client;
    this.urlScheme = urlScheme;
    this.vectorBackend = vectorBackend;
    this.db = drizzle(client, { schema });
    this.connectionUrl = connectionUrl;
    this.authToken = authToken;
  }

  static async open(
    url: string,
    options: LibSqlOpenOptions = {},
  ): Promise<LibSqlAdapter> {
    if (url.startsWith("libsql:")) {
      const authToken = requireLibsqlAuthToken(url, options.authToken);
      const client = createClient({ url, authToken });
      try {
        await ensureRecordsSchema(client, migrationLockKey(url));
        const vectorBackend = await probeLibsqlVectorBackend(client);
        return new LibSqlAdapter(client, "libsql", vectorBackend, url, authToken);
      } catch (err) {
        client.close();
        throw err;
      }
    }

    const fsPath = fileUrlToFsPath(url);
    await mkdir(path.dirname(fsPath), { recursive: true });

    const client = createClient({ url });
    try {
      for (const pragma of WAL_PRAGMAS) {
        await client.execute(pragma);
      }
      await ensureRecordsSchema(client, migrationLockKey(url));
      const vectorBackend = await probeLibsqlVectorBackend(client);
      return new LibSqlAdapter(client, "file", vectorBackend, url);
    } catch (err) {
      client.close();
      throw err;
    }
  }

  async query(
    sql: string,
    args: Array<string | number | null> = [],
  ): Promise<Array<Record<string, unknown>>> {
    const result = await this.client.execute({ sql, args });
    const columns = result.columns;
    return result.rows.map((row) => {
      const record = row as unknown as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        const name = columns[i] ?? String(i);
        out[name] = record[name] ?? record[i];
      }
      return out;
    });
  }

  /**
   * File libSQL: BEGIN IMMEDIATE on the shared connection, so drizzle and raw
   * calls inside `work` join it. Callers must hold the write queue; any other
   * statement issued on this connection meanwhile also lands in the transaction.
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.urlScheme === "libsql" || inLibsqlTx.getStore()) return work();
    await this.client.execute("BEGIN IMMEDIATE");
    try {
      const result = await inLibsqlTx.run(true, work);
      await this.client.execute("COMMIT");
      return result;
    } catch (err) {
      await this.client.execute("ROLLBACK").catch(() => undefined);
      throw err;
    }
  }

  async executeSql(input: {
    sql: string;
    args?: Array<string | number | null>;
    readOnly: boolean;
    timeoutMs?: number;
    rowCap?: number;
  }): Promise<{
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
    elapsedMs: number;
  }> {
    const rowCap = clampSqlRowCap(input.rowCap);
    const timeoutMs = clampSqlTimeout(input.timeoutMs);
    const args = input.args ?? [];
    const started = Date.now();

    if (input.readOnly) {
      const readClient = createClient({
        url: this.connectionUrl,
        ...(this.authToken ? { authToken: this.authToken } : {}),
      });
      try {
        await readClient.execute("PRAGMA query_only = ON");
        const result = await Promise.race([
          readClient.execute({ sql: input.sql, args }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("sql_timeout")), timeoutMs);
          }),
        ]);
        const columns = result.columns;
        const mapped = result.rows.map((row) => {
          const record = row as unknown as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          for (let i = 0; i < columns.length; i++) {
            const name = columns[i] ?? String(i);
            out[name] = record[name] ?? record[i];
          }
          return out;
        });
        const truncated = mapped.length > rowCap;
        const rows = truncated ? mapped.slice(0, rowCap) : mapped;
        return {
          columns,
          rows,
          rowCount: mapped.length,
          truncated,
          elapsedMs: Date.now() - started,
        };
      } finally {
        readClient.close();
      }
    }

    const result = await Promise.race([
      this.client.execute({ sql: input.sql, args }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("sql_timeout")), timeoutMs);
      }),
    ]);
    const columns = result.columns;
    const mapped = result.rows.map((row) => {
      const record = row as unknown as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        const name = columns[i] ?? String(i);
        out[name] = record[name] ?? record[i];
      }
      return out;
    });
    const truncated = mapped.length > rowCap;
    return {
      columns,
      rows: truncated ? mapped.slice(0, rowCap) : mapped,
      rowCount: mapped.length,
      truncated,
      elapsedMs: Date.now() - started,
    };
  }

  async close(): Promise<void> {
    if (this.urlScheme === "file") {
      try {
        await this.client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {
        // Best-effort — still close so Windows can unlock the file.
      }
    }
    this.client.close();
  }

  async checkpointTruncate(): Promise<void> {
    if (this.urlScheme !== "file") return;
    await this.client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
  }

  async insertRecord(input: InsertRecordInput): Promise<JordRecord> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      bucket: input.bucket,
      body: input.body,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await this.db.insert(records).values(row);
    return mapRow(row);
  }

  async getRecord(id: string): Promise<JordRecord | null> {
    const rows = await this.db
      .select()
      .from(records)
      .where(eq(records.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async listRecordsByBucket(bucket: string): Promise<JordRecord[]> {
    const rows = await this.db
      .select()
      .from(records)
      .where(eq(records.bucket, bucket))
      .orderBy(desc(records.createdAt));
    return rows.map(mapRow);
  }

  async updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult> {
    const now = Date.now();
    const setClauses: string[] = [
      "version = version + 1",
      "updated_at = ?",
    ];
    const args: Array<string | number | null> = [now];

    if (input.body !== undefined) {
      setClauses.push("body = ?");
      args.push(input.body);
    }
    if (input.metadata !== undefined) {
      setClauses.push("metadata = ?");
      args.push(input.metadata);
    }
    if (input.bucket !== undefined) {
      setClauses.push("bucket = ?");
      args.push(input.bucket);
    }

    args.push(input.id, input.version);

    const result = await this.client.execute({
      sql: `UPDATE records SET ${setClauses.join(", ")} WHERE id = ? AND version = ?`,
      args,
    });

    if (result.rowsAffected === 0) {
      return { ok: false, conflict: true };
    }

    const record = await this.getRecord(input.id);
    if (!record) {
      return { ok: false, conflict: true };
    }
    return { ok: true, record };
  }

  async deleteRecord(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM records WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async listJobs(): Promise<JordJob[]> {
    const rows = await this.db
      .select()
      .from(jordJobs)
      .orderBy(desc(jordJobs.createdAt));
    return rows.map(mapJob);
  }

  async getJob(id: string): Promise<JordJob | null> {
    const rows = await this.db
      .select()
      .from(jordJobs)
      .where(eq(jordJobs.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapJob(row) : null;
  }

  async insertJob(input: InsertJobInput): Promise<JordJob> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      enabled: input.enabled ?? false,
      intervalMs: input.intervalMs,
      config: input.config ?? "{}",
      nextRunAt: input.nextRunAt ?? (input.enabled ? now : null),
      lastRunAt: null as number | null,
      lastStatus: null as string | null,
      lastError: null as string | null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordJobs).values(row);
    return mapJob(row);
  }

  async updateJob(input: UpdateJobInput): Promise<JordJob | null> {
    const existing = await this.getJob(input.id);
    if (!existing) return null;
    const now = Date.now();
    const next = {
      name: input.name ?? existing.name,
      kind: input.kind ?? existing.kind,
      enabled: input.enabled ?? existing.enabled,
      intervalMs: input.intervalMs ?? existing.intervalMs,
      config: input.config ?? existing.config,
      nextRunAt:
        input.nextRunAt !== undefined ? input.nextRunAt : existing.nextRunAt,
      lastRunAt:
        input.lastRunAt !== undefined ? input.lastRunAt : existing.lastRunAt,
      lastStatus:
        input.lastStatus !== undefined
          ? input.lastStatus
          : existing.lastStatus,
      lastError:
        input.lastError !== undefined ? input.lastError : existing.lastError,
      updatedAt: now,
    };
    await this.db
      .update(jordJobs)
      .set(next)
      .where(eq(jordJobs.id, input.id));
    return this.getJob(input.id);
  }

  async deleteJob(id: string): Promise<boolean> {
    await this.client.execute({
      sql: "DELETE FROM jord_job_runs WHERE job_id = ?",
      args: [id],
    });
    const result = await this.client.execute({
      sql: "DELETE FROM jord_jobs WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async listJobRuns(jobId: string, limit = 50): Promise<JordJobRun[]> {
    const rows = await this.db
      .select()
      .from(jordJobRuns)
      .where(eq(jordJobRuns.jobId, jobId))
      .orderBy(desc(jordJobRuns.startedAt))
      .limit(Math.max(1, Math.min(limit, 200)));
    return rows.map(mapJobRun);
  }

  async insertJobRun(input: InsertJobRunInput): Promise<JordJobRun> {
    const startedAt = input.startedAt ?? Date.now();
    const row = {
      id: randomUUID(),
      jobId: input.jobId,
      status: "running" as const,
      startedAt,
      finishedAt: null as number | null,
      error: null as string | null,
      result: null as string | null,
    };
    await this.db.insert(jordJobRuns).values(row);
    return mapJobRun(row);
  }

  async finishJobRun(input: FinishJobRunInput): Promise<JordJobRun | null> {
    const finishedAt = input.finishedAt ?? Date.now();
    await this.db
      .update(jordJobRuns)
      .set({
        status: input.status,
        finishedAt,
        error: input.error ?? null,
        result: input.result ?? null,
      })
      .where(eq(jordJobRuns.id, input.id));
    const rows = await this.db
      .select()
      .from(jordJobRuns)
      .where(eq(jordJobRuns.id, input.id))
      .limit(1);
    const row = rows[0];
    return row ? mapJobRun(row) : null;
  }

  async listDueJobs(nowMs: number): Promise<JordJob[]> {
    const rows = await this.db
      .select()
      .from(jordJobs)
      .where(
        and(
          eq(jordJobs.enabled, true),
          or(isNull(jordJobs.nextRunAt), lte(jordJobs.nextRunAt, nowMs)),
        ),
      )
      .orderBy(jordJobs.nextRunAt);
    return rows.map(mapJob);
  }

  async listFunctions(): Promise<JordFunction[]> {
    const rows = await this.db
      .select()
      .from(jordFunctions)
      .orderBy(desc(jordFunctions.createdAt));
    return rows.map(mapFunction);
  }

  async getFunction(id: string): Promise<JordFunction | null> {
    const rows = await this.db
      .select()
      .from(jordFunctions)
      .where(eq(jordFunctions.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapFunction(row) : null;
  }

  async getFunctionBySlug(slug: string): Promise<JordFunction | null> {
    const rows = await this.db
      .select()
      .from(jordFunctions)
      .where(eq(jordFunctions.slug, slug))
      .limit(1);
    const row = rows[0];
    return row ? mapFunction(row) : null;
  }

  async insertFunction(input: InsertFunctionInput): Promise<JordFunction> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      steps: input.steps ?? "[]",
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordFunctions).values(row);
    return mapFunction(row);
  }

  async updateFunction(
    input: UpdateFunctionInput,
  ): Promise<JordFunction | null> {
    const existing = await this.getFunction(input.id);
    if (!existing) return null;
    const now = Date.now();
    await this.db
      .update(jordFunctions)
      .set({
        name: input.name ?? existing.name,
        slug: input.slug ?? existing.slug,
        description:
          input.description !== undefined
            ? input.description
            : existing.description,
        steps: input.steps ?? existing.steps,
        enabled: input.enabled ?? existing.enabled,
        updatedAt: now,
      })
      .where(eq(jordFunctions.id, input.id));
    return this.getFunction(input.id);
  }

  async deleteFunction(id: string): Promise<DeleteFunctionResult> {
    const existing = await this.getFunction(id);
    if (!existing) return { ok: false, error: "not_found" };
    const dependents = await this.countCustomApisByFunction(id);
    if (dependents > 0) {
      return { ok: false, error: "has_dependents", dependents };
    }
    const result = await this.client.execute({
      sql: "DELETE FROM jord_functions WHERE id = ?",
      args: [id],
    });
    if (result.rowsAffected === 0) return { ok: false, error: "not_found" };
    return { ok: true };
  }

  async listCustomApis(): Promise<JordCustomApi[]> {
    const rows = await this.db
      .select()
      .from(jordCustomApis)
      .orderBy(desc(jordCustomApis.createdAt));
    return rows.map(mapCustomApi);
  }

  async getCustomApi(id: string): Promise<JordCustomApi | null> {
    const rows = await this.db
      .select()
      .from(jordCustomApis)
      .where(eq(jordCustomApis.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async getCustomApiByMethodSlug(
    method: JordHttpMethod,
    slug: string,
  ): Promise<JordCustomApi | null> {
    const rows = await this.db
      .select()
      .from(jordCustomApis)
      .where(
        and(eq(jordCustomApis.method, method), eq(jordCustomApis.slug, slug)),
      )
      .limit(1);
    const row = rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async insertCustomApi(input: InsertCustomApiInput): Promise<JordCustomApi> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      name: input.name,
      method: input.method,
      slug: input.slug,
      functionId: input.functionId,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordCustomApis).values(row);
    return mapCustomApi(row);
  }

  async updateCustomApi(
    input: UpdateCustomApiInput,
  ): Promise<JordCustomApi | null> {
    const existing = await this.getCustomApi(input.id);
    if (!existing) return null;
    const now = Date.now();
    await this.db
      .update(jordCustomApis)
      .set({
        name: input.name ?? existing.name,
        method: input.method ?? existing.method,
        slug: input.slug ?? existing.slug,
        functionId: input.functionId ?? existing.functionId,
        enabled: input.enabled ?? existing.enabled,
        updatedAt: now,
      })
      .where(eq(jordCustomApis.id, input.id));
    return this.getCustomApi(input.id);
  }

  async deleteCustomApi(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM jord_custom_apis WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async countCustomApisByFunction(functionId: string): Promise<number> {
    const rows = await this.db
      .select()
      .from(jordCustomApis)
      .where(eq(jordCustomApis.functionId, functionId));
    return rows.length;
  }

  async listPolicies(): Promise<JordPolicy[]> {
    const rows = await this.db
      .select()
      .from(jordPolicies)
      .orderBy(desc(jordPolicies.priority), desc(jordPolicies.createdAt));
    return rows.map(mapPolicy);
  }

  async getPolicy(id: string): Promise<JordPolicy | null> {
    const rows = await this.db
      .select()
      .from(jordPolicies)
      .where(eq(jordPolicies.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapPolicy(row) : null;
  }

  async listPoliciesFor(
    tableName: string,
    operation: JordPolicyOperation,
  ): Promise<JordPolicy[]> {
    const rows = await this.db
      .select()
      .from(jordPolicies)
      .where(
        and(
          eq(jordPolicies.tableName, tableName),
          eq(jordPolicies.operation, operation),
          eq(jordPolicies.enabled, true),
        ),
      );
    const mapped = rows.map(mapPolicy);
    mapped.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Deny before allow at equal priority
      if (a.effect !== b.effect) {
        if (a.effect === "deny") return -1;
        if (b.effect === "deny") return 1;
      }
      return b.createdAt - a.createdAt;
    });
    return mapped;
  }

  async insertPolicy(input: InsertPolicyInput): Promise<JordPolicy> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      name: input.name,
      tableName: input.tableName,
      operation: input.operation,
      effect: input.effect,
      rules: input.rules ?? "[]",
      priority: input.priority ?? 0,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordPolicies).values(row);
    return mapPolicy(row);
  }

  async updatePolicy(input: UpdatePolicyInput): Promise<JordPolicy | null> {
    const existing = await this.getPolicy(input.id);
    if (!existing) return null;
    const now = Date.now();
    await this.db
      .update(jordPolicies)
      .set({
        name: input.name ?? existing.name,
        tableName: input.tableName ?? existing.tableName,
        operation: input.operation ?? existing.operation,
        effect: input.effect ?? existing.effect,
        rules: input.rules ?? existing.rules,
        priority: input.priority ?? existing.priority,
        enabled: input.enabled ?? existing.enabled,
        updatedAt: now,
      })
      .where(eq(jordPolicies.id, input.id));
    return this.getPolicy(input.id);
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM jord_policies WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async listTriggers(): Promise<JordTrigger[]> {
    const rows = await this.db
      .select()
      .from(jordTriggers)
      .orderBy(desc(jordTriggers.createdAt));
    return rows.map(mapTrigger);
  }

  async getTrigger(id: string): Promise<JordTrigger | null> {
    const rows = await this.db
      .select()
      .from(jordTriggers)
      .where(eq(jordTriggers.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapTrigger(row) : null;
  }

  async listTriggersFor(
    tableName: string,
    event: JordTriggerEvent,
  ): Promise<JordTrigger[]> {
    const rows = await this.db
      .select()
      .from(jordTriggers)
      .where(
        and(
          eq(jordTriggers.tableName, tableName),
          eq(jordTriggers.event, event),
          eq(jordTriggers.enabled, true),
        ),
      )
      .orderBy(desc(jordTriggers.createdAt));
    return rows.map(mapTrigger);
  }

  async insertTrigger(input: InsertTriggerInput): Promise<JordTrigger> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      name: input.name,
      tableName: input.tableName,
      timing: input.timing ?? "after",
      event: input.event,
      actions: input.actions ?? "[]",
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordTriggers).values(row);
    return mapTrigger(row);
  }

  async updateTrigger(input: UpdateTriggerInput): Promise<JordTrigger | null> {
    const existing = await this.getTrigger(input.id);
    if (!existing) return null;
    const now = Date.now();
    await this.db
      .update(jordTriggers)
      .set({
        name: input.name ?? existing.name,
        tableName: input.tableName ?? existing.tableName,
        timing: input.timing ?? existing.timing,
        event: input.event ?? existing.event,
        actions: input.actions ?? existing.actions,
        enabled: input.enabled ?? existing.enabled,
        updatedAt: now,
      })
      .where(eq(jordTriggers.id, input.id));
    return this.getTrigger(input.id);
  }

  async deleteTrigger(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM jord_triggers WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  compileTriggerSql(_def: JordTrigger): string | null {
    return null;
  }

  bindRlsSession(_input: {
    role: string;
    bucket?: string | null;
    uid?: string | null;
  }): void {
    // libSQL keeps application middleware; no session GUCs.
  }

  async getTableRls(tableName: string): Promise<TableRlsFlag | null> {
    const rows = await this.query(
      `SELECT table_name, rls_enabled, owner_column FROM jord_table_rls WHERE table_name = ? LIMIT 1`,
      [tableName],
    );
    const row = rows[0];
    return row ? mapTableRls(row) : null;
  }

  async setTableRls(input: {
    tableName: string;
    rlsEnabled: boolean;
    ownerColumn?: string | null;
  }): Promise<TableRlsFlag> {
    const updatedAt = Date.now();
    const ownerColumn = input.ownerColumn ?? null;
    const rows = await this.query(
      `INSERT INTO jord_table_rls (table_name, rls_enabled, owner_column, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(table_name) DO UPDATE SET
         rls_enabled = excluded.rls_enabled,
         owner_column = excluded.owner_column,
         updated_at = excluded.updated_at
       RETURNING table_name, rls_enabled, owner_column`,
      [input.tableName, input.rlsEnabled ? 1 : 0, ownerColumn, updatedAt],
    );
    const row = rows[0];
    return row
      ? mapTableRls(row)
      : {
          tableName: input.tableName,
          rlsEnabled: input.rlsEnabled,
          ownerColumn,
        };
  }

  compilePolicySql(_policy: JordPolicy): string | null {
    return null;
  }

  async syncRecordsPoliciesRls(): Promise<void> {
    // No native RLS on libSQL.
  }

  async listTables(): Promise<string[]> {
    const rs = await this.client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    return rs.rows.map((r) => String(r.name ?? r[0]));
  }

  async describeTable(name: string): Promise<JordTableInfo | null> {
    if (!isValidSqlIdent(name)) return null;
    const tables = await this.listTables();
    if (!tables.includes(name)) return null;

    const rs = await this.client.execute(
      `PRAGMA table_info(${quoteIdent(name)})`,
    );
    const columns: JordColumnInfo[] = rs.rows.map((r) => ({
      name: String(r.name ?? r[1]),
      type: String(r.type ?? r[2] ?? ""),
      notnull: Number(r.notnull ?? r[3] ?? 0) === 1,
      pk: Number(r.pk ?? r[5] ?? 0) > 0,
      dflt_value:
        r.dflt_value === undefined || r.dflt_value === null
          ? r[4] === undefined || r[4] === null
            ? null
            : String(r[4])
          : String(r.dflt_value),
    }));
    return { name, columns };
  }

  async addColumn(input: AddColumnInput): Promise<AddColumnResult> {
    if (!isValidSqlIdent(input.table) || !isValidSqlIdent(input.name)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table and column names must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    if (!isJordColumnType(input.type)) {
      return {
        ok: false,
        error: "invalid_type",
        message: `type must be one of TEXT, INTEGER, REAL, BLOB (got ${JSON.stringify(input.type)})`,
      };
    }

    const described = await this.describeTable(input.table);
    if (!described) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${input.table} not found`,
      };
    }
    if (described.columns.some((c) => c.name === input.name)) {
      return {
        ok: false,
        error: "column_exists",
        message: `column ${input.name} already exists on ${input.table}`,
      };
    }

    await this.client.execute(
      buildAddColumnSql(input.table, input.name, input.type),
    );
    return { ok: true };
  }

  async createTable(input: CreateTableInput): Promise<CreateTableResult> {
    const plan = planCreateTable(input);
    if (!plan.ok) return plan;
    const existing = await this.describeTable(plan.name);
    if (existing) {
      return {
        ok: false,
        error: "table_exists",
        message: `table ${plan.name} already exists`,
      };
    }
    const sql = buildCreateTableSql(plan.name, plan.columns, "libsql");
    await this.client.execute(sql);
    return { ok: true, sql };
  }

  async listTableRows(input: ListTableRowsInput): Promise<ListTableRowsResult> {
    if (!isValidSqlIdent(input.table)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    const described = await this.describeTable(input.table);
    if (!described) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${input.table} not found`,
      };
    }
    const window = clampRowWindow(input.limit, input.offset);
    const columns = described.columns.map((col) => col.name);
    const args: Array<string | number | null> = [];
    const where = input.rowScope
      ? ` WHERE ${rowScopeSql(input.rowScope, columns, args)}`
      : "";
    args.push(window.limit, window.offset);
    const rs = await this.client.execute({
      sql: `SELECT * FROM ${quoteIdent(input.table)}${where} LIMIT ? OFFSET ?`,
      args,
    });
    const rows = rs.rows.map((row) => {
      const out: Record<string, ReturnType<typeof toTableCell>> = {};
      for (const name of columns) {
        out[name] = toTableCell(row[name]);
      }
      return out;
    });
    return { ok: true, columns, rows, limit: window.limit, offset: window.offset };
  }

  async insertTableRow(input: InsertTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table);
    if (!described.ok) return described;
    const plan = planInsertRow(described.info, input.values);
    if (!plan.ok) return plan;
    const existing = await this.client.execute({
      sql: `SELECT 1 AS hit FROM ${quoteIdent(plan.table)} WHERE ${quoteIdent(plan.pkColumn)} = ? LIMIT 1`,
      args: [plan.pkValue],
    });
    if (existing.rows.length > 0) {
      return {
        ok: false,
        error: "pk_exists",
        message: "primary key already exists",
      };
    }
    const cols = plan.columns.map((name) => quoteIdent(name)).join(", ");
    const marks = plan.columns.map(() => "?").join(", ");
    await this.client.execute({
      sql: `INSERT INTO ${quoteIdent(plan.table)} (${cols}) VALUES (${marks})`,
      args: plan.args,
    });
    return { ok: true };
  }

  async updateTableRow(input: UpdateTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table);
    if (!described.ok) return described;
    const plan = planUpdateRow(described.info, input.pk, input.values);
    if (!plan.ok) return plan;
    const sets = plan.setColumns
      .map((name) => `${quoteIdent(name)} = ?`)
      .join(", ");
    const result = await this.client.execute({
      sql: `UPDATE ${quoteIdent(plan.table)} SET ${sets} WHERE ${quoteIdent(plan.pkColumn)} = ?`,
      args: [...plan.args, plan.pkValue],
    });
    if (result.rowsAffected === 0) {
      return { ok: false, error: "not_found", message: "row not found" };
    }
    return { ok: true };
  }

  async deleteTableRow(input: DeleteTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table);
    if (!described.ok) return described;
    const plan = planDeleteRow(described.info, input.pk);
    if (!plan.ok) return plan;
    const result = await this.client.execute({
      sql: `DELETE FROM ${quoteIdent(plan.table)} WHERE ${quoteIdent(plan.pkColumn)} = ?`,
      args: [plan.pkValue],
    });
    if (result.rowsAffected === 0) {
      return { ok: false, error: "not_found", message: "row not found" };
    }
    return { ok: true };
  }

  async dropTable(input: DropTableInput): Promise<SchemaDdlResult> {
    const plan = planDropTable(input.name);
    if (!plan.ok) return plan;
    const existing = await this.describeTable(plan.name);
    if (!existing) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${plan.name} not found`,
      };
    }
    await this.client.execute(`DROP TABLE ${quoteIdent(plan.name)}`);
    return { ok: true };
  }

  async renameTable(input: RenameTableInput): Promise<SchemaDdlResult> {
    const plan = planRenameTable(input.name, input.newName);
    if (!plan.ok) return plan;
    const existing = await this.describeTable(plan.from);
    if (!existing) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${plan.from} not found`,
      };
    }
    const conflict = await this.describeTable(plan.to);
    if (conflict) {
      return {
        ok: false,
        error: "table_exists",
        message: `table ${plan.to} already exists`,
      };
    }
    await this.transaction(async () => {
      await this.client.execute(
        `ALTER TABLE ${quoteIdent(plan.from)} RENAME TO ${quoteIdent(plan.to)}`,
      );
      for (const meta of TABLE_NAME_METADATA) {
        await this.client.execute({
          sql: `UPDATE ${meta} SET table_name = ? WHERE table_name = ?`,
          args: [plan.to, plan.from],
        });
      }
    });
    return { ok: true };
  }

  async dropColumn(input: DropColumnInput): Promise<SchemaDdlResult> {
    const gate = requireUserTableName(input.table);
    if (!gate.ok) return gate;
    const info = await this.describeTable(gate.name);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${gate.name} not found`,
      };
    }
    const plan = planDropColumn(info, input.column);
    if (!plan.ok) return plan;
    await this.client.execute(
      `ALTER TABLE ${quoteIdent(plan.table)} DROP COLUMN ${quoteIdent(plan.column)}`,
    );
    return { ok: true };
  }

  async alterColumn(input: AlterColumnInput): Promise<SchemaDdlResult> {
    const gate = requireUserTableName(input.table);
    if (!gate.ok) return gate;
    const info = await this.describeTable(gate.name);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${gate.name} not found`,
      };
    }
    const plan = planAlterColumn(info, input.column, {
      name: input.name,
      type: input.type,
    });
    if (!plan.ok) return plan;

    if (plan.mode === "rename") {
      await this.client.execute(
        `ALTER TABLE ${quoteIdent(plan.table)} RENAME COLUMN ${quoteIdent(plan.from)} TO ${quoteIdent(plan.to)}`,
      );
      return { ok: true };
    }

    const temp = rebuildTempName(plan.table);
    try {
      await this.client.execute(
        buildRebuildCreateSql(temp, plan.columns, "libsql"),
      );
      await this.client.execute(
        buildRebuildCopySql(
          plan.table,
          temp,
          info,
          plan.from,
          plan.to,
          plan.nextType,
          "libsql",
        ),
      );
      await this.client.execute(`DROP TABLE ${quoteIdent(plan.table)}`);
      await this.client.execute(
        `ALTER TABLE ${quoteIdent(temp)} RENAME TO ${quoteIdent(plan.table)}`,
      );
      return { ok: true };
    } catch (err) {
      try {
        await this.client.execute(`DROP TABLE IF EXISTS ${quoteIdent(temp)}`);
      } catch {
        /* ignore cleanup */
      }
      return {
        ok: false,
        error: "type_change_failed",
        message:
          err instanceof Error ? err.message : "column type change failed",
      };
    }
  }

  private async openUserTable(
    table: string,
  ): Promise<
    | { ok: true; info: JordTableInfo }
    | { ok: false; error: "invalid_identifier" | "reserved" | "table_not_found"; message: string }
  > {
    if (!isValidSqlIdent(table)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    if (isReservedCreateTableName(table)) {
      return {
        ok: false,
        error: "reserved",
        message: `table ${table} is reserved`,
      };
    }
    const info = await this.describeTable(table);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${table} not found`,
      };
    }
    return { ok: true, info };
  }

  async listBlobBuckets(): Promise<string[]> {
    const rs = await this.client.execute(
      `SELECT DISTINCT bucket FROM jord_blobs ORDER BY bucket ASC`,
    );
    return rs.rows.map((row) => String(row.bucket));
  }

  async listBlobs(bucket: string): Promise<JordBlob[]> {
    const rows = await this.db
      .select()
      .from(jordBlobs)
      .where(eq(jordBlobs.bucket, bucket))
      .orderBy(jordBlobs.key);
    return rows.map(mapBlob);
  }

  async getBlobMeta(bucket: string, key: string): Promise<JordBlob | null> {
    const rows = await this.db
      .select()
      .from(jordBlobs)
      .where(and(eq(jordBlobs.bucket, bucket), eq(jordBlobs.key, key)))
      .limit(1);
    const row = rows[0];
    return row ? mapBlob(row) : null;
  }

  async upsertBlobMeta(input: UpsertBlobMetaInput): Promise<JordBlob> {
    const existing = await this.getBlobMeta(input.bucket, input.key);
    const now = Date.now();
    const status = input.status ?? "ready";
    const pendingExpiresAt =
      input.pendingExpiresAt !== undefined
        ? input.pendingExpiresAt
        : status === "ready"
          ? null
          : (existing?.pendingExpiresAt ?? null);
    const uploadId =
      input.uploadId !== undefined
        ? input.uploadId
        : (existing?.uploadId ?? null);
    if (existing) {
      await this.db
        .update(jordBlobs)
        .set({
          contentType: input.contentType,
          size: input.size,
          etag: input.etag,
          status,
          pendingExpiresAt,
          uploadId,
          updatedAt: now,
        })
        .where(eq(jordBlobs.id, existing.id));
      return {
        ...existing,
        contentType: input.contentType,
        size: input.size,
        etag: input.etag,
        status,
        pendingExpiresAt,
        uploadId,
        updatedAt: now,
      };
    }
    const row = {
      id: randomUUID(),
      bucket: input.bucket,
      key: input.key,
      contentType: input.contentType,
      size: input.size,
      etag: input.etag,
      status,
      pendingExpiresAt,
      uploadId,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordBlobs).values(row);
    return mapBlob(row);
  }

  async deleteBlobMeta(bucket: string, key: string): Promise<boolean> {
    const existing = await this.getBlobMeta(bucket, key);
    if (!existing) return false;
    await this.db.delete(jordBlobs).where(eq(jordBlobs.id, existing.id));
    return true;
  }

  async listExpiredPendingBlobs(nowMs: number): Promise<JordBlob[]> {
    const rows = await this.db
      .select()
      .from(jordBlobs)
      .where(
        and(
          eq(jordBlobs.status, "pending"),
          isNotNull(jordBlobs.pendingExpiresAt),
          lte(jordBlobs.pendingExpiresAt, nowMs),
        ),
      )
      .orderBy(asc(jordBlobs.pendingExpiresAt));
    return rows.map(mapBlob);
  }

  async listAllBlobMeta(): Promise<JordBlob[]> {
    const rows = await this.db
      .select()
      .from(jordBlobs)
      .orderBy(asc(jordBlobs.bucket), asc(jordBlobs.key));
    return rows.map(mapBlob);
  }

  async listVectorNamespaces(): Promise<string[]> {
    const rs = await this.client.execute(
      `SELECT DISTINCT namespace FROM jord_embeddings ORDER BY namespace ASC`,
    );
    return rs.rows.map((row) => String(row.namespace));
  }

  async listEmbeddings(namespace: string): Promise<JordEmbeddingMeta[]> {
    const rows = await this.db
      .select()
      .from(jordEmbeddings)
      .where(eq(jordEmbeddings.namespace, namespace))
      .orderBy(desc(jordEmbeddings.updatedAt));
    return rows.map(mapEmbeddingMeta);
  }

  async getEmbedding(
    namespace: string,
    id: string,
  ): Promise<JordEmbeddingMeta | null> {
    const rows = await this.db
      .select()
      .from(jordEmbeddings)
      .where(
        and(eq(jordEmbeddings.namespace, namespace), eq(jordEmbeddings.id, id)),
      )
      .limit(1);
    const row = rows[0];
    return row ? mapEmbeddingMeta(row) : null;
  }

  async upsertEmbedding(
    input: UpsertEmbeddingInput,
  ): Promise<UpsertEmbeddingResult> {
    if (!isValidVectorNamespace(input.namespace)) {
      return {
        ok: false,
        error: "invalid_namespace",
        message: "namespace must match [a-z0-9][a-z0-9_-]{0,62}",
      };
    }
    const checked = validateEmbeddingArray(input.embedding);
    if (!checked.ok) {
      return { ok: false, error: "invalid_embedding", message: checked.message };
    }
    const dims = checked.values.length;
    const existingNs = await this.listEmbeddings(input.namespace);
    if (existingNs.length > 0 && existingNs[0]!.dims !== dims) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${existingNs[0]!.dims}, got ${dims}`,
      };
    }
    const now = Date.now();
    const blob = packF32(checked.values);
    const existing = await this.getEmbedding(input.namespace, input.id);
    if (existing) {
      await this.db
        .update(jordEmbeddings)
        .set({
          refId: input.refId !== undefined ? input.refId : existing.refId,
          dims,
          embedding: blob,
          metadata:
            input.metadata !== undefined ? input.metadata : existing.metadata,
          updatedAt: now,
        })
        .where(eq(jordEmbeddings.id, input.id));
      await this.tryIndexEmbedding(input.namespace, input.id, blob, dims);
      const row = await this.getEmbedding(input.namespace, input.id);
      return { ok: true, row: row! };
    }
    const row = {
      id: input.id,
      namespace: input.namespace,
      refId: input.refId ?? null,
      dims,
      embedding: blob,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(jordEmbeddings).values(row);
    await this.tryIndexEmbedding(input.namespace, input.id, blob, dims);
    return { ok: true, row: mapEmbeddingMeta(row) };
  }

  async deleteEmbedding(namespace: string, id: string): Promise<boolean> {
    const existing = await this.getEmbedding(namespace, id);
    if (!existing) return false;
    await this.db.delete(jordEmbeddings).where(eq(jordEmbeddings.id, id));
    await this.tryUnindexEmbedding(namespace, id);
    return true;
  }

  async searchVectors(input: SearchVectorsInput): Promise<SearchVectorsResult> {
    if (!isValidVectorNamespace(input.namespace)) {
      return {
        ok: false,
        error: "invalid_namespace",
        message: "namespace must match [a-z0-9][a-z0-9_-]{0,62}",
      };
    }
    const checked = validateEmbeddingArray(input.embedding);
    if (!checked.ok) {
      return { ok: false, error: "invalid_embedding", message: checked.message };
    }
    const sample = await this.client.execute({
      sql: `SELECT dims FROM jord_embeddings WHERE namespace = ? LIMIT 1`,
      args: [input.namespace],
    });
    if (sample.rows.length === 0) {
      return { ok: true, hits: [], backend: this.vectorBackend };
    }
    const dims = Number(sample.rows[0]!.dims);
    if (dims !== checked.values.length) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${dims}, got ${checked.values.length}`,
      };
    }
    if (this.vectorBackend === "libsql-vector") {
      try {
        const hits = await this.searchWithLibsqlVector(
          input.namespace,
          checked.values,
          input.limit,
        );
        return { ok: true, hits, backend: "libsql-vector" };
      } catch {
        // Engine vector SQL failed — rank the stored blobs in process.
      }
    }
    const rows = await this.db
      .select()
      .from(jordEmbeddings)
      .where(eq(jordEmbeddings.namespace, input.namespace));
    const hits = rankByCosine(
      checked.values,
      rows.map((r) => ({
        id: r.id,
        refId: r.refId ?? null,
        dims: r.dims,
        embedding: r.embedding as Buffer,
        metadata: r.metadata ?? null,
      })),
      input.limit,
    );
    return { ok: true, hits, backend: "cosine" };
  }

  private async tryIndexEmbedding(
    namespace: string,
    id: string,
    blob: Buffer,
    dims: number,
  ): Promise<void> {
    if (this.vectorBackend !== "libsql-vector") return;
    try {
      await this.ensureVectorShadow(namespace, dims);
      const table = quoteShadowIdent(shadowTableName(namespace));
      await this.client.execute({
        sql: `INSERT INTO ${table} (id, embedding) VALUES (?, ?)
              ON CONFLICT(id) DO UPDATE SET embedding = excluded.embedding`,
        args: [id, blob],
      });
    } catch {
      // Exact vector_distance_cos on jord_embeddings still ranks the row.
    }
  }

  private async tryUnindexEmbedding(namespace: string, id: string): Promise<void> {
    if (this.vectorBackend !== "libsql-vector") return;
    try {
      const table = quoteShadowIdent(shadowTableName(namespace));
      await this.client.execute({
        sql: `DELETE FROM ${table} WHERE id = ?`,
        args: [id],
      });
    } catch {
      // Shadow table may not exist yet.
    }
  }

  private async ensureVectorShadow(namespace: string, dims: number): Promise<void> {
    await this.client.execute(shadowTableDdl(namespace, dims));
    await this.client.execute(shadowIndexDdl(namespace));
  }

  private async syncVectorShadow(namespace: string, dims: number): Promise<void> {
    await this.ensureVectorShadow(namespace, dims);
    const table = quoteShadowIdent(shadowTableName(namespace));
    await this.client.execute({
      sql: `INSERT INTO ${table} (id, embedding)
            SELECT id, embedding FROM jord_embeddings WHERE namespace = ?
            ON CONFLICT(id) DO UPDATE SET embedding = excluded.embedding`,
      args: [namespace],
    });
    await this.client.execute({
      sql: `DELETE FROM ${table}
            WHERE id NOT IN (
              SELECT id FROM jord_embeddings WHERE namespace = ?
            )`,
      args: [namespace],
    });
  }

  private async searchWithLibsqlVector(
    namespace: string,
    values: number[],
    limit: number | undefined,
  ): Promise<VectorSearchHit[]> {
    const top = clampSearchLimit(limit);
    const countRs = await this.client.execute({
      sql: `SELECT COUNT(*) AS n FROM jord_embeddings WHERE namespace = ?`,
      args: [namespace],
    });
    const rowCount = Number(countRs.rows[0]?.n ?? 0);
    if (rowCount === 0) return [];
    const query = JSON.stringify(values);
    if (useLibsqlAnn(rowCount)) {
      try {
        await this.syncVectorShadow(namespace, values.length);
        const ann = await this.searchLibsqlAnn(namespace, query, top);
        if (ann.length >= Math.min(top, rowCount)) return ann;
      } catch {
        // ANN index missing or stale — exact engine distance below.
      }
    }
    return this.searchLibsqlExact(namespace, query, top);
  }

  private mapVectorHit(row: Record<string, unknown>): VectorSearchHit {
    return {
      id: String(row.id),
      refId: row.ref_id == null ? null : String(row.ref_id),
      score: Number(row.score),
      metadata: row.metadata == null ? null : String(row.metadata),
      dims: Number(row.dims),
    };
  }

  private async searchLibsqlExact(
    namespace: string,
    queryJson: string,
    limit: number,
  ): Promise<VectorSearchHit[]> {
    const rs = await this.client.execute({
      sql: `SELECT id, ref_id, dims, metadata,
              (1.0 - vector_distance_cos(embedding, vector32(?))) AS score
            FROM jord_embeddings
            WHERE namespace = ?
            ORDER BY vector_distance_cos(embedding, vector32(?)) ASC
            LIMIT ?`,
      args: [queryJson, namespace, queryJson, limit],
    });
    return rs.rows.map((row) => this.mapVectorHit(row));
  }

  private async searchLibsqlAnn(
    namespace: string,
    queryJson: string,
    limit: number,
  ): Promise<VectorSearchHit[]> {
    const table = quoteShadowIdent(shadowTableName(namespace));
    const index = shadowIndexName(namespace);
    const rs = await this.client.execute({
      sql: `SELECT e.id AS id, e.ref_id AS ref_id, e.dims AS dims,
              e.metadata AS metadata,
              (1.0 - vector_distance_cos(e.embedding, vector32(?))) AS score
            FROM vector_top_k(?, vector32(?), ?) AS k
            JOIN ${table} AS v ON v.rowid = k.id
            JOIN jord_embeddings AS e ON e.id = v.id
            ORDER BY score DESC`,
      args: [queryJson, index, queryJson, limit],
    });
    return rs.rows.map((row) => this.mapVectorHit(row));
  }

  async snapshotTo(destPath: string): Promise<string> {
    if (this.urlScheme !== "file") {
      throw new JordUnsupportedError("snapshotTo", this.urlScheme);
    }
    const absDest = path.resolve(destPath);
    await mkdir(path.dirname(absDest), { recursive: true });
    // VACUUM INTO is the SQL-facing online backup path for libSQL/SQLite 3.27+.
    const destLiteral = absDest.replace(/\\/g, "/").replace(/'/g, "''");
    await this.client.execute(`VACUUM INTO '${destLiteral}'`);
    return absDest;
  }
}
