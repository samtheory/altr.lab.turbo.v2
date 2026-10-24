import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient, type Client } from "@libsql/client";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

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
  JordTrigger,
  JordTriggerEvent,
  JordTriggerTiming,
  ListTableRowsInput,
  ListTableRowsResult,
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
  isValidSqlIdent,
  planCreateTable,
  quoteIdent,
  toTableCell,
} from "../schema/ddl.js";
import { jordCustomApis, jordFunctions } from "../schema/functions.js";
import { jordJobRuns, jordJobs } from "../schema/jobs.js";
import { jordPolicies } from "../schema/policies.js";
import { records, schema } from "../schema/records.js";
import { jordTriggers } from "../schema/triggers.js";
import { ensureRecordsSchema } from "../schema/migrate.js";
import { fileUrlToFsPath } from "../url.js";

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

export class LibSqlAdapter implements JordDriverPort {
  readonly dialect = "libsql" as const;
  readonly client: Client;
  readonly db: JordDb;

  private constructor(client: Client) {
    this.client = client;
    this.db = drizzle(client, { schema });
  }

  static async open(fileUrl: string): Promise<LibSqlAdapter> {
    const fsPath = fileUrlToFsPath(fileUrl);
    await mkdir(path.dirname(fsPath), { recursive: true });

    const client = createClient({ url: fileUrl });
    for (const pragma of WAL_PRAGMAS) {
      await client.execute(pragma);
    }
    await ensureRecordsSchema(client);

    return new LibSqlAdapter(client);
  }

  async close(): Promise<void> {
    try {
      await this.client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // Best-effort — still close so Windows can unlock the file.
    }
    this.client.close();
  }

  async checkpointTruncate(): Promise<void> {
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
    const rs = await this.client.execute({
      sql: `SELECT * FROM ${quoteIdent(input.table)} LIMIT ? OFFSET ?`,
      args: [window.limit, window.offset],
    });
    const columns = described.columns.map((col) => col.name);
    const rows = rs.rows.map((row) => {
      const out: Record<string, ReturnType<typeof toTableCell>> = {};
      for (const name of columns) {
        out[name] = toTableCell(row[name]);
      }
      return out;
    });
    return { ok: true, columns, rows, limit: window.limit, offset: window.offset };
  }

  async snapshotTo(destPath: string): Promise<string> {
    const absDest = path.resolve(destPath);
    await mkdir(path.dirname(absDest), { recursive: true });
    // VACUUM INTO is the SQL-facing online backup path for libSQL/SQLite 3.27+.
    const destLiteral = absDest.replace(/\\/g, "/").replace(/'/g, "''");
    await this.client.execute(`VACUUM INTO '${destLiteral}'`);
    return absDest;
  }
}
