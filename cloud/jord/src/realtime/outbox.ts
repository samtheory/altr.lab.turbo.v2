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

  async function isTracked(
    tableName: string,
    schema: string = jord.defaultSchema,
  ): Promise<boolean> {
    const rows = await jord.query(
      `SELECT 1 AS hit FROM jord_tracked_tables
       WHERE schema_name = ${ph(dialect, 1)} AND table_name = ${ph(dialect, 2)} LIMIT 1`,
      [schema, tableName],
    );
    return rows.length > 0;
  }

  /** Every tracked `(schema, table)`, sorted (resync fan-out). */
  async function listTracked(): Promise<Array<{ schema: string; table: string }>> {
    const rows = await jord.query(
      `SELECT schema_name, table_name FROM jord_tracked_tables
       ORDER BY schema_name ASC, table_name ASC`,
    );
    return rows.map((row) => ({
      schema: String(row.schema_name),
      table: String(row.table_name),
    }));
  }

  async function setTracked(
    tableName: string,
    tracked: boolean,
    schema: string = jord.defaultSchema,
  ): Promise<void> {
    if (tracked) {
      await jord.query(
        dialect === "postgres"
          ? `INSERT INTO jord_tracked_tables (schema_name, table_name, tracked_at) VALUES ($1, $2, $3)
             ON CONFLICT (schema_name, table_name) DO UPDATE SET tracked_at = EXCLUDED.tracked_at`
          : `INSERT OR REPLACE INTO jord_tracked_tables (schema_name, table_name, tracked_at) VALUES (?, ?, ?)`,
        [schema, tableName, Date.now()],
      );
      return;
    }
    await jord.query(
      `DELETE FROM jord_tracked_tables
       WHERE schema_name = ${ph(dialect, 1)} AND table_name = ${ph(dialect, 2)}`,
      [schema, tableName],
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

  /**
   * Insert one outbox row. Call only inside `jord.transaction` (see
   * `writeWithChange` in app.ts); the seq stays in flight until `settle`.
   */
  async function appendChange(input: {
    tableName: string;
    /**
     * Schema of the tracked table; defaults to `jord.defaultSchema`.
     * `jord_changes` itself stays table_name-only (S0049).
     */
    schema?: string;
    op: JordChangeOp;
    pk: string;
    oldRow?: Record<string, unknown> | null;
    newRow?: Record<string, unknown> | null;
    blobColumns?: Set<string>;
    actor?: OutboxActor | null;
  }): Promise<OutboxRow | null> {
    if (!(await isTracked(input.tableName, input.schema))) return null;
    const blobs = input.blobColumns ?? new Set<string>();
    // A table-level resync carries no row: SQL NULL, not the string "null".
    const resync = input.op === "resync";
    const oldJson = resync
      ? null
      : JSON.stringify(sanitizeRowForOutbox(input.oldRow ?? null, blobs));
    const newJson = resync
      ? null
      : JSON.stringify(sanitizeRowForOutbox(input.newRow ?? null, blobs));
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
    return mapped;
  }

  /**
   * Walk `jord_commit_watermark` forward while the next seq is either
   * committed in `jord_changes` or recorded in `jord_changes_abandoned`.
   * Concurrent settlers retry on a lost CAS.
   */
  async function advanceSharedWatermark(): Promise<void> {
    for (;;) {
      const curRows = await jord.query(
        `SELECT seq FROM jord_commit_watermark WHERE id = 1`,
      );
      const cur = Number(curRows[0]?.seq ?? 0);
      const next = cur + 1;
      const hit = await jord.query(
        `SELECT 1 AS ok FROM jord_changes WHERE seq = $1
         UNION ALL
         SELECT 1 FROM jord_changes_abandoned WHERE seq = $1
         LIMIT 1`,
        [next],
      );
      if (hit.length === 0) return;
      const updated = await jord.query(
        `UPDATE jord_commit_watermark SET seq = $1
         WHERE id = 1 AND seq = $2
         RETURNING seq`,
        [next, cur],
      );
      if (updated.length === 0) continue;
    }
  }

  /**
   * After the transaction ends: committed seqs become readable.
   * On Postgres, also advances the shared watermark (and records abandoned
   * BIGSERIAL gaps so other instances do not stall).
   */
  async function settle(seq: number, committed: boolean): Promise<void> {
    if (committed) {
      watermark.complete(seq);
    } else {
      watermark.abandon(seq);
      if (dialect === "postgres") {
        await jord.query(
          `INSERT INTO jord_changes_abandoned (seq, abandoned_at)
           VALUES ($1, $2)
           ON CONFLICT (seq) DO NOTHING`,
          [seq, Date.now()],
        );
      }
    }
    if (dialect === "postgres") await advanceSharedWatermark();
  }

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
   * Highest seq a reader may see.
   * Postgres: shared `jord_commit_watermark`, held below any lower seq still
   * in flight in this process (BIGSERIAL can commit out of order across
   * instances). libSQL: MAX(seq) with the same local in-flight hold.
   */
  async function readableWatermark(): Promise<number> {
    let dbMax: number;
    if (dialect === "postgres") {
      const rows = await jord.query(
        `SELECT seq FROM jord_commit_watermark WHERE id = 1`,
      );
      dbMax = Number(rows[0]?.seq ?? 0);
    } else {
      const rows = await jord.query(`SELECT MAX(seq) AS n FROM jord_changes`);
      dbMax = Number(rows[0]?.n ?? 0);
    }
    if (!watermark.hasInFlight()) return dbMax;
    return Math.min(watermark.get(), dbMax);
  }

  async function listAfter(
    since: number,
    opts?: { table?: string; limit?: number; ignoreWatermark?: boolean },
  ): Promise<OutboxRow[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 1000);
    const readable = opts?.ignoreWatermark
      ? Number(
          (
            await jord.query(`SELECT COALESCE(MAX(seq), 0) AS n FROM jord_changes`)
          )[0]?.n ?? 0,
        )
      : await readableWatermark();
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
    listTracked,
    setTracked,
    appendChange,
    settle,
    readableWatermark,
    getBySeq,
    minSeq,
    listAfter,
    prune,
    toEvent,
    watermark: watermarkApi,
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
