import { randomUUID } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import type { WriteQueue } from "../queue.js";
import type { LogSink } from "../logs/sink.js";

const HISTORY_CAP = 50;

/** B11 engine guard codes (`JordSqlConsoleError.code`), duck-typed. */
const ENGINE_SQL_CODES = new Set([
  "JORD_SQL_MULTI_STATEMENT",
  "JORD_SQL_TX_CONTROL",
  "JORD_SQL_TIMEOUT",
]);

function engineErrorCode(err: unknown): string | null {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && ENGINE_SQL_CODES.has(code) ? code : null;
}

function engineCommitted(err: unknown): boolean {
  return (
    engineErrorCode(err) !== null && (err as { committed?: unknown }).committed === true
  );
}

export function createSqlRoutes(deps: {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  logs: LogSink;
  /**
   * B4: emit one `op: "resync"` per tracked table. Called inside the write
   * queue, after a non-read-only statement succeeds. Never throws.
   */
  resyncTracked?: (principal: Principal) => Promise<void>;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  const history: Array<{
    id: string;
    at: number;
    sql: string;
    readOnly: boolean;
    ok: boolean;
    elapsedMs: number;
  }> = [];

  routes.get("/history", (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    return c.json({ history });
  });

  routes.post("/execute", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: string;
      readOnly?: boolean;
      timeoutMs?: number;
      rowCap?: number;
    };
    const sql = typeof body.sql === "string" ? body.sql.trim() : "";
    if (!sql) throw new HTTPException(400, { message: "sql required" });
    const readOnly = body.readOnly !== false;

    const run = async () =>
      deps.jord.executeSql({
        sql,
        readOnly,
        timeoutMs: body.timeoutMs,
        rowCap: body.rowCap,
      });

    let result;
    let errorText: string | null = null;
    let errorCode: string | null = null;
    let committed = false;
    try {
      result = readOnly
        ? await run()
        : await deps.enqueueWrite(async () => {
            try {
              const value = await run();
              await deps.resyncTracked?.(principal);
              return value;
            } catch (err) {
              // B11: a write that outlived its timeout may still have landed
              // (the engine waits for it to settle before throwing). Resync so
              // live subscribers refetch, still inside the queue slot.
              if (engineCommitted(err)) await deps.resyncTracked?.(principal);
              throw err;
            }
          });
    } catch (err) {
      errorText = err instanceof Error ? err.message : String(err);
      errorCode = engineErrorCode(err);
      committed = !readOnly && engineCommitted(err);
      result = null;
    }

    const ok = result != null;
    const elapsedMs = result?.elapsedMs ?? 0;
    const auditId = randomUUID();
    const at = Date.now();
    history.unshift({
      id: auditId,
      at,
      sql: sql.slice(0, 2_000),
      readOnly,
      ok,
      elapsedMs,
    });
    while (history.length > HISTORY_CAP) history.pop();

    // Audit + log outside the hot write queue (direct query).
    const readOnlyFlag = readOnly ? 1 : 0;
    const okFlag = ok ? 1 : 0;
    await deps.jord
      .query(
        deps.jord.dialect === "postgres"
          ? `INSERT INTO jord_sql_audit (id, at, operator_uid, operator_role, read_only, sql_text, ok, elapsed_ms, row_count, error_text) VALUES ($1,$2,$3,$4,$5::boolean,$6,$7::boolean,$8,$9,$10)`
          : `INSERT INTO jord_sql_audit (id, at, operator_uid, operator_role, read_only, sql_text, ok, elapsed_ms, row_count, error_text) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          auditId,
          at,
          principal.uid ?? null,
          principal.role,
          readOnlyFlag,
          sql.slice(0, 8_000),
          okFlag,
          elapsedMs,
          result?.rowCount ?? null,
          errorText,
        ],
      )
      .catch(() => undefined);

    deps.logs.append({
      level: ok ? "info" : "error",
      source: "system",
      message: ok
        ? `sql ok (${readOnly ? "ro" : "rw"}) ${elapsedMs}ms`
        : `sql failed: ${errorText ?? "error"}`,
      meta: { auditId, readOnly },
    });

    if (!result) {
      return c.json(
        {
          error: errorCode === "JORD_SQL_TIMEOUT" ? "sql_timeout" : "sql_failed",
          message: errorText,
          // B11: true only when the statement's changes landed despite the error.
          committed,
          ...(errorCode ? { code: errorCode } : {}),
        },
        400,
      );
    }
    return c.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: result.truncated,
      elapsedMs: result.elapsedMs,
      readOnly,
      note: readOnly
        ? "Raw SQL bypasses the migration runner."
        : "Raw SQL bypasses the migration runner. Row-level CDC is not captured; every tracked table gets one op:\"resync\" change so live subscribers refetch.",
    });
  });

  return routes;
}
