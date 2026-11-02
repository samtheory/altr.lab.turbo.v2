import { randomUUID } from "node:crypto";

import type { ExplainPlanNode, JordDriverPort } from "@altr/jord";
import {
  isExplainSql,
  normalizeExplainPlan,
  preferLibsqlQueryPlan,
  preferPostgresJsonExplain,
  sqlErrorPosition,
} from "@altr/jord";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import type { WriteQueue } from "../queue.js";
import type { LogSink } from "../logs/sink.js";
import { withSqlSpan } from "../telemetry/spans.js";
import {
  cancelActiveSqlQuery,
  normalizeSqlQueryId,
  registerActiveSqlQuery,
  unregisterActiveSqlQuery,
} from "./active-queries.js";
import { listSqlHistory } from "./history.js";
import {
  createSavedQuery,
  deleteSavedQuery,
  getSavedQuery,
  listSavedQueries,
  normalizeSavedQueryName,
  normalizeSavedQuerySql,
  updateSavedQuery,
} from "./saved-queries.js";

/** Engine guard codes (`JordSqlConsoleError.code`), duck-typed. */
const ENGINE_SQL_CODES = new Set([
  "JORD_SQL_MULTI_STATEMENT",
  "JORD_SQL_TX_CONTROL",
  "JORD_SQL_TIMEOUT",
  "JORD_SQL_CANCELLED",
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

function requireAdmin(principal: Principal): void {
  if (principal.kind !== "operator" || principal.role !== "admin") {
    throw new HTTPException(403, { message: "admin operator only" });
  }
}

function prepareSql(dialect: JordDriverPort["dialect"], sql: string): string {
  if (!isExplainSql(sql)) return sql;
  return dialect === "postgres"
    ? preferPostgresJsonExplain(sql)
    : preferLibsqlQueryPlan(sql);
}

function buildPlan(
  dialect: JordDriverPort["dialect"],
  sql: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
): ExplainPlanNode | null {
  if (!isExplainSql(sql)) return null;
  return normalizeExplainPlan(dialect === "postgres" ? "postgres" : "libsql", columns, rows);
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

  routes.get("/history", async (c) => {
    requireAdmin(c.get("principal"));
    const q = c.req.query("q") ?? undefined;
    const failedOnly = c.req.query("failed") === "1" || c.req.query("failed") === "true";
    const limitRaw = Number(c.req.query("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
    const history = await listSqlHistory(deps.jord, { q, failedOnly, limit });
    return c.json({ history });
  });

  routes.get("/saved-queries", async (c) => {
    requireAdmin(c.get("principal"));
    const q = c.req.query("q") ?? undefined;
    const queries = await listSavedQueries(deps.jord, { q });
    return c.json({ queries });
  });

  routes.post("/saved-queries", async (c) => {
    const principal = c.get("principal");
    requireAdmin(principal);
    const body = (await c.req.json().catch(() => ({}))) as {
      name?: unknown;
      sql?: unknown;
    };
    const name = normalizeSavedQueryName(body.name);
    const sql = normalizeSavedQuerySql(body.sql);
    if (!name) throw new HTTPException(400, { message: "name required (1–120 chars)" });
    if (!sql) throw new HTTPException(400, { message: "sql required (1–8000 chars)" });

    const saved = await deps.enqueueWrite(
      () =>
        createSavedQuery(deps.jord, {
          name,
          sql,
          ownerUid: principal.uid ?? null,
        }),
      "sql.saved.create",
    );
    return c.json({ query: saved }, 201);
  });

  routes.patch("/saved-queries/:id", async (c) => {
    requireAdmin(c.get("principal"));
    const id = c.req.param("id");
    if (!id) throw new HTTPException(400, { message: "id required" });
    const body = (await c.req.json().catch(() => ({}))) as {
      name?: unknown;
      sql?: unknown;
    };
    const patch: { name?: string; sql?: string } = {};
    if (body.name !== undefined) {
      const name = normalizeSavedQueryName(body.name);
      if (!name) throw new HTTPException(400, { message: "name required (1–120 chars)" });
      patch.name = name;
    }
    if (body.sql !== undefined) {
      const sql = normalizeSavedQuerySql(body.sql);
      if (!sql) throw new HTTPException(400, { message: "sql required (1–8000 chars)" });
      patch.sql = sql;
    }
    if (!patch.name && !patch.sql) {
      throw new HTTPException(400, { message: "name or sql required" });
    }

    const saved = await deps.enqueueWrite(
      () => updateSavedQuery(deps.jord, id, patch),
      "sql.saved.update",
    );
    if (!saved) throw new HTTPException(404, { message: "saved query not found" });
    return c.json({ query: saved });
  });

  routes.delete("/saved-queries/:id", async (c) => {
    requireAdmin(c.get("principal"));
    const id = c.req.param("id");
    if (!id) throw new HTTPException(400, { message: "id required" });
    const ok = await deps.enqueueWrite(
      () => deleteSavedQuery(deps.jord, id),
      "sql.saved.delete",
    );
    if (!ok) throw new HTTPException(404, { message: "saved query not found" });
    return c.json({ ok: true });
  });

  routes.get("/saved-queries/:id", async (c) => {
    requireAdmin(c.get("principal"));
    const id = c.req.param("id");
    if (!id) throw new HTTPException(400, { message: "id required" });
    const saved = await getSavedQuery(deps.jord, id);
    if (!saved) throw new HTTPException(404, { message: "saved query not found" });
    return c.json({ query: saved });
  });

  routes.post("/cancel", async (c) => {
    requireAdmin(c.get("principal"));
    const body = (await c.req.json().catch(() => ({}))) as { id?: unknown };
    const id = normalizeSqlQueryId(body.id);
    if (!id) throw new HTTPException(400, { message: "id required" });
    const cancelled = cancelActiveSqlQuery(id);
    return c.json({ ok: true, cancelled });
  });

  routes.post("/execute", async (c) => {
    const principal = c.get("principal");
    requireAdmin(principal);
    const body = (await c.req.json().catch(() => ({}))) as {
      sql?: string;
      readOnly?: boolean;
      timeoutMs?: number;
      rowCap?: number;
      id?: unknown;
    };
    const sqlRaw = typeof body.sql === "string" ? body.sql.trim() : "";
    if (!sqlRaw) throw new HTTPException(400, { message: "sql required" });
    const readOnly = body.readOnly !== false;
    const queryId = normalizeSqlQueryId(body.id) ?? randomUUID();
    const sql = prepareSql(deps.jord.dialect, sqlRaw);
    const controller = registerActiveSqlQuery(queryId);

    const run = async () =>
      withSqlSpan({ kind: readOnly ? "select" : "execute" }, () =>
        deps.jord.executeSql({
          sql,
          readOnly,
          timeoutMs: body.timeoutMs,
          rowCap: body.rowCap,
          signal: controller.signal,
        }),
      );

    let result;
    let errorText: string | null = null;
    let errorCode: string | null = null;
    let committed = false;
    let position: { line: number; column: number } | null = null;
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
          }, "sql.execute");
    } catch (err) {
      errorText = err instanceof Error ? err.message : String(err);
      errorCode = engineErrorCode(err);
      committed = !readOnly && engineCommitted(err);
      position = sqlErrorPosition(sqlRaw, err);
      result = null;
    } finally {
      unregisterActiveSqlQuery(queryId, controller);
    }

    const ok = result != null;
    const cancelled = errorCode === "JORD_SQL_CANCELLED";
    const elapsedMs = result?.elapsedMs ?? 0;
    const auditId = randomUUID();
    const at = Date.now();

    // Audit + log outside the hot write queue (direct query).
    // Cancelled queries are audited as failed (ok=0) with a cancelled message.
    const readOnlyFlag = readOnly ? 1 : 0;
    const okFlag = ok ? 1 : 0;
    const auditError = cancelled
      ? errorText ?? "Statement was cancelled."
      : errorText;
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
          sqlRaw.slice(0, 8_000),
          okFlag,
          elapsedMs,
          result?.rowCount ?? null,
          auditError,
        ],
      )
      .catch(() => undefined);

    deps.logs.append({
      level: ok ? "info" : "error",
      source: "system",
      message: ok
        ? `sql ok (${readOnly ? "ro" : "rw"}) ${elapsedMs}ms`
        : cancelled
          ? `sql cancelled: ${errorText ?? "cancelled"}`
          : `sql failed: ${errorText ?? "error"}`,
      meta: { auditId, readOnly, queryId, cancelled },
    });

    if (!result) {
      const error =
        errorCode === "JORD_SQL_TIMEOUT"
          ? "sql_timeout"
          : cancelled
            ? "sql_cancelled"
            : "sql_failed";
      return c.json(
        {
          error,
          message: errorText,
          // B11: true only when the statement's changes landed despite the error.
          committed,
          queryId,
          cancelled,
          ...(errorCode ? { code: errorCode } : {}),
          ...(position ? { position } : {}),
        },
        400,
      );
    }

    const plan = buildPlan(deps.jord.dialect, sqlRaw, result.columns, result.rows);
    return c.json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: result.truncated,
      elapsedMs: result.elapsedMs,
      readOnly,
      auditId,
      queryId,
      ...(plan ? { plan } : {}),
      note: readOnly
        ? "Raw SQL bypasses the migration runner. Each statement auto-commits; BEGIN/COMMIT/ROLLBACK are rejected."
        : "Raw SQL bypasses the migration runner. Row-level CDC is not captured; every tracked table gets one op:\"resync\" change so live subscribers refetch. Each statement auto-commits; BEGIN/COMMIT/ROLLBACK are rejected.",
    });
  });

  return routes;
}
