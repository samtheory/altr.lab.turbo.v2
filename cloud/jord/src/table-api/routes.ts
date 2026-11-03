import type { JordDriverPort, JordTableInfo } from "@altr/jord";
import { Hono } from "hono";

import type { JordAuthVariables } from "../auth/middleware.js";
import type { JordRole } from "../auth/roles.js";
import type { Principal } from "../auth/principal.js";
import { DEFAULT_MAX_JSON_BYTES } from "../http/body-limit.js";
import type { LogSink } from "../logs/sink.js";
import {
  decideForPrincipal,
  patchKeepsScope,
  stampInsertScope,
} from "../policies/evaluate.js";
import type { JordChangeDraft, WriteWithChange } from "../realtime/types.js";
import {
  fetchEmbeds,
  relationCatalog,
  resolveEmbeds,
  type ResolvedEmbed,
} from "./embeds.js";
import { coerceBody, rowId } from "./body.js";
import { handleBulk } from "./bulk.js";
import { decodeCursor, encodeCursor, keysetOrder } from "./keyset.js";
import { buildOpenApi } from "./openapi.js";
import { parseTableQuery, pkColumns, TableApiError } from "./query.js";
import { handleRpc } from "./rpc.js";
import {
  compileCount,
  compileDelete,
  compileInsert,
  compileKeysetSelect,
  compilePriorSelect,
  compileSelect,
  compileUpdate,
  filtersForWrite,
  scopeFor,
  type CompiledSql,
  type ScopeFor,
} from "./sql.js";

/** Tables the table API never exposes (also the S0077 tester's `table_not_exposed`). */
export const RESERVED = /^(jord_|sqlite_|pg_)/i;

function dialectOf(jord: JordDriverPort): "libsql" | "postgres" {
  return jord.dialect === "postgres" ? "postgres" : "libsql";
}

function jsonError(
  status: number,
  error: string,
  message: string,
  extra?: { field?: string; reason?: string; available?: string[] },
): Response {
  return new Response(
    JSON.stringify({
      error,
      message,
      ...(extra?.field
        ? { field: extra.field, reason: extra.reason ?? message }
        : {}),
      ...(extra?.available ? { available: extra.available } : {}),
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

export function createTableApiRoutes(deps: {
  jord: JordDriverPort;
  writeChangeAs: (principal: Principal) => WriteWithChange;
  generatedRecordsEnabled: () => boolean;
  /** Global JSON body cap (bulk + RPC re-check it on the streamed body). */
  maxJsonBytes?: number;
  /** S0080 RPC wiring (same runner deps as `/x/:slug`). Absent → `/rpc/:fn` is 404. */
  rpc?: {
    enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
    logs?: LogSink;
    stepRole: (principal: Principal) => JordRole;
    /** `JORD_CUSTOM_API_DISABLED` set shared with `/x/:slug`. */
    customApiDisabled?: Set<string>;
  };
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  const maxJsonBytes = deps.maxJsonBytes ?? DEFAULT_MAX_JSON_BYTES;

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

  /** Tables the API exposes by name (same gate as `/:table`). */
  function exposed(name: string): boolean {
    if (RESERVED.test(name) || name === "openapi.json") return false;
    return name !== "records" || deps.generatedRecordsEnabled();
  }

  /**
   * Embed candidates for `root` (S0078): exposed tables of the root schema plus cross-schema FK
   * targets in schemas the API would accept as `?schema=`.
   */
  async function embedCandidates(root: JordTableInfo, schema: string): Promise<JordTableInfo[]> {
    const tables: JordTableInfo[] = [root];
    for (const name of await deps.jord.listTables(schema)) {
      if (name === root.name || !exposed(name)) continue;
      const info = await deps.jord.describeTable(name, schema);
      if (info) tables.push(info);
    }
    for (const fk of root.foreignKeys ?? []) {
      const refSchema = fk.references.schema || schema;
      if (refSchema === schema || !exposed(fk.references.table)) continue;
      if (tables.some((t) => t.name === fk.references.table && t.schema === refSchema)) continue;
      const resolved = await deps.jord.resolveSchema(refSchema);
      if (!resolved.ok) continue;
      const info = await deps.jord.describeTable(fk.references.table, resolved.schema);
      if (info) tables.push(info);
    }
    return tables;
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
    const dialect = dialectOf(deps.jord);
    const exposedTables = tables.filter((t) => exposed(t.name));
    return c.json(
      buildOpenApi(
        tables.map((t) => ({ ...t, relations: relationCatalog(t, exposedTables, dialect) })),
      ),
    );
  });

  // S0080: registered before `/:table/bulk` so `/rpc/bulk` is the RPC `bulk`, never table `rpc`.
  routes.post("/rpc/:fn", (c) =>
    handleRpc(c, {
      jord: deps.jord,
      writeChangeAs: deps.writeChangeAs,
      maxJsonBytes,
      runner: deps.rpc ?? null,
    }),
  );

  routes.post("/:table/bulk", async (c) => {
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
      return await handleBulk(c, {
        jord: deps.jord,
        writeChangeAs: deps.writeChangeAs,
        maxJsonBytes,
        info,
        schema: scoped.schema,
        dialect: dialectOf(deps.jord),
      });
    } catch (err) {
      if (err instanceof TableApiError) {
        return jsonError(err.status, err.code, err.message, {
          field: err.field,
          reason: err.reason,
          available: err.available,
        });
      }
      throw err;
    }
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
      /** The one policy call for this principal; embeds reuse it for their own table (S0078). */
      const decide = (tableName: string, schema: string, op: typeof operation) =>
        decideForPrincipal({ jord: deps.jord, principal, tableName, schema, operation: op });
      const decision = await decide(table, scoped.schema, operation);
      if (!decision.allowed) {
        return jsonError(403, "policy_denied", "policy denied");
      }
      const scope = principal.kind === "service" ? undefined : scopeFor(info, decision.scope);

      const embedSpecs = parsed.embeds ?? [];
      if (embedSpecs.length > 0 && method !== "GET") {
        return jsonError(400, "bad_select", "embeds are only supported on GET");
      }
      const embeds: Array<ResolvedEmbed & { scope?: ScopeFor }> = [];
      if (embedSpecs.length > 0) {
        const rels = relationCatalog(info, await embedCandidates(info, scoped.schema), dialect);
        const rootOutput = parsed.select ?? info.columns.map((col) => col.name);
        const resolved = resolveEmbeds(info, embedSpecs, rels, rootOutput);
        // Each embedded table is authorized exactly like a direct GET of it: deny => 403.
        for (const embed of resolved) {
          const target = embed.relation.target;
          const embedDecision = await decide(target.name, target.schema ?? scoped.schema, "select");
          if (!embedDecision.allowed) {
            return jsonError(403, "policy_denied", `policy denied on embedded ${embed.key}`);
          }
          embeds.push({
            ...embed,
            scope: principal.kind === "service" ? undefined : scopeFor(target, embedDecision.scope),
          });
        }
      }
      const embedLocal = embeds.flatMap((embed) => embed.relation.localColumns);
      /** Attach embeds (one batched statement each) to fetched root rows, then project. */
      const shape = async (
        fetched: Array<Record<string, unknown>>,
        wanted: string[] | null,
      ): Promise<Array<Record<string, unknown>>> => {
        const project = (row: Record<string, unknown>) =>
          wanted ? Object.fromEntries(wanted.map((name) => [name, row[name]])) : row;
        if (embeds.length === 0) return wanted ? fetched.map(project) : fetched;
        const attached = await fetchEmbeds({
          query: (sql, args) => deps.jord.query(sql, args),
          dialect,
          rows: fetched,
          embeds,
        });
        if (attached.truncated.length > 0) {
          c.header("Jord-Embed-Truncated", attached.truncated.join(","));
        }
        return fetched.map((row, i) => ({ ...project(row), ...attached.values[i] }));
      };

      if (method === "GET" && parsed.cursor != null) {
        if (parsed.offset > 0) {
          return jsonError(400, "bad_offset", "offset cannot be combined with cursor");
        }
        const order = keysetOrder(info, parsed);
        const after = parsed.cursor === "" ? null : decodeCursor(info, order, parsed.cursor);
        // Fetch the order columns even when `select` omits them, then strip them again.
        const wanted = parsed.select;
        const fetchParsed = wanted
          ? { ...parsed, select: [...new Set([...wanted, ...order.map((o) => o.column), ...embedLocal])] }
          : parsed;
        const compiled = compileKeysetSelect(info, fetchParsed, dialect, order, after, scope);
        const fetched = await deps.jord.query(compiled.sql, compiled.args);
        const hasMore = fetched.length > parsed.limit;
        const page = hasMore ? fetched.slice(0, parsed.limit) : fetched;
        const next = hasMore ? encodeCursor(info, order, page[page.length - 1]!) : null;
        const rows = await shape(page, wanted);
        let count: number | null = null;
        if (parsed.count === "exact") {
          const counted = compileCount(info, parsed.filters, dialect, scope);
          const countRows = await deps.jord.query(counted.sql, counted.args);
          count = Number(countRows[0]?.n ?? 0);
        }
        if (parsed.count !== "none") {
          c.header("Preference-Applied", parsed.count === "exact" ? "count=exact" : "count=planned");
        }
        return c.json({ data: rows, count, next_cursor: next, has_more: hasMore });
      }

      if (method === "GET") {
        const wanted = parsed.select;
        const fetchParsed =
          wanted && embeds.length > 0
            ? { ...parsed, select: [...new Set([...wanted, ...embedLocal])] }
            : parsed;
        const compiled = compileSelect(info, fetchParsed, dialect, scope);
        const fetched = await deps.jord.query(compiled.sql, compiled.args);
        const rows = embeds.length > 0 ? await shape(fetched, wanted) : fetched;
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
        return jsonError(err.status, err.code, err.message, {
          field: err.field,
          reason: err.reason,
          available: err.available,
        });
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

