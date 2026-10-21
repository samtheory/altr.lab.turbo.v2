import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient, type Client } from "@libsql/client";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type {
  AddColumnInput,
  AddColumnResult,
  FinishJobRunInput,
  InsertJobInput,
  InsertJobRunInput,
  InsertRecordInput,
  JordColumnInfo,
  JordDb,
  JordDriverPort,
  JordJob,
  JordJobRun,
  JordJobStatus,
  JordRecord,
  JordTableInfo,
  UpdateJobInput,
  UpdateRecordInput,
  UpdateRecordResult,
} from "../port.js";
import {
  buildAddColumnSql,
  isJordColumnType,
  isValidSqlIdent,
  quoteIdent,
} from "../schema/ddl.js";
import { jordJobRuns, jordJobs } from "../schema/jobs.js";
import { records, schema } from "../schema/records.js";
import { ensureRecordsSchema } from "../schema/migrate.js";
import { fileUrlToFsPath } from "../url.js";

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

  async snapshotTo(destPath: string): Promise<string> {
    const absDest = path.resolve(destPath);
    await mkdir(path.dirname(absDest), { recursive: true });
    // VACUUM INTO is the SQL-facing online backup path for libSQL/SQLite 3.27+.
    const destLiteral = absDest.replace(/\\/g, "/").replace(/'/g, "''");
    await this.client.execute(`VACUUM INTO '${destLiteral}'`);
    return absDest;
  }
}
