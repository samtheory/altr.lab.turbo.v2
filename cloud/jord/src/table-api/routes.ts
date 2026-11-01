import type { JordDriverPort } from "@altr/jord";
import { Hono } from "hono";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import {
  evaluatePolicies,
  patchKeepsScope,
  policiesDisabledFromEnv,
  stampInsertScope,
} from "../policies/evaluate.js";
import type { JordChangeDraft, WriteWithChange } from "../realtime/types.js";
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
  compilePriorSelect,
  compileSelect,
  compileUpdate,
  filtersForWrite,
  scopeFor,
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
  writeChangeAs: (principal: Principal) => WriteWithChange;
  generatedRecordsEnabled: () => boolean;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  /** `?schema=` → validated schema, or a 400 Response. */
  async function resolveSchema(
    c: { req: { query: (name: string) => string | undefined } },
  ): Promise<{ ok: true; schema: string } | { ok: false; response: Response }> {
    const raw = c.req.query("schema");
    const resolved = await deps.jord.resolveSchema(raw === "" ? undefined : raw);
    if (!resolved.ok) {
      return { ok: false, response: jsonError(400, "unknown_schema", resolved.message) };
    }
    return { ok: true, schema: resolved.schema };
  }

  routes.get("/openapi.json", async (c) => {
    const scoped = await resolveSchema(c);
    if (!scoped.ok) return scoped.response;
    const names = (await deps.jord.listTables(scoped.schema)).filter((name) => !RESERVED.test(name));
    const tables = [];
    for (const name of names) {
      const info = await deps.jord.describeTable(name, scoped.schema);
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
      const scoped = await resolveSchema(c);
      if (!scoped.ok) return scoped.response;
      const info = await deps.jord.describeTable(table, scoped.schema);
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
        schema: scoped.schema,
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
      const scope = principal.kind === "service" ? undefined : scopeFor(info, decision.scope);

      if (method === "GET") {
        const compiled = compileSelect(info, parsed, dialect, scope);
        const rows = await deps.jord.query(compiled.sql, compiled.args);
        let count: number | null = null;
        if (parsed.count === "exact") {
          const counted = compileCount(info, parsed.filters, dialect, scope);
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

      let body = method === "DELETE" ? {} : await readBody(c);
      if (scope && method === "POST") {
        const stamped = stampInsertScope(scope.scope, body);
        if (!stamped) return jsonError(403, "policy_denied", "policy denied");
        body = stamped;
      }
      if (scope && method === "PATCH" && !patchKeepsScope(scope.scope, body)) {
        return jsonError(403, "policy_denied", "patch moves the row out of scope");
      }
      const values = coerceBody(info, body);

      const keys = pkColumns(info).map((col) => col.name);
      const blobColumns = info.columns
        .filter((col) => /BLOB|BYTEA/i.test(col.type))
        .map((col) => col.name);
      const op = method === "POST" ? "insert" : method === "PATCH" ? "update" : "delete";
      const run = (compiled: CompiledSql) =>
        deps.writeChangeAs(principal)(
          () => deps.jord.query(compiled.sql, compiled.args),
          (rows): JordChangeDraft[] =>
            rows.map((row) => ({
              table,
              schema: scoped.schema,
              op,
              id: keys.map((key) => String(row[key] ?? "")).join(","),
              oldRow: op === "insert" ? null : op === "delete" ? row : null,
              newRow: op === "delete" ? null : row,
              blobColumns,
            })),
        );

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
      if (method === "PATCH") {
        const prior = compilePriorSelect(info, filters, dialect, parsed.all, scope);
        const bump = hasVersion && typeof body.version === "number";
        let previous: Array<Record<string, unknown>> = [];
        const rows = await deps.writeChangeAs(principal)(
          async () => {
            previous = await deps.jord.query(prior.sql, prior.args);
            if (previous.length === 0) return [];
            const compiled = compileUpdate(
              info,
              values,
              filters,
              dialect,
              bump,
              parsed.all,
              scope,
              { keys, rows: previous },
            );
            return deps.jord.query(compiled.sql, compiled.args);
          },
          (updated) => {
            const oldById = new Map(previous.map((row) => [rowId(keys, row), row]));
            return updated.map((row) => ({
              table,
              schema: scoped.schema,
              op: "update" as const,
              id: rowId(keys, row),
              oldRow: oldById.get(rowId(keys, row)) ?? null,
              newRow: row,
              blobColumns,
            }));
          },
        );
        if (rows.length === 0 && bump) {
          return jsonError(409, "version_conflict", "version did not match");
        }
        return c.json(parsed.representation ? { data: rows } : { ok: true, affected: rows.length });
      }
      const compiled = compileDelete(info, filters, dialect, parsed.all, scope);
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

function rowId(keys: string[], row: Record<string, unknown>): string {
  return keys.map((key) => String(row[key] ?? "")).join(",");
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
