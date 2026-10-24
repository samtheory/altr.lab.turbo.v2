import { randomUUID } from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { JordUnsupportedError } from "../errors.js";
import type {
  AddColumnInput,
  AddColumnResult,
  CreateTableInput,
  CreateTableResult,
  DeleteFunctionResult,
  FinishJobRunInput,
  InsertCustomApiInput,
  InsertFunctionInput,
  InsertJobInput,
  InsertJobRunInput,
  InsertPolicyInput,
  InsertRecordInput,
  InsertTriggerInput,
  JordBlob,
  JordColumnInfo,
  JordCustomApi,
  JordDriverPort,
  JordEmbeddingMeta,
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
  JordTrigger,
  JordTriggerEvent,
  JordTriggerTiming,
  ListTableRowsInput,
  ListTableRowsResult,
  SearchVectorsInput,
  SearchVectorsResult,
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
  buildCreateTableSql,
  clampRowWindow,
  isJordColumnType,
  isValidSqlIdent,
  planCreateTable,
  quoteIdent,
  toTableCell,
} from "../schema/ddl.js";
import { ensurePostgresSchema } from "../schema/migrate-postgres.js";
import { packF32, validateEmbeddingArray } from "../vectors/f32.js";
import { isValidVectorNamespace } from "../vectors/names.js";
import { rankByCosine } from "../vectors/search.js";

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.length > 0) return Number(value);
  return 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return num(value);
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function asHttpMethod(value: string): JordHttpMethod {
  if (
    value === "GET" ||
    value === "POST" ||
    value === "PATCH" ||
    value === "DELETE"
  ) {
    return value;
  }
  return "GET";
}

function asPolicyOp(value: string): JordPolicyOperation {
  if (
    value === "select" ||
    value === "insert" ||
    value === "update" ||
    value === "delete"
  ) {
    return value;
  }
  return "select";
}

function asPolicyEffect(value: string): JordPolicyEffect {
  return value === "allow" ? "allow" : "deny";
}

function asTriggerEvent(value: string): JordTriggerEvent {
  if (value === "insert" || value === "update" || value === "delete") {
    return value;
  }
  return "insert";
}

function mapRecord(row: QueryResultRow): JordRecord {
  return {
    id: String(row.id),
    bucket: String(row.bucket),
    body: String(row.body),
    metadata: row.metadata == null ? null : String(row.metadata),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    version: num(row.version),
  };
}

function mapBlob(row: QueryResultRow): JordBlob {
  return {
    id: String(row.id),
    bucket: String(row.bucket),
    key: String(row.key),
    contentType: String(row.content_type),
    size: num(row.size),
    etag: String(row.etag),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapEmbeddingMeta(row: QueryResultRow): JordEmbeddingMeta {
  return {
    id: String(row.id),
    namespace: String(row.namespace),
    refId: row.ref_id == null ? null : String(row.ref_id),
    dims: num(row.dims),
    metadata: row.metadata == null ? null : String(row.metadata),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function asBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from([]);
}

function mapJob(row: QueryResultRow): JordJob {
  const lastStatus = row.last_status;
  const status: JordJobStatus | null =
    lastStatus === "ok" || lastStatus === "error" ? lastStatus : null;
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind),
    enabled: bool(row.enabled),
    intervalMs: num(row.interval_ms),
    config: String(row.config ?? "{}"),
    nextRunAt: numOrNull(row.next_run_at),
    lastRunAt: numOrNull(row.last_run_at),
    lastStatus: status,
    lastError: row.last_error == null ? null : String(row.last_error),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapJobRun(row: QueryResultRow): JordJobRun {
  const status =
    row.status === "running" || row.status === "ok" || row.status === "error"
      ? row.status
      : "error";
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    status,
    startedAt: num(row.started_at),
    finishedAt: numOrNull(row.finished_at),
    error: row.error == null ? null : String(row.error),
    result: row.result == null ? null : String(row.result),
  };
}

function mapFunction(row: QueryResultRow): JordFunction {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description == null ? null : String(row.description),
    steps: String(row.steps ?? "[]"),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapCustomApi(row: QueryResultRow): JordCustomApi {
  return {
    id: String(row.id),
    name: String(row.name),
    method: asHttpMethod(String(row.method)),
    slug: String(row.slug),
    functionId: String(row.function_id),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapPolicy(row: QueryResultRow): JordPolicy {
  return {
    id: String(row.id),
    name: String(row.name),
    tableName: String(row.table_name),
    operation: asPolicyOp(String(row.operation)),
    effect: asPolicyEffect(String(row.effect)),
    rules: String(row.rules ?? "[]"),
    priority: num(row.priority),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapTrigger(row: QueryResultRow): JordTrigger {
  return {
    id: String(row.id),
    name: String(row.name),
    tableName: String(row.table_name),
    timing: (row.timing === "after" ? "after" : "after") as JordTriggerTiming,
    event: asTriggerEvent(String(row.event)),
    actions: String(row.actions ?? "[]"),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

export class PostgresAdapter implements JordDriverPort {
  readonly dialect = "postgres" as const;
  private readonly pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static async open(connectionString: string): Promise<PostgresAdapter> {
    const pool = new Pool({ connectionString });
    try {
      await pool.query("SELECT 1");
      await ensurePostgresSchema(pool);
    } catch (err) {
      await pool.end().catch(() => undefined);
      throw err;
    }
    return new PostgresAdapter(pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async checkpointTruncate(): Promise<void> {
    // Postgres has no SQLite WAL file — intentional no-op.
  }

  async insertRecord(input: InsertRecordInput): Promise<JordRecord> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       RETURNING *`,
      [id, input.bucket, input.body, input.metadata ?? null, now, now],
    );
    return mapRecord(result.rows[0]!);
  }

  async getRecord(id: string): Promise<JordRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM records WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRecord(row) : null;
  }

  async listRecordsByBucket(bucket: string): Promise<JordRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM records WHERE bucket = $1 ORDER BY created_at DESC`,
      [bucket],
    );
    return result.rows.map(mapRecord);
  }

  async updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult> {
    const now = Date.now();
    const sets: string[] = ["version = version + 1", "updated_at = $1"];
    const args: unknown[] = [now];
    let i = 2;
    if (input.body !== undefined) {
      sets.push(`body = $${i++}`);
      args.push(input.body);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${i++}`);
      args.push(input.metadata);
    }
    if (input.bucket !== undefined) {
      sets.push(`bucket = $${i++}`);
      args.push(input.bucket);
    }
    args.push(input.id, input.version);
    const result = await this.pool.query(
      `UPDATE records SET ${sets.join(", ")}
       WHERE id = $${i++} AND version = $${i}
       RETURNING *`,
      args,
    );
    if (result.rowCount === 0) return { ok: false, conflict: true };
    return { ok: true, record: mapRecord(result.rows[0]!) };
  }

  async deleteRecord(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM records WHERE id = $1`, [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async listJobs(): Promise<JordJob[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_jobs ORDER BY created_at DESC`,
    );
    return result.rows.map(mapJob);
  }

  async getJob(id: string): Promise<JordJob | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_jobs WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapJob(row) : null;
  }

  async insertJob(input: InsertJobInput): Promise<JordJob> {
    const now = Date.now();
    const id = randomUUID();
    const enabled = input.enabled ?? false;
    const result = await this.pool.query(
      `INSERT INTO jord_jobs (
         id, name, kind, enabled, interval_ms, config, next_run_at,
         last_run_at, last_status, last_error, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,$8,$9)
       RETURNING *`,
      [
        id,
        input.name,
        input.kind,
        enabled,
        input.intervalMs,
        input.config ?? "{}",
        input.nextRunAt ?? (enabled ? now : null),
        now,
        now,
      ],
    );
    return mapJob(result.rows[0]!);
  }

  async updateJob(input: UpdateJobInput): Promise<JordJob | null> {
    const existing = await this.getJob(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.pool.query(
      `UPDATE jord_jobs SET
         name = $1, kind = $2, enabled = $3, interval_ms = $4, config = $5,
         next_run_at = $6, last_run_at = $7, last_status = $8, last_error = $9,
         updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.kind ?? existing.kind,
        input.enabled ?? existing.enabled,
        input.intervalMs ?? existing.intervalMs,
        input.config ?? existing.config,
        input.nextRunAt !== undefined ? input.nextRunAt : existing.nextRunAt,
        input.lastRunAt !== undefined ? input.lastRunAt : existing.lastRunAt,
        input.lastStatus !== undefined ? input.lastStatus : existing.lastStatus,
        input.lastError !== undefined ? input.lastError : existing.lastError,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapJob(row) : null;
  }

  async deleteJob(id: string): Promise<boolean> {
    await this.pool.query(`DELETE FROM jord_job_runs WHERE job_id = $1`, [id]);
    const result = await this.pool.query(
      `DELETE FROM jord_jobs WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listJobRuns(jobId: string, limit = 50): Promise<JordJobRun[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const result = await this.pool.query(
      `SELECT * FROM jord_job_runs WHERE job_id = $1
       ORDER BY started_at DESC LIMIT $2`,
      [jobId, capped],
    );
    return result.rows.map(mapJobRun);
  }

  async insertJobRun(input: InsertJobRunInput): Promise<JordJobRun> {
    const startedAt = input.startedAt ?? Date.now();
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_job_runs (id, job_id, status, started_at, finished_at, error, result)
       VALUES ($1, $2, 'running', $3, NULL, NULL, NULL)
       RETURNING *`,
      [id, input.jobId, startedAt],
    );
    return mapJobRun(result.rows[0]!);
  }

  async finishJobRun(input: FinishJobRunInput): Promise<JordJobRun | null> {
    const finishedAt = input.finishedAt ?? Date.now();
    const result = await this.pool.query(
      `UPDATE jord_job_runs SET
         status = $1, finished_at = $2, error = $3, result = $4
       WHERE id = $5
       RETURNING *`,
      [
        input.status,
        finishedAt,
        input.error ?? null,
        input.result ?? null,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapJobRun(row) : null;
  }

  async listDueJobs(nowMs: number): Promise<JordJob[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_jobs
       WHERE enabled = TRUE
         AND (next_run_at IS NULL OR next_run_at <= $1)
       ORDER BY next_run_at NULLS FIRST`,
      [nowMs],
    );
    return result.rows.map(mapJob);
  }

  async listFunctions(): Promise<JordFunction[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_functions ORDER BY created_at DESC`,
    );
    return result.rows.map(mapFunction);
  }

  async getFunction(id: string): Promise<JordFunction | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_functions WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async getFunctionBySlug(slug: string): Promise<JordFunction | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_functions WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async insertFunction(input: InsertFunctionInput): Promise<JordFunction> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_functions
         (id, name, slug, description, steps, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        input.name,
        input.slug,
        input.description ?? null,
        input.steps ?? "[]",
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapFunction(result.rows[0]!);
  }

  async updateFunction(
    input: UpdateFunctionInput,
  ): Promise<JordFunction | null> {
    const existing = await this.getFunction(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.pool.query(
      `UPDATE jord_functions SET
         name = $1, slug = $2, description = $3, steps = $4,
         enabled = $5, updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.slug ?? existing.slug,
        input.description !== undefined
          ? input.description
          : existing.description,
        input.steps ?? existing.steps,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async deleteFunction(id: string): Promise<DeleteFunctionResult> {
    const existing = await this.getFunction(id);
    if (!existing) return { ok: false, error: "not_found" };
    const dependents = await this.countCustomApisByFunction(id);
    if (dependents > 0) {
      return { ok: false, error: "has_dependents", dependents };
    }
    const result = await this.pool.query(
      `DELETE FROM jord_functions WHERE id = $1`,
      [id],
    );
    if ((result.rowCount ?? 0) === 0) return { ok: false, error: "not_found" };
    return { ok: true };
  }

  async listCustomApis(): Promise<JordCustomApi[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_custom_apis ORDER BY created_at DESC`,
    );
    return result.rows.map(mapCustomApi);
  }

  async getCustomApi(id: string): Promise<JordCustomApi | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_custom_apis WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async getCustomApiByMethodSlug(
    method: JordHttpMethod,
    slug: string,
  ): Promise<JordCustomApi | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_custom_apis WHERE method = $1 AND slug = $2 LIMIT 1`,
      [method, slug],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async insertCustomApi(input: InsertCustomApiInput): Promise<JordCustomApi> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_custom_apis
         (id, name, method, slug, function_id, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        input.name,
        input.method,
        input.slug,
        input.functionId,
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapCustomApi(result.rows[0]!);
  }

  async updateCustomApi(
    input: UpdateCustomApiInput,
  ): Promise<JordCustomApi | null> {
    const existing = await this.getCustomApi(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.pool.query(
      `UPDATE jord_custom_apis SET
         name = $1, method = $2, slug = $3, function_id = $4,
         enabled = $5, updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.method ?? existing.method,
        input.slug ?? existing.slug,
        input.functionId ?? existing.functionId,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async deleteCustomApi(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM jord_custom_apis WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countCustomApisByFunction(functionId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM jord_custom_apis WHERE function_id = $1`,
      [functionId],
    );
    return num(result.rows[0]?.n);
  }

  async listPolicies(): Promise<JordPolicy[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_policies ORDER BY priority DESC, created_at DESC`,
    );
    return result.rows.map(mapPolicy);
  }

  async getPolicy(id: string): Promise<JordPolicy | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_policies WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapPolicy(row) : null;
  }

  async listPoliciesFor(
    tableName: string,
    operation: JordPolicyOperation,
  ): Promise<JordPolicy[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_policies
       WHERE table_name = $1 AND operation = $2 AND enabled = TRUE`,
      [tableName, operation],
    );
    const mapped = result.rows.map(mapPolicy);
    mapped.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
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
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_policies
         (id, name, table_name, operation, effect, rules, priority, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        id,
        input.name,
        input.tableName,
        input.operation,
        input.effect,
        input.rules ?? "[]",
        input.priority ?? 0,
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapPolicy(result.rows[0]!);
  }

  async updatePolicy(input: UpdatePolicyInput): Promise<JordPolicy | null> {
    const existing = await this.getPolicy(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.pool.query(
      `UPDATE jord_policies SET
         name = $1, table_name = $2, operation = $3, effect = $4,
         rules = $5, priority = $6, enabled = $7, updated_at = $8
       WHERE id = $9
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.tableName ?? existing.tableName,
        input.operation ?? existing.operation,
        input.effect ?? existing.effect,
        input.rules ?? existing.rules,
        input.priority ?? existing.priority,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapPolicy(row) : null;
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM jord_policies WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listTriggers(): Promise<JordTrigger[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_triggers ORDER BY created_at DESC`,
    );
    return result.rows.map(mapTrigger);
  }

  async getTrigger(id: string): Promise<JordTrigger | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_triggers WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapTrigger(row) : null;
  }

  async listTriggersFor(
    tableName: string,
    event: JordTriggerEvent,
  ): Promise<JordTrigger[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_triggers
       WHERE table_name = $1 AND event = $2 AND enabled = TRUE
       ORDER BY created_at DESC`,
      [tableName, event],
    );
    return result.rows.map(mapTrigger);
  }

  async insertTrigger(input: InsertTriggerInput): Promise<JordTrigger> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_triggers
         (id, name, table_name, timing, event, actions, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
        input.name,
        input.tableName,
        input.timing ?? "after",
        input.event,
        input.actions ?? "[]",
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapTrigger(result.rows[0]!);
  }

  async updateTrigger(input: UpdateTriggerInput): Promise<JordTrigger | null> {
    const existing = await this.getTrigger(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.pool.query(
      `UPDATE jord_triggers SET
         name = $1, table_name = $2, timing = $3, event = $4,
         actions = $5, enabled = $6, updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.tableName ?? existing.tableName,
        input.timing ?? existing.timing,
        input.event ?? existing.event,
        input.actions ?? existing.actions,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapTrigger(row) : null;
  }

  async deleteTrigger(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM jord_triggers WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  compileTriggerSql(_def: JordTrigger): string | null {
    return null;
  }

  async listTables(): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT tablename AS name
       FROM pg_catalog.pg_tables
       WHERE schemaname = 'public'
       ORDER BY tablename`,
    );
    return result.rows.map((r) => String(r.name));
  }

  async describeTable(name: string): Promise<JordTableInfo | null> {
    if (!isValidSqlIdent(name)) return null;
    const tables = await this.listTables();
    if (!tables.includes(name)) return null;

    const result = await this.pool.query(
      `SELECT
         a.attname AS name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
         a.attnotnull AS notnull,
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           WHERE c.conrelid = a.attrelid AND a.attnum = ANY (c.conkey) AND c.contype = 'p'
         ) THEN true ELSE false END AS pk,
         pg_get_expr(ad.adbin, ad.adrelid) AS dflt_value
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
       WHERE n.nspname = 'public'
         AND c.relname = $1
         AND a.attnum > 0
         AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [name],
    );

    const columns: JordColumnInfo[] = result.rows.map((r) => ({
      name: String(r.name),
      type: String(r.type ?? ""),
      notnull: bool(r.notnull),
      pk: bool(r.pk),
      dflt_value: r.dflt_value == null ? null : String(r.dflt_value),
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

    const pgType =
      input.type === "TEXT"
        ? "TEXT"
        : input.type === "INTEGER"
          ? "INTEGER"
          : input.type === "REAL"
            ? "DOUBLE PRECISION"
            : "BYTEA";
    await this.pool.query(
      `ALTER TABLE ${quoteIdent(input.table)} ADD COLUMN ${quoteIdent(input.name)} ${pgType}`,
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
    const sql = buildCreateTableSql(plan.name, plan.columns, "postgres");
    await this.pool.query(sql);
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
    const result = await this.pool.query(
      `SELECT * FROM ${quoteIdent(input.table)} LIMIT $1 OFFSET $2`,
      [window.limit, window.offset],
    );
    const columns = described.columns.map((col) => col.name);
    const rows = result.rows.map((row) => {
      const out: Record<string, ReturnType<typeof toTableCell>> = {};
      for (const name of columns) {
        out[name] = toTableCell(row[name]);
      }
      return out;
    });
    return { ok: true, columns, rows, limit: window.limit, offset: window.offset };
  }

  async listBlobBuckets(): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT bucket FROM jord_blobs ORDER BY bucket ASC`,
    );
    return result.rows.map((row) => String(row.bucket));
  }

  async listBlobs(bucket: string): Promise<JordBlob[]> {
    const result = await this.pool.query(
      `SELECT * FROM jord_blobs WHERE bucket = $1 ORDER BY key ASC`,
      [bucket],
    );
    return result.rows.map(mapBlob);
  }

  async getBlobMeta(bucket: string, key: string): Promise<JordBlob | null> {
    const result = await this.pool.query(
      `SELECT * FROM jord_blobs WHERE bucket = $1 AND key = $2 LIMIT 1`,
      [bucket, key],
    );
    const row = result.rows[0];
    return row ? mapBlob(row) : null;
  }

  async upsertBlobMeta(input: UpsertBlobMetaInput): Promise<JordBlob> {
    const existing = await this.getBlobMeta(input.bucket, input.key);
    const now = Date.now();
    if (existing) {
      const result = await this.pool.query(
        `UPDATE jord_blobs SET
           content_type = $1, size = $2, etag = $3, updated_at = $4
         WHERE id = $5
         RETURNING *`,
        [input.contentType, input.size, input.etag, now, existing.id],
      );
      return mapBlob(result.rows[0]!);
    }
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO jord_blobs (
         id, bucket, key, content_type, size, etag, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        input.bucket,
        input.key,
        input.contentType,
        input.size,
        input.etag,
        now,
        now,
      ],
    );
    return mapBlob(result.rows[0]!);
  }

  async deleteBlobMeta(bucket: string, key: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM jord_blobs WHERE bucket = $1 AND key = $2`,
      [bucket, key],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listVectorNamespaces(): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT namespace FROM jord_embeddings ORDER BY namespace ASC`,
    );
    return result.rows.map((row) => String(row.namespace));
  }

  async listEmbeddings(namespace: string): Promise<JordEmbeddingMeta[]> {
    const result = await this.pool.query(
      `SELECT id, namespace, ref_id, dims, metadata, created_at, updated_at
       FROM jord_embeddings WHERE namespace = $1 ORDER BY updated_at DESC`,
      [namespace],
    );
    return result.rows.map(mapEmbeddingMeta);
  }

  async getEmbedding(
    namespace: string,
    id: string,
  ): Promise<JordEmbeddingMeta | null> {
    const result = await this.pool.query(
      `SELECT id, namespace, ref_id, dims, metadata, created_at, updated_at
       FROM jord_embeddings WHERE namespace = $1 AND id = $2 LIMIT 1`,
      [namespace, id],
    );
    const row = result.rows[0];
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
    const sample = await this.listEmbeddings(input.namespace);
    if (sample.length > 0 && sample[0]!.dims !== dims) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${sample[0]!.dims}, got ${dims}`,
      };
    }
    const now = Date.now();
    const blob = packF32(checked.values);
    const existing = await this.getEmbedding(input.namespace, input.id);
    if (existing) {
      const result = await this.pool.query(
        `UPDATE jord_embeddings SET
           ref_id = $1, dims = $2, embedding = $3, metadata = $4, updated_at = $5
         WHERE namespace = $6 AND id = $7
         RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
        [
          input.refId !== undefined ? input.refId : existing.refId,
          dims,
          blob,
          input.metadata !== undefined ? input.metadata : existing.metadata,
          now,
          input.namespace,
          input.id,
        ],
      );
      return { ok: true, row: mapEmbeddingMeta(result.rows[0]!) };
    }
    const result = await this.pool.query(
      `INSERT INTO jord_embeddings (
         id, namespace, ref_id, dims, embedding, metadata, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
      [
        input.id,
        input.namespace,
        input.refId ?? null,
        dims,
        blob,
        input.metadata ?? null,
        now,
        now,
      ],
    );
    return { ok: true, row: mapEmbeddingMeta(result.rows[0]!) };
  }

  async deleteEmbedding(namespace: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM jord_embeddings WHERE namespace = $1 AND id = $2`,
      [namespace, id],
    );
    return (result.rowCount ?? 0) > 0;
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
    const result = await this.pool.query(
      `SELECT id, ref_id, dims, embedding, metadata FROM jord_embeddings WHERE namespace = $1`,
      [input.namespace],
    );
    if (
      result.rows.length > 0 &&
      num(result.rows[0]!.dims) !== checked.values.length
    ) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${num(result.rows[0]!.dims)}, got ${checked.values.length}`,
      };
    }
    const hits = rankByCosine(
      checked.values,
      result.rows.map((r) => ({
        id: String(r.id),
        refId: r.ref_id == null ? null : String(r.ref_id),
        dims: num(r.dims),
        embedding: asBuffer(r.embedding),
        metadata: r.metadata == null ? null : String(r.metadata),
      })),
      input.limit,
    );
    return { ok: true, hits };
  }

  async snapshotTo(_destPath: string): Promise<string> {
    throw new JordUnsupportedError("snapshotTo", this.dialect);
  }
}
