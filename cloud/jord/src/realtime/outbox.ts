import type { JordDriverPort } from "@altr/jord";

import type { JordChangeEvent, JordChangeOp } from "./types.js";
import { CommitWatermark } from "./watermark.js";

export const DEFAULT_RETENTION_DAYS = 7;
export const DEFAULT_RETENTION_ROWS = 100_000;

export type OutboxRow = {
  seq: number;
  tableName: string;
  op: JordChangeOp;
  pk: string;
  oldJson: string | null;
  newJson: string | null;
  actor: string | null;
  ts: number;
};

export type OutboxActor = {
  kind: string;
  uid?: string | null;
  role: string;
};

function ph(dialect: "libsql" | "postgres", n: number): string {
  return dialect === "postgres" ? `$${n}` : "?";
}

function dialectOf(jord: JordDriverPort): "libsql" | "postgres" {
  return jord.dialect === "postgres" ? "postgres" : "libsql";
}

/** Replace BLOB / bytea values with a reference stub before storing JSON. */
export function sanitizeRowForOutbox(
  row: Record<string, unknown> | null | undefined,
  blobColumns: Set<string>,
): Record<string, unknown> | null {
  if (row == null) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (blobColumns.has(key)) {
      out[key] = { $blob: true };
      continue;
    }
    if (
      typeof Buffer !== "undefined" &&
      typeof Buffer.isBuffer === "function" &&
      Buffer.isBuffer(value)
    ) {
      out[key] = { $blob: true };
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function resolveRetention(env: NodeJS.ProcessEnv = process.env): {
  days: number;
  rows: number;
} {
  let days = DEFAULT_RETENTION_DAYS;
  const daysRaw = env.JORD_CHANGES_RETENTION_DAYS?.trim();
  if (daysRaw) {
    const n = Number.parseInt(daysRaw, 10);
    if (Number.isFinite(n) && n > 0) days = n;
  }
  let rows = DEFAULT_RETENTION_ROWS;
  const rowsRaw = env.JORD_CHANGES_RETENTION_ROWS?.trim();
  if (rowsRaw) {
    const n = Number.parseInt(rowsRaw, 10);
    if (Number.isFinite(n) && n > 0) rows = n;
  }
  return { days, rows };
}

export function createOutbox(jord: JordDriverPort) {
  const watermark = new CommitWatermark();
  const dialect = dialectOf(jord);

  async function isTracked(tableName: string): Promise<boolean> {
    const rows = await jord.query(
      `SELECT 1 AS hit FROM jord_tracked_tables WHERE table_name = ${ph(dialect, 1)} LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  }

  async function setTracked(tableName: string, tracked: boolean): Promise<void> {
    if (tracked) {
      await jord.query(
        dialect === "postgres"
          ? `INSERT INTO jord_tracked_tables (table_name, tracked_at) VALUES ($1, $2)
             ON CONFLICT (table_name) DO UPDATE SET tracked_at = EXCLUDED.tracked_at`
          : `INSERT OR REPLACE INTO jord_tracked_tables (table_name, tracked_at) VALUES (?, ?)`,
        [tableName, Date.now()],
      );
      return;
    }
    await jord.query(
      `DELETE FROM jord_tracked_tables WHERE table_name = ${ph(dialect, 1)}`,
      [tableName],
    );
  }

  function mapRow(row: Record<string, unknown>): OutboxRow {
    return {
      seq: Number(row.seq),
      tableName: String(row.table_name),
      op: row.op as JordChangeOp,
      pk: String(row.pk),
      oldJson: row.old_json == null ? null : String(row.old_json),
      newJson: row.new_json == null ? null : String(row.new_json),
      actor: row.actor == null ? null : String(row.actor),
      ts: Number(row.ts),
    };
  }

  async function appendChange(input: {
    tableName: string;
    op: JordChangeOp;
    pk: string;
    oldRow?: Record<string, unknown> | null;
    newRow?: Record<string, unknown> | null;
    blobColumns?: Set<string>;
    actor?: OutboxActor | null;
  }): Promise<OutboxRow | null> {
    if (!(await isTracked(input.tableName))) return null;
    const blobs = input.blobColumns ?? new Set<string>();
    const oldJson = JSON.stringify(
      sanitizeRowForOutbox(input.oldRow ?? null, blobs),
    );
    const newJson = JSON.stringify(
      sanitizeRowForOutbox(input.newRow ?? null, blobs),
    );
    const actor =
      input.actor == null
        ? null
        : JSON.stringify({
            kind: input.actor.kind,
            uid: input.actor.uid ?? null,
            role: input.actor.role,
          });
    const ts = Date.now();
    const sql =
      dialect === "postgres"
        ? `INSERT INTO jord_changes (table_name, op, pk, old_json, new_json, actor, ts)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING seq, table_name, op, pk, old_json, new_json, actor, ts`
        : `INSERT INTO jord_changes (table_name, op, pk, old_json, new_json, actor, ts)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           RETURNING seq, table_name, op, pk, old_json, new_json, actor, ts`;
    const rows = await jord.query(sql, [
      input.tableName,
      input.op,
      input.pk,
      oldJson,
      newJson,
      actor,
      ts,
    ]);
    const mapped = mapRow(rows[0]!);
    watermark.begin(mapped.seq);
    watermark.complete(mapped.seq);
    return mapped;
  }

  /**
   * Allocate a seq for tests that simulate out-of-order Postgres commits.
   * Production API path on libSQL always begin+complete together.
   */
  function watermarkApi(): CommitWatermark {
    return watermark;
  }

  async function getBySeq(seq: number): Promise<OutboxRow | null> {
    const rows = await jord.query(
      `SELECT seq, table_name, op, pk, old_json, new_json, actor, ts
       FROM jord_changes WHERE seq = ${ph(dialect, 1)} LIMIT 1`,
      [seq],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async function minSeq(): Promise<number | null> {
    const rows = await jord.query(
      `SELECT MIN(seq) AS n FROM jord_changes`,
    );
    const n = rows[0]?.n;
    if (n == null) return null;
    return Number(n);
  }

  /**
   * libSQL: the write queue orders commits — readable is MAX(seq).
   * Postgres: withhold seqs above the in-memory watermark (in-flight lower seq).
   */
  async function readableWatermark(): Promise<number> {
    const rows = await jord.query(`SELECT MAX(seq) AS n FROM jord_changes`);
    const dbMax = Number(rows[0]?.n ?? 0);
    if (dialect === "libsql") return dbMax;
    const memory = watermark.get();
    if (memory <= 0) return dbMax;
    return Math.min(memory, dbMax);
  }

  async function listAfter(
    since: number,
    opts?: { table?: string; limit?: number },
  ): Promise<OutboxRow[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 1000);
    const readable = await readableWatermark();
    const args: Array<string | number | null> = [since, readable];
    let sql = `SELECT seq, table_name, op, pk, old_json, new_json, actor, ts
      FROM jord_changes
      WHERE seq > ${ph(dialect, 1)} AND seq <= ${ph(dialect, 2)}`;
    if (opts?.table) {
      args.push(opts.table);
      sql += ` AND table_name = ${ph(dialect, 3)}`;
    }
    args.push(limit);
    sql += ` ORDER BY seq ASC LIMIT ${ph(dialect, args.length)}`;
    const rows = await jord.query(sql, args);
    return rows.map(mapRow);
  }

  async function prune(retention = resolveRetention()): Promise<{
    deleted: number;
  }> {
    const cutoff = Date.now() - retention.days * 24 * 60 * 60 * 1000;
    const before = await jord.query(`SELECT COUNT(*) AS n FROM jord_changes`);
    const countBefore = Number(before[0]?.n ?? 0);

    await jord.query(
      `DELETE FROM jord_changes WHERE ts < ${ph(dialect, 1)}`,
      [cutoff],
    );

    const afterTime = await jord.query(`SELECT COUNT(*) AS n FROM jord_changes`);
    let remaining = Number(afterTime[0]?.n ?? 0);
    if (remaining > retention.rows) {
      const excess = remaining - retention.rows;
      if (dialect === "postgres") {
        await jord.query(
          `DELETE FROM jord_changes WHERE seq IN (
             SELECT seq FROM jord_changes ORDER BY seq ASC LIMIT $1
           )`,
          [excess],
        );
      } else {
        await jord.query(
          `DELETE FROM jord_changes WHERE seq IN (
             SELECT seq FROM jord_changes ORDER BY seq ASC LIMIT ?
           )`,
          [excess],
        );
      }
      remaining = retention.rows;
    }
    return { deleted: Math.max(0, countBefore - remaining) };
  }

  function toEvent(row: OutboxRow): JordChangeEvent {
    let version: number | undefined;
    if (row.newJson) {
      try {
        const parsed = JSON.parse(row.newJson) as { version?: unknown };
        if (typeof parsed.version === "number") version = parsed.version;
      } catch {
        /* ignore */
      }
    }
    return {
      type: "jord.change",
      table: row.tableName,
      op: row.op,
      id: row.pk,
      version,
      at: row.ts,
      dialect: jord.dialect,
      seq: row.seq,
    };
  }

  return {
    isTracked,
    setTracked,
    appendChange,
    getBySeq,
    minSeq,
    listAfter,
    prune,
    toEvent,
    watermark: watermarkApi,
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
