import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createJordClient,
  fileUrlToFsPath,
  mapSqliteTypeToPostgres,
  shouldSkipMigrateTable,
  type JordDriverPort,
  type JordTableInfo,
} from "@altr/jord";

export type MigrateJob = {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: "pending" | "running" | "done" | "error";
  sourceDialect: string;
  targetScheme: string;
  phase: string;
  tables: string[];
  counts: Record<string, { source: number; target: number }> | null;
  errorText: string | null;
};

/** In-memory target URL for active jobs — never returned over HTTP. */
const targetUrls = new Map<string, string>();

function pgPlaceholder(i: number): string {
  return `$${i}`;
}

/** Thrown for a target that must not be used; the route maps it to 400. */
export class MigrateTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrateTargetError";
  }
}

function canonicalFsPath(p: string): string {
  let abs = path.resolve(p);
  try {
    abs = fs.realpathSync.native(abs);
  } catch {
    // Not created yet: compare on the resolved path (parent may still be a link).
    try {
      abs = path.join(fs.realpathSync.native(path.dirname(abs)), path.basename(abs));
    } catch {
      /* keep resolved */
    }
  }
  return process.platform === "win32" || process.platform === "darwin"
    ? abs.toLowerCase()
    : abs;
}

/**
 * True when `targetUrl` resolves to the same database file as the source.
 * Only `file:` sources have a comparable identity here (hosted libSQL URLs are
 * not exposed by the driver; their target is a different connection anyway).
 */
export async function targetIsSource(
  source: JordDriverPort,
  targetUrl: string,
): Promise<boolean> {
  if (!targetUrl.startsWith("file:") || source.urlScheme !== "file") return false;
  const bare = targetUrl.split(/[?#]/)[0]!;
  let targetPath: string;
  try {
    targetPath = fileUrlToFsPath(bare);
  } catch {
    throw new MigrateTargetError("targetUrl is not a valid file: URL");
  }
  const rows = await source.query(`PRAGMA database_list`);
  const main = rows.find((r) => r.name === "main") ?? rows[0];
  const sourcePath = typeof main?.file === "string" ? main.file : "";
  if (!sourcePath) return false;
  return canonicalFsPath(sourcePath) === canonicalFsPath(targetPath);
}

export async function startMigrateJob(input: {
  source: JordDriverPort;
  targetUrl: string;
}): Promise<MigrateJob> {
  if (input.source.dialect !== "libsql") {
    throw new Error("migrate wizard source must be libSQL (file)");
  }
  if (await targetIsSource(input.source, input.targetUrl)) {
    throw new MigrateTargetError("targetUrl must not be this server's own database");
  }
  const tables = (await input.source.listTables()).filter(
    (name) => !shouldSkipMigrateTable(name),
  );
  const id = randomUUID();
  const now = Date.now();
  const job: MigrateJob = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    sourceDialect: input.source.dialect,
    targetScheme: input.targetUrl.startsWith("postgres")
      ? "postgres"
      : input.targetUrl.startsWith("libsql")
        ? "libsql"
        : "file",
    phase: "queued",
    tables,
    counts: null,
    errorText: null,
  };
  targetUrls.set(id, input.targetUrl);
  await persistJob(input.source, job);
  return job;
}

export async function getMigrateJob(
  jord: JordDriverPort,
  id: string,
): Promise<MigrateJob | null> {
  const rows = await jord.query(
    jord.dialect === "postgres"
      ? `SELECT * FROM jord_migrate_jobs WHERE id = $1 LIMIT 1`
      : `SELECT * FROM jord_migrate_jobs WHERE id = ? LIMIT 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return rowToJob(row);
}

export async function runMigrateJob(input: {
  source: JordDriverPort;
  jobId: string;
}): Promise<MigrateJob> {
  const job = await getMigrateJob(input.source, input.jobId);
  if (!job) throw new Error("migrate_job_not_found");

  let target: JordDriverPort | null = null;
  try {
    const targetUrl = targetUrls.get(input.jobId);
    if (!targetUrl) throw new Error("migrate_target_expired");

    job.status = "running";
    job.phase = "copy";
    job.updatedAt = Date.now();
    await persistJob(input.source, job);

    target = await createJordClient({
      url: targetUrl,
      postgresDdl: true,
    });
    const counts: Record<string, { source: number; target: number }> = {};
    for (const table of job.tables) {
      if (shouldSkipMigrateTable(table)) continue;
      const info = await input.source.describeTable(table);
      if (!info) continue;
      await ensureTargetTable(target, info);
      const sourceRows = await input.source.query(
        `SELECT * FROM ${quoteIdent(table)}`,
      );
      await clearTargetTable(target, table);
      for (const row of sourceRows) {
        await insertRow(target, info, row);
      }
      const targetCount = await countRows(target, table);
      counts[table] = { source: sourceRows.length, target: targetCount };
      job.phase = `copied:${table}`;
      job.updatedAt = Date.now();
      await persistJob(input.source, job);
    }
    job.counts = counts;
    job.status = "done";
    job.phase = "verified";
    job.updatedAt = Date.now();
    await persistJob(input.source, job);
    return job;
  } catch (err) {
    job.status = "error";
    job.errorText = err instanceof Error ? err.message : String(err);
    job.updatedAt = Date.now();
    try {
      await persistJob(input.source, job);
    } catch (persistErr) {
      // The caller still logs nothing for a resolved job; surface it here.
      console.error("[@altr/jord-server] migrate job error state not persisted", persistErr);
    }
    return job;
  } finally {
    targetUrls.delete(input.jobId);
    await target?.close().catch(() => undefined);
  }
}

async function ensureTargetTable(
  target: JordDriverPort,
  info: JordTableInfo,
): Promise<void> {
  const existing = await target.describeTable(info.name);
  if (existing) return;
  if (target.dialect === "postgres") {
    const cols = info.columns
      .map((col) => {
        const pgType = mapSqliteTypeToPostgres(col.type);
        const pk = col.pk ? " PRIMARY KEY" : "";
        const nn = col.notnull && !col.pk ? " NOT NULL" : "";
        return `${quoteIdent(col.name)} ${pgType}${pk}${nn}`;
      })
      .join(", ");
    await target.query(`CREATE TABLE IF NOT EXISTS ${quoteIdent(info.name)} (${cols})`);
    return;
  }
  const cols = info.columns
    .map((col) => {
      const pk = col.pk ? " PRIMARY KEY" : "";
      const nn = col.notnull && !col.pk ? " NOT NULL" : "";
      return `${quoteIdent(col.name)} ${col.type}${pk}${nn}`;
    })
    .join(", ");
  await target.query(`CREATE TABLE IF NOT EXISTS ${quoteIdent(info.name)} (${cols})`);
}

async function clearTargetTable(
  target: JordDriverPort,
  table: string,
): Promise<void> {
  await target.query(`DELETE FROM ${quoteIdent(table)}`);
}

async function insertRow(
  target: JordDriverPort,
  info: JordTableInfo,
  row: Record<string, unknown>,
): Promise<void> {
  const cols = info.columns.map((c) => c.name);
  const values = cols.map((name) => {
    const value = row[name];
    if (value == null) return null;
    if (typeof value === "number" || typeof value === "string") return value;
    return String(value);
  });
  if (target.dialect === "postgres") {
    const placeholders = cols.map((_, i) => pgPlaceholder(i + 1)).join(", ");
    await target.query(
      `INSERT INTO ${quoteIdent(info.name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${placeholders})`,
      values,
    );
    return;
  }
  const placeholders = cols.map(() => "?").join(", ");
  await target.query(
    `INSERT INTO ${quoteIdent(info.name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${placeholders})`,
    values,
  );
}

async function countRows(jord: JordDriverPort, table: string): Promise<number> {
  const rows = await jord.query(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`);
  return Number(rows[0]?.n ?? 0);
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function persistJob(jord: JordDriverPort, job: MigrateJob): Promise<void> {
  const existing = await getMigrateJob(jord, job.id);
  const args = [
    job.id,
    job.createdAt,
    job.updatedAt,
    job.status,
    job.sourceDialect,
    job.targetScheme,
    job.phase,
    JSON.stringify(job.tables),
    job.counts ? JSON.stringify(job.counts) : null,
    job.errorText,
  ];
  if (!existing) {
    await jord.query(
      jord.dialect === "postgres"
        ? `INSERT INTO jord_migrate_jobs (id, created_at, updated_at, status, source_dialect, target_scheme, phase, tables_json, counts_json, error_text) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
        : `INSERT INTO jord_migrate_jobs (id, created_at, updated_at, status, source_dialect, target_scheme, phase, tables_json, counts_json, error_text) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args,
    );
    return;
  }
  await jord.query(
    jord.dialect === "postgres"
      ? `UPDATE jord_migrate_jobs SET updated_at=$2, status=$3, phase=$4, tables_json=$5, counts_json=$6, error_text=$7 WHERE id=$1`
      : `UPDATE jord_migrate_jobs SET updated_at=?, status=?, phase=?, tables_json=?, counts_json=?, error_text=? WHERE id=?`,
    jord.dialect === "postgres"
      ? [
          job.id,
          job.updatedAt,
          job.status,
          job.phase,
          JSON.stringify(job.tables),
          job.counts ? JSON.stringify(job.counts) : null,
          job.errorText,
        ]
      : [
          job.updatedAt,
          job.status,
          job.phase,
          JSON.stringify(job.tables),
          job.counts ? JSON.stringify(job.counts) : null,
          job.errorText,
          job.id,
        ],
  );
}

function rowToJob(row: Record<string, unknown>): MigrateJob {
  return {
    id: String(row.id),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    status: row.status as MigrateJob["status"],
    sourceDialect: String(row.source_dialect),
    targetScheme: String(row.target_scheme),
    phase: String(row.phase),
    tables: JSON.parse(String(row.tables_json)) as string[],
    counts: row.counts_json
      ? (JSON.parse(String(row.counts_json)) as MigrateJob["counts"])
      : null,
    errorText: row.error_text == null ? null : String(row.error_text),
  };
}
