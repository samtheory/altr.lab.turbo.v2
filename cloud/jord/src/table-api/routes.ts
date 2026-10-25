import type { JordDriverPort } from "@altr/jord";
import { Hono } from "hono";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { WriteQueue } from "../queue.js";
import { evaluatePolicies, policiesDisabledFromEnv } from "../policies/evaluate.js";
import { buildOpenApi } from "./openapi.js";
import {
  coerceColumnValue,
  parseTableQuery,
  pkColumns,
  TableApiError,
  type SqlValue,
} from "./query.js";
import {
  compileCount,
  compileDelete,
  compileInsert,
  compileSelect,
  compileUpdate,
  filtersForWrite,
  type CompiledSql,
} from "./sql.js";

const RESERVED = /^(jord_|sqlite_|pg_)/i;

function dialectOf(jord: JordDriverPort): "libsql" | "postgres" {
  return jord.dialect === "postgres" ? "postgres" : "libsql";
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function createTableApiRoutes(deps: {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  generatedRecordsEnabled: () => boolean;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.get("/openapi.json", async (c) => {
    const names = (await deps.jord.listTables()).filter((name) => !RESERVED.test(name));
    const tables = [];
    for (const name of names) {
      const info = await deps.jord.describeTable(name);
      if (info) tables.push(info);
    }
    return c.json(buildOpenApi(tables));
  });

  routes.all("/:table", async (c) => {
    const method = c.req.method.toUpperCase();
    if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
      return c.json({ error: "method_not_allowed" }, 405);
    }
    try {
      const table = c.req.param("table");
      if (!table || RESERVED.test(table) || table === "openapi.json") {
        return jsonError(404, "not_found", "table not found");
      }
      if (table === "records" && !deps.generatedRecordsEnabled()) {
        return c.json({ error: "api_disabled", resource: "records" }, 503);
      }
      const info = await deps.jord.describeTable(table);
      if (!info) return jsonError(404, "not_found", "table not found");

      const url = new URL(c.req.url);
      const parsed = parseTableQuery(info, url.searchParams, c.req.header("prefer"));
      const principal = c.get("principal");
      const dialect = dialectOf(deps.jord);

      if ((method === "PATCH" || method === "DELETE") && pkColumns(info).length === 0) {
        return jsonError(400, "no_key", "table has no stable key");
      }
      if ((method === "PATCH" || method === "DELETE") && parsed.all && principal.kind !== "service") {
        return jsonError(403, "forbidden_all", "all=true is service only");
      }
      if ((method === "PATCH" || method === "DELETE") && !parsed.all && parsed.filters.length === 0 && parsed.pk.length === 0) {
        return jsonError(400, "filter_required", "PATCH and DELETE require a filter");
      }
      if ((method === "PATCH" || method === "DELETE") && pkColumns(info).length === 0 && parsed.pk.length > 0) {
        return jsonError(400, "no_key", "table has no stable key");
      }

      const operation =
        method === "GET" ? "select" : method === "POST" ? "insert" : method === "PATCH" ? "update" : "delete";
      const decision = await evaluatePolicies({
        jord: deps.jord,
        tableName: table,
        operation,
        role: principal.role,
        subject: principal.kind,
        uid: principal.uid ?? null,
        claims: principal.claims,
        bypass: principal.kind === "service" || policiesDisabledFromEnv(),
      });
      if (!decision.allowed) {
        return jsonError(403, "policy_denied", "policy denied");
      }

      if (method === "GET") {
        const compiled = compileSelect(info, parsed, dialect);
        const rows = await deps.jord.query(compiled.sql, compiled.args);
        let count: number | null = null;
        if (parsed.count === "exact") {
          const counted = compileCount(info, parsed.filters, dialect);
          const countRows = await deps.jord.query(counted.sql, counted.args);
          count = Number(countRows[0]?.n ?? 0);
        }
        if (parsed.count !== "none") {
          c.header(
            "Preference-Applied",
            parsed.count === "exact" ? "count=exact" : "count=planned",
          );
        }
        return c.json({ data: rows, count });
      }

      const body = method === "DELETE" ? {} : await readBody(c);
      if (decision.constraint?.ownerColumn && principal.uid && principal.kind !== "service") {
        body[decision.constraint.ownerColumn] = principal.uid;
      }
      const values = coerceBody(info, body);

      const run = (compiled: CompiledSql) =>
        deps.enqueueWrite(() => deps.jord.query(compiled.sql, compiled.args));

      if (method === "POST") {
        const rows = await run(compileInsert(info, values, dialect));
        return c.json(
          parsed.representation ? { data: rows[0] ?? null } : { ok: true },
          201,
        );
      }

      const filters = filtersForWrite(info, parsed);
      if (parsed.all) {
        filters.length = 0;
      }
      const hasVersion = info.columns.some((col) => col.name === "version");
      if (hasVersion && typeof body.version === "number") {
        filters.push({ column: "version", op: "eq", values: [body.version] });
      }
      const compiled =
        method === "PATCH"
          ? compileUpdate(
              info,
              values,
              filters,
              dialect,
              hasVersion && typeof body.version === "number",
              parsed.all,
            )
          : compileDelete(info, filters, dialect, parsed.all);
      const rows = await run(compiled);
      if (rows.length === 0 && hasVersion && typeof body.version === "number") {
        return jsonError(409, "version_conflict", "version did not match");
      }
      return c.json(parsed.representation ? { data: rows } : { ok: true, affected: rows.length });
    } catch (err) {
      if (err instanceof TableApiError) {
        return jsonError(err.status, err.code, err.message);
      }
      throw err;
    }
  });

  return routes;
}

async function readBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  const raw: unknown = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TableApiError(400, "bad_body", "JSON object is required");
  }
  return raw as Record<string, unknown>;
}

function coerceBody(
  info: { columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean; dflt_value: string | null }> },
  body: Record<string, unknown>,
): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(body)) {
    const col = info.columns.find((item) => item.name === key);
    if (!col) throw new TableApiError(400, "bad_column", `unknown column ${key}`);
    if (value == null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "number") {
      out[key] = coerceColumnValue(col, String(value));
      continue;
    }
    if (typeof value === "string") {
      out[key] = coerceColumnValue(col, value);
      continue;
    }
    throw new TableApiError(400, "bad_value", `${key} must be a scalar`);
  }
  return out;
}
