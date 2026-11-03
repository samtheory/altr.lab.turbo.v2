/**
 * S0095 — GET /admin/projects/:id/stats?window=1h|24h|7d  (admin operator only)
 *
 * Read-only aggregate over EXISTING sources (no new telemetry pipeline):
 *  - requests/latency/errors  <- jord_logs rows (source='http'), newest
 *    LOG_ROW_CAP rows in the window via the jord_logs_at_idx (at DESC) index.
 *  - sqlAudit                 <- jord_sql_audit (count + failures, LIMIT-capped)
 *  - queue.depth              <- WriteQueue.pending()
 *  - db                       <- sqlite_master + page_count*page_size (libSQL),
 *                                pg_class.reltuples + pg_database_size (Postgres)
 *  - blobs                    <- jord_blobs SUM(size)/COUNT (capped scan)
 *  - policies                 <- jord_policies count
 *  - jobs.failures            <- jord_job_runs status='error' in window
 *  - realtime                 <- in-process bus counters (stats-counters.ts)
 *
 * Failure policy: every section runs under a timeout (default 2 s). A section
 * that fails/times out becomes `null`, top-level `partial: true` and its name
 * is in `partial_sections`; response stays 200. Only if EVERY DB-backed section
 * fails (database unreachable) the route answers 503
 * `{error:'stats_unavailable', partial:true, partial_sections:[...]}`.
 * A timed-out query is not cancelled at the driver (it finishes in background).
 *
 * Scope: the registry only holds control-plane rows; numbers come from the
 * data plane this server process is attached to. The project in the path must
 * exist and be active (404 unknown, 410 archived) - no other project is read.
 */
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { JordDriverPort } from "@altr/jord";

import type { JordAuthVariables } from "../auth/middleware.js";
import {
  aggregateRequestLogs,
  parseWindow,
  WINDOWS,
  type RequestLogRow,
  type StatsWindow,
} from "../logs/aggregate.js";
import { resolveProjectId } from "./layout.js";
import type { ProjectRegistryDeps } from "./registry.js";
import type { RealtimeCounters } from "./stats-counters.js";

export const STATS_VERSION = 1;
export const LOG_ROW_CAP = 20_000;
export const COUNT_CAP = 100_000;
export const MAX_TABLES = 200;
export const TOP_TABLES = 10;
export const SECTION_TIMEOUT_MS = 2_000;

export type StatsSources = {
  queuePending?: () => number;
  realtime?: RealtimeCounters | null;
  sectionTimeoutMs?: number;
  logRowCap?: number;
  now?: () => number;
};

const SECTIONS = [
  "requests",
  "sqlAudit",
  "queue",
  "db",
  "blobs",
  "policies",
  "jobs",
  "realtime",
] as const;
type Section = (typeof SECTIONS)[number];
const DB_SECTIONS: Section[] = ["requests", "sqlAudit", "db", "blobs", "policies", "jobs"];

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

async function count(
  jord: JordDriverPort,
  from: string,
  where: string,
  args: Array<string | number | null>,
): Promise<number> {
  const rows = await jord.query(
    `SELECT COUNT(*) AS n FROM (SELECT 1 FROM ${from} ${where} LIMIT ${COUNT_CAP + 1}) t`,
    args,
  );
  return Number((rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
}

async function withTimeout<T>(work: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error("section_timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function dbSection(jord: JordDriverPort) {
  if (jord.dialect === "postgres") {
    const tables = (await jord.query(
      `SELECT c.relname AS name, GREATEST(c.reltuples, 0)::bigint AS est
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind = 'r' AND n.nspname = 'public'
       ORDER BY est DESC LIMIT ${MAX_TABLES}`,
    )) as Array<Record<string, unknown>>;
    const size = (await jord.query(
      `SELECT pg_database_size(current_database()) AS bytes`,
    )) as Array<Record<string, unknown>>;
    return {
      tables: tables.length,
      rowsEstimate: tables.reduce((a, r) => a + Number(r.est ?? 0), 0),
      sizeBytes: Number(size[0]?.bytes ?? 0),
      rowsEstimateMethod: "pg_class.reltuples",
      top: tables
        .slice(0, TOP_TABLES)
        .map((r) => ({ name: String(r.name), rows: Number(r.est ?? 0) })),
    };
  }
  const names = (
    (await jord.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT ${MAX_TABLES}`,
    )) as Array<Record<string, unknown>>
  ).map((r) => String(r.name));
  const per: Array<{ name: string; rows: number }> = [];
  for (const name of names) {
    const q = `"${name.replace(/"/g, '""')}"`;
    per.push({ name, rows: await count(jord, q, "", []) });
  }
  const size = (await jord.query(
    `SELECT page_count * page_size AS bytes FROM pragma_page_count(), pragma_page_size()`,
  )) as Array<Record<string, unknown>>;
  return {
    tables: names.length,
    rowsEstimate: per.reduce((a, r) => a + r.rows, 0),
    sizeBytes: Number(size[0]?.bytes ?? 0),
    rowsEstimateMethod: `COUNT capped at ${COUNT_CAP} per table`,
    top: [...per].sort((a, b) => b.rows - a.rows).slice(0, TOP_TABLES),
  };
}

export async function collectProjectStats(
  jord: JordDriverPort,
  window: StatsWindow,
  src: StatsSources = {},
) {
  const now = (src.now ?? Date.now)();
  const since = now - WINDOWS[window].ms;
  const timeout = src.sectionTimeoutMs ?? SECTION_TIMEOUT_MS;
  const cap = src.logRowCap ?? LOG_ROW_CAP;
  const failed: Section[] = [];

  const run = async <T>(name: Section, work: () => Promise<T>): Promise<T | null> => {
    try {
      return await withTimeout(work, timeout);
    } catch {
      failed.push(name);
      return null;
    }
  };

  const [requests, sqlAudit, queue, db, blobs, policies, jobs, realtime] = await Promise.all([
    run("requests", async () => {
      const rows = (await jord.query(
        `SELECT at, meta_json FROM jord_logs WHERE source = 'http' AND at >= ${ph(jord, 1)} ORDER BY at DESC LIMIT ${cap}`,
        [since],
      )) as Array<Record<string, unknown>>;
      const mapped: RequestLogRow[] = rows.map((r) => ({
        at: Number(r.at),
        meta_json: r.meta_json == null ? null : String(r.meta_json),
      }));
      return aggregateRequestLogs(mapped, { now, window, truncated: rows.length >= cap });
    }),
    run("sqlAudit", async () => {
      const failFlag = jord.dialect === "postgres" ? "ok = false" : "ok = 0";
      const w = `WHERE at >= ${ph(jord, 1)}`;
      return {
        total: await count(jord, "jord_sql_audit", w, [since]),
        failures: await count(jord, "jord_sql_audit", `${w} AND ${failFlag}`, [since]),
        capped: COUNT_CAP,
      };
    }),
    run("queue", async () => ({ depth: src.queuePending ? src.queuePending() : 0 })),
    run("db", () => dbSection(jord)),
    run("blobs", async () => {
      const r = (await jord.query(
        `SELECT COALESCE(SUM(size), 0) AS bytes, COUNT(*) AS objects FROM (SELECT size FROM jord_blobs LIMIT ${COUNT_CAP + 1}) t`,
      )) as Array<Record<string, unknown>>;
      return { bytes: Number(r[0]?.bytes ?? 0), objects: Number(r[0]?.objects ?? 0) };
    }),
    run("policies", () => count(jord, "jord_policies", "", [])),
    run("jobs", async () => ({
      failures: await count(
        jord,
        "jord_job_runs",
        `WHERE status = 'error' AND started_at >= ${ph(jord, 1)}`,
        [since],
      ),
    })),
    run("realtime", async () => {
      const rt = src.realtime;
      if (!rt) throw new Error("no_counters");
      return { subscribers: rt.subscribers(), eventsPerMin: rt.eventsPerMin() };
    }),
  ]);

  const partialSections = SECTIONS.filter((s) => failed.includes(s));
  const unreachable = DB_SECTIONS.every((s) => failed.includes(s));
  return {
    unreachable,
    body: {
      version: STATS_VERSION,
      window,
      generated_at: now,
      partial: partialSections.length > 0,
      partial_sections: partialSections,
      requests: requests?.requests ?? null,
      latency: requests?.latency ?? null,
      errors: requests?.errors ?? null,
      sqlAudit,
      queue,
      db,
      blobs,
      policies,
      jobs,
      realtime,
    },
  };
}

const STATS_CACHE_MS = 5_000;

export function createProjectStatsRoutes(
  deps: ProjectRegistryDeps,
  sources: StatsSources = {},
): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  let rtCache: { at: number; pending: Promise<Record<string, unknown>> } | null = null;
  const flight = new Map<string, { at: number; pending: ReturnType<typeof collectProjectStats> }>();
  routes.get("/projects/:id/stats", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    if (!deps.secrets) {
      throw new HTTPException(503, {
        message: "JORD_MASTER_KEY is required for the project registry",
      });
    }
    const window = parseWindow(c.req.query("window"));
    if (!window) return c.json({ error: "invalid_window" }, 400);
    const resolved = await resolveProjectId(deps, c.req.param("id"));
    if (!resolved.ok) {
      return c.json(
        { error: resolved.error, ...(resolved.reason ? { reason: resolved.reason } : {}) },
        resolved.status,
      );
    }
    // Single-flight + short cache per window: repeated dashboard polls (or a hostile caller) must not
    // stack up queries on the one database connection, since section timeouts do not cancel them.
    const hit = flight.get(window);
    let pending: ReturnType<typeof collectProjectStats>;
    if (hit && Date.now() - hit.at < STATS_CACHE_MS) {
      pending = hit.pending;
    } else {
      pending = collectProjectStats(deps.jord, window, sources);
      flight.set(window, { at: Date.now(), pending });
      pending.catch(() => flight.delete(window));
    }
    const { body, unreachable } = await pending;
    if (unreachable) {
      flight.delete(window);
      return c.json(
        { error: "stats_unavailable", partial: true, partial_sections: body.partial_sections },
        503,
      );
    }
    return c.json({ project_id: resolved.id, ...body });
  });
  routes.get("/projects/:id/realtime-stats", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    if (!deps.secrets) {
      throw new HTTPException(503, {
        message: "JORD_MASTER_KEY is required for the project registry",
      });
    }
    const resolved = await resolveProjectId(deps, c.req.param("id"));
    if (!resolved.ok) {
      return c.json(
        { error: resolved.error, ...(resolved.reason ? { reason: resolved.reason } : {}) },
        resolved.status,
      );
    }
    const clock = sources.now ?? Date.now;
    const t = clock();
    if (!rtCache || t - rtCache.at >= REALTIME_STATS_CACHE_MS || t < rtCache.at) {
      const rt = sources.realtime;
      rtCache = {
        at: t,
        pending: Promise.resolve().then(() => {
          const last = rt?.lastEventAt() ?? null;
          return {
            version: STATS_VERSION,
            generated_at: t,
            subscribers: rt?.subscribers() ?? 0,
            eventsPerMin: rt?.eventsPerMin() ?? 0,
            lastEventAt: last,
            lastEventAgeMs: last === null ? null : Math.max(0, t - last),
            tables: rt?.topTables(TOP_TABLES) ?? [],
          };
        }),
      };
    }
    return c.json(await rtCache.pending);
  });
  return routes;
}

const REALTIME_STATS_CACHE_MS = 2_000;

/** OpenAPI path fragment for the live-toggle dashboard counters (S0086). */
export const PROJECT_REALTIME_STATS_OPENAPI = {
  "/admin/projects/{id}/realtime-stats": {
    get: {
      summary: "Realtime counters for the project dashboard (admin operator only, cached 2 s)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description:
            "{version:1, generated_at, subscribers, eventsPerMin, lastEventAt|null, lastEventAgeMs|null, tables:[{table,events}] top 10 over 60 s}",
        },
        "403": { description: "admin operator only" },
        "404": { description: "project_not_found" },
        "410": { description: "project archived" },
      },
    },
  },
} as const;

/** OpenAPI path fragment (admin routes have no spec host today; table-api owns /api/v1/openapi.json). */
export const PROJECT_STATS_OPENAPI = {
  "/admin/projects/{id}/stats": {
    get: {
      summary: "Project dashboard stats (admin operator only)",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "window", in: "query", schema: { enum: ["1h", "24h", "7d"], default: "1h" } },
      ],
      responses: {
        "200": { description: "Versioned stats; sections may be null with partial=true" },
        "400": { description: "invalid_window" },
        "403": { description: "admin operator only" },
        "404": { description: "project_not_found" },
        "503": { description: "stats_unavailable" },
      },
    },
  },
} as const;
