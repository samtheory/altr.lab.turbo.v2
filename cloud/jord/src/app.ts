import type {
  JordColumnType,
  JordCustomApi,
  JordDriverPort,
  JordFunction,
  JordHttpMethod,
  JordJob,
  JordJobRun,
  JordRecord,
} from "@altr/jord";
import {
  buildAddColumnSql,
  isJordColumnType,
  isValidSqlIdent,
} from "@altr/jord";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import {
  createAuthMiddleware,
  requireAlterSchema,
  requireInvokeApis,
  requireManageApis,
  requireManageJobs,
  requireWriteRecords,
  type JordAuthConfig,
  type JordAuthVariables,
} from "./auth/index.js";
import {
  buildRecordsResource,
  createGeneratedApiRegistry,
  isGeneratedApiResourceId,
  type GeneratedApiRegistry,
} from "./generated-api/index.js";
import {
  isBuiltinStepKind,
  isCustomApiEnvDisabled,
  isCustomHttpMethod,
  isValidApiSlug,
  parseCustomApiDisabledEnv,
  parseStepsJson,
  runFunction,
} from "./functions/index.js";
import {
  isBuiltinJobKind,
  LogRing,
  MIN_JOB_INTERVAL_MS,
  type JobScheduler,
  type LogSource,
} from "./jobs/index.js";
import type { WriteQueue } from "./queue.js";

export type JordAppDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  auth: JordAuthConfig;
  /** Defaults to env-seeded registry when omitted. */
  generatedApi?: GeneratedApiRegistry;
  logs?: LogRing;
  scheduler?: JobScheduler;
};

function publicRecord(row: JordRecord) {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    version: row.version,
  };
}

function publicJob(row: JordJob) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    enabled: row.enabled,
    interval_ms: row.intervalMs,
    config: row.config,
    next_run_at: row.nextRunAt,
    last_run_at: row.lastRunAt,
    last_status: row.lastStatus,
    last_error: row.lastError,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function publicJobRun(row: JordJobRun) {
  return {
    id: row.id,
    job_id: row.jobId,
    status: row.status,
    started_at: row.startedAt,
    finished_at: row.finishedAt,
    error: row.error,
    result: row.result,
  };
}

function publicFunction(row: JordFunction) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    steps: row.steps,
    enabled: row.enabled,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function publicCustomApi(row: JordCustomApi) {
  return {
    id: row.id,
    name: row.name,
    method: row.method,
    slug: row.slug,
    function_id: row.functionId,
    enabled: row.enabled,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function validateStepsJson(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "steps must be valid JSON";
  }
  if (!Array.isArray(parsed)) return "steps must be a JSON array";
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return "each step must be an object";
    }
    const kind = (item as { kind?: unknown }).kind;
    if (typeof kind !== "string" || !isBuiltinStepKind(kind)) {
      return "each step.kind must be a built-in step kind";
    }
  }
  return null;
}

function requireGeneratedEnabled(
  registry: GeneratedApiRegistry,
  resource: string,
) {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      if (!registry.isEnabled(resource)) {
        return c.json(
          {
            error: "api_disabled",
            resource,
            message: `Generated API resource "${resource}" is disabled`,
          },
          503,
        );
      }
      await next();
    },
  );
}

export function createJordApp(deps: JordAppDeps) {
  const app = new Hono<{ Variables: JordAuthVariables }>();
  const requireAuth = createAuthMiddleware(deps.auth);
  const generatedApi =
    deps.generatedApi ?? createGeneratedApiRegistry(process.env);
  const logs = deps.logs ?? new LogRing();

  app.get("/health", (c) =>
    c.json({ ok: true as const, dialect: "libsql" as const }),
  );

  const protectedRoutes = new Hono<{ Variables: JordAuthVariables }>();
  protectedRoutes.use("*", requireAuth);
  protectedRoutes.use("*", async (c, next) => {
    const started = Date.now();
    await next();
    const path = c.req.path;
    if (path === "/logs") return;
    logs.append({
      level: c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info",
      source: "http",
      message: `${c.req.method} ${path} → ${c.res.status}`,
      meta: {
        method: c.req.method,
        path,
        status: c.res.status,
        ms: Date.now() - started,
      },
    });
  });

  protectedRoutes.get("/apis/generated", (c) => {
    return c.json({
      resources: [buildRecordsResource(generatedApi.isEnabled("records"))],
    });
  });

  protectedRoutes.get("/apis/generated/:resource", (c) => {
    const resource = c.req.param("resource");
    if (!isGeneratedApiResourceId(resource)) {
      throw new HTTPException(404, { message: "resource not found" });
    }
    return c.json(buildRecordsResource(generatedApi.isEnabled(resource)));
  });

  protectedRoutes.patch(
    "/apis/generated/:resource",
    requireManageApis(),
    async (c) => {
      const resource = c.req.param("resource");
      if (!isGeneratedApiResourceId(resource)) {
        throw new HTTPException(404, { message: "resource not found" });
      }
      const body = await c.req.json<{ enabled?: boolean }>();
      if (typeof body.enabled !== "boolean") {
        throw new HTTPException(400, {
          message: "enabled (boolean) is required",
        });
      }
      generatedApi.setEnabled(resource, body.enabled);
      return c.json(buildRecordsResource(generatedApi.isEnabled(resource)));
    },
  );

  protectedRoutes.get("/schema/tables", async (c) => {
    const tables = await deps.jord.listTables();
    return c.json({ tables });
  });

  protectedRoutes.get("/schema/tables/:name", async (c) => {
    const name = c.req.param("name");
    if (!isValidSqlIdent(name)) {
      throw new HTTPException(400, { message: "invalid table name" });
    }
    const info = await deps.jord.describeTable(name);
    if (!info) {
      throw new HTTPException(404, { message: "table not found" });
    }
    return c.json(info);
  });

  protectedRoutes.post(
    "/schema/tables/:name/columns",
    requireAlterSchema(),
    async (c) => {
      const table = c.req.param("name");
      const body = await c.req.json<{ name?: string; type?: string }>();
      if (typeof body.name !== "string" || typeof body.type !== "string") {
        throw new HTTPException(400, {
          message: "name and type (string) are required",
        });
      }
      if (!isJordColumnType(body.type)) {
        throw new HTTPException(400, {
          message: "type must be TEXT, INTEGER, REAL, or BLOB",
        });
      }
      const type = body.type as JordColumnType;
      const preview =
        isValidSqlIdent(table) && isValidSqlIdent(body.name)
          ? buildAddColumnSql(table, body.name, type)
          : null;

      const result = await deps.enqueueWrite(() =>
        deps.jord.addColumn({ table, name: body.name!, type }),
      );

      if (!result.ok) {
        const status =
          result.error === "table_not_found"
            ? 404
            : result.error === "column_exists"
              ? 409
              : 400;
        return c.json(
          { error: result.error, message: result.message, sql: preview },
          status,
        );
      }

      const info = await deps.jord.describeTable(table);
      return c.json({ ok: true as const, sql: preview, table: info }, 201);
    },
  );

  const recordsRoutes = new Hono<{ Variables: JordAuthVariables }>();
  recordsRoutes.use("*", requireGeneratedEnabled(generatedApi, "records"));

  recordsRoutes.post("/", requireWriteRecords(), async (c) => {
    const body = await c.req.json<{
      bucket?: string;
      body?: string;
      metadata?: string | null;
    }>();
    if (!body.bucket || typeof body.body !== "string") {
      throw new HTTPException(400, {
        message: "bucket and body (string) are required",
      });
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.insertRecord({
        bucket: body.bucket!,
        body: body.body!,
        metadata: body.metadata,
      }),
    );
    return c.json(publicRecord(row), 201);
  });

  recordsRoutes.get("/", async (c) => {
    const bucket = c.req.query("bucket");
    if (!bucket) {
      throw new HTTPException(400, { message: "query bucket= is required" });
    }
    const rows = await deps.jord.listRecordsByBucket(bucket);
    return c.json(rows.map(publicRecord));
  });

  recordsRoutes.get("/:id", async (c) => {
    const row = await deps.jord.getRecord(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "record not found" });
    }
    return c.json(publicRecord(row));
  });

  recordsRoutes.patch("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
      version?: number;
      body?: string;
      metadata?: string | null;
      bucket?: string;
    }>();
    if (typeof body.version !== "number") {
      throw new HTTPException(400, {
        message: "version (number) is required",
      });
    }

    const result = await deps.enqueueWrite(() =>
      deps.jord.updateRecord({
        id,
        version: body.version!,
        body: body.body,
        metadata: body.metadata,
        bucket: body.bucket,
      }),
    );

    if (!result.ok) {
      return c.json(
        { error: "version_conflict", message: "stale version" },
        409,
      );
    }
    return c.json(publicRecord(result.record));
  });

  recordsRoutes.delete("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(() => deps.jord.deleteRecord(id));
    if (!deleted) {
      throw new HTTPException(404, { message: "record not found" });
    }
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.route("/records", recordsRoutes);

  protectedRoutes.get("/jobs", async (c) => {
    const jobs = await deps.jord.listJobs();
    return c.json({ jobs: jobs.map(publicJob) });
  });

  protectedRoutes.post("/jobs", requireManageJobs(), async (c) => {
    const body = await c.req.json<{
      name?: string;
      kind?: string;
      enabled?: boolean;
      interval_ms?: number;
      config?: string;
    }>();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "name is required" });
    }
    if (typeof body.kind !== "string" || !isBuiltinJobKind(body.kind)) {
      throw new HTTPException(400, {
        message: "kind must be wal_checkpoint, echo, or records_count",
      });
    }
    if (
      typeof body.interval_ms !== "number" ||
      body.interval_ms < MIN_JOB_INTERVAL_MS
    ) {
      throw new HTTPException(400, {
        message: `interval_ms must be >= ${MIN_JOB_INTERVAL_MS}`,
      });
    }
    const config =
      typeof body.config === "string" && body.config.length > 0
        ? body.config
        : "{}";
    try {
      JSON.parse(config);
    } catch {
      throw new HTTPException(400, { message: "config must be valid JSON" });
    }

    const job = await deps.enqueueWrite(() =>
      deps.jord.insertJob({
        name: body.name!.trim(),
        kind: body.kind!,
        enabled: body.enabled ?? false,
        intervalMs: body.interval_ms!,
        config,
      }),
    );
    return c.json(publicJob(job), 201);
  });

  protectedRoutes.get("/jobs/:id", async (c) => {
    const job = await deps.jord.getJob(c.req.param("id"));
    if (!job) throw new HTTPException(404, { message: "job not found" });
    return c.json(publicJob(job));
  });

  protectedRoutes.patch("/jobs/:id", requireManageJobs(), async (c) => {
    const id = c.req.param("id");
    const existing = await deps.jord.getJob(id);
    if (!existing) throw new HTTPException(404, { message: "job not found" });

    const body = await c.req.json<{
      name?: string;
      kind?: string;
      enabled?: boolean;
      interval_ms?: number;
      config?: string;
    }>();

    if (body.kind !== undefined && !isBuiltinJobKind(body.kind)) {
      throw new HTTPException(400, {
        message: "kind must be wal_checkpoint, echo, or records_count",
      });
    }
    if (
      body.interval_ms !== undefined &&
      (typeof body.interval_ms !== "number" ||
        body.interval_ms < MIN_JOB_INTERVAL_MS)
    ) {
      throw new HTTPException(400, {
        message: `interval_ms must be >= ${MIN_JOB_INTERVAL_MS}`,
      });
    }
    if (body.config !== undefined) {
      try {
        JSON.parse(body.config);
      } catch {
        throw new HTTPException(400, { message: "config must be valid JSON" });
      }
    }

    let nextRunAt: number | null | undefined;
    if (body.enabled === true && !existing.enabled) {
      nextRunAt = Date.now();
    } else if (body.enabled === false) {
      nextRunAt = null;
    }

    const job = await deps.enqueueWrite(() =>
      deps.jord.updateJob({
        id,
        name: body.name,
        kind: body.kind,
        enabled: body.enabled,
        intervalMs: body.interval_ms,
        config: body.config,
        nextRunAt,
      }),
    );
    return c.json(publicJob(job!));
  });

  protectedRoutes.delete("/jobs/:id", requireManageJobs(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(() => deps.jord.deleteJob(id));
    if (!deleted) throw new HTTPException(404, { message: "job not found" });
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.post("/jobs/:id/run", requireManageJobs(), async (c) => {
    if (!deps.scheduler) {
      throw new HTTPException(503, { message: "job scheduler unavailable" });
    }
    const result = await deps.scheduler.runNow(c.req.param("id"));
    if (!result.ok) {
      const status = result.error === "job_not_found" ? 404 : 409;
      return c.json({ error: result.error }, status);
    }
    const job = await deps.jord.getJob(c.req.param("id"));
    return c.json({ ok: true as const, job: job ? publicJob(job) : null });
  });

  protectedRoutes.get("/jobs/:id/runs", async (c) => {
    const id = c.req.param("id");
    const job = await deps.jord.getJob(id);
    if (!job) throw new HTTPException(404, { message: "job not found" });
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    const runs = await deps.jord.listJobRuns(
      id,
      Number.isFinite(limit) ? limit : 50,
    );
    return c.json({ runs: runs.map(publicJobRun) });
  });

  protectedRoutes.get("/logs", (c) => {
    const limitRaw = c.req.query("limit");
    const limit = limitRaw ? Number(limitRaw) : 100;
    const sourceRaw = c.req.query("source");
    const source =
      sourceRaw === "http" || sourceRaw === "job" || sourceRaw === "system"
        ? (sourceRaw as LogSource)
        : undefined;
    return c.json({
      events: logs.list(Number.isFinite(limit) ? limit : 100, source),
    });
  });

  const customApiDisabled = parseCustomApiDisabledEnv(process.env);

  protectedRoutes.get("/functions", async (c) => {
    const rows = await deps.jord.listFunctions();
    return c.json({
      functions: rows.map(publicFunction),
      step_kinds: [
        "echo",
        "records_list",
        "records_get",
        "records_insert",
        "records_count",
      ],
    });
  });

  protectedRoutes.post("/functions", requireManageApis(), async (c) => {
    const body = await c.req.json<{
      name?: string;
      slug?: string;
      description?: string | null;
      steps?: string;
      enabled?: boolean;
    }>();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "name is required" });
    }
    if (typeof body.slug !== "string" || !isValidApiSlug(body.slug)) {
      throw new HTTPException(400, {
        message:
          "slug must match [a-zA-Z][a-zA-Z0-9_-]{0,63} (no slashes)",
      });
    }
    const steps =
      typeof body.steps === "string" && body.steps.length > 0
        ? body.steps
        : "[]";
    const stepsErr = validateStepsJson(steps);
    if (stepsErr) throw new HTTPException(400, { message: stepsErr });
    if (parseStepsJson(steps).length === 0) {
      throw new HTTPException(400, {
        message: "steps must include at least one built-in step",
      });
    }
    const existing = await deps.jord.getFunctionBySlug(body.slug);
    if (existing) {
      throw new HTTPException(409, { message: "slug already exists" });
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.insertFunction({
        name: body.name!.trim(),
        slug: body.slug!,
        description: body.description ?? null,
        steps,
        enabled: body.enabled ?? true,
      }),
    );
    return c.json(publicFunction(row), 201);
  });

  protectedRoutes.get("/functions/:id", async (c) => {
    const row = await deps.jord.getFunction(c.req.param("id"));
    if (!row) throw new HTTPException(404, { message: "function not found" });
    return c.json(publicFunction(row));
  });

  protectedRoutes.patch("/functions/:id", requireManageApis(), async (c) => {
    const id = c.req.param("id");
    const existing = await deps.jord.getFunction(id);
    if (!existing) {
      throw new HTTPException(404, { message: "function not found" });
    }
    const body = await c.req.json<{
      name?: string;
      slug?: string;
      description?: string | null;
      steps?: string;
      enabled?: boolean;
    }>();
    if (body.slug !== undefined && !isValidApiSlug(body.slug)) {
      throw new HTTPException(400, {
        message:
          "slug must match [a-zA-Z][a-zA-Z0-9_-]{0,63} (no slashes)",
      });
    }
    if (body.steps !== undefined) {
      const stepsErr = validateStepsJson(body.steps);
      if (stepsErr) throw new HTTPException(400, { message: stepsErr });
      if (parseStepsJson(body.steps).length === 0) {
        throw new HTTPException(400, {
          message: "steps must include at least one built-in step",
        });
      }
    }
    if (body.slug && body.slug !== existing.slug) {
      const clash = await deps.jord.getFunctionBySlug(body.slug);
      if (clash) {
        throw new HTTPException(409, { message: "slug already exists" });
      }
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.updateFunction({
        id,
        name: body.name,
        slug: body.slug,
        description: body.description,
        steps: body.steps,
        enabled: body.enabled,
      }),
    );
    return c.json(publicFunction(row!));
  });

  protectedRoutes.delete("/functions/:id", requireManageApis(), async (c) => {
    const id = c.req.param("id");
    const result = await deps.enqueueWrite(() => deps.jord.deleteFunction(id));
    if (!result.ok) {
      if (result.error === "not_found") {
        throw new HTTPException(404, { message: "function not found" });
      }
      return c.json(
        {
          error: "has_dependents",
          dependents: result.dependents ?? 0,
          message: "delete or rebind custom APIs first",
        },
        409,
      );
    }
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.post(
    "/functions/:id/invoke",
    requireInvokeApis(),
    async (c) => {
      const id = c.req.param("id");
      const fn = await deps.jord.getFunction(id);
      if (!fn) throw new HTTPException(404, { message: "function not found" });

      let body: unknown = null;
      const contentType = c.req.header("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          body = await c.req.json();
        } catch {
          body = null;
        }
      }

      const query: Record<string, string> = {};
      const url = new URL(c.req.url);
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });

      const run = await runFunction({
        jord: deps.jord,
        fn,
        role: c.get("jordRole"),
        enqueueWrite: deps.enqueueWrite,
        request: {
          method: "POST",
          path: `/functions/${id}/invoke`,
          params: { id },
          query,
          body,
        },
      });

      if (!run.ok) {
        return c.json(
          {
            error: run.error,
            message: run.message,
            stepIndex: run.stepIndex,
            kind: run.kind,
          },
          run.status as 400 | 403 | 404 | 500 | 503,
        );
      }
      return c.json({ ok: true as const, result: run.result, steps_run: run.stepsRun });
    },
  );

  protectedRoutes.get("/custom-apis", async (c) => {
    const rows = await deps.jord.listCustomApis();
    return c.json({ custom_apis: rows.map(publicCustomApi) });
  });

  protectedRoutes.post("/custom-apis", requireManageApis(), async (c) => {
    const body = await c.req.json<{
      name?: string;
      method?: string;
      slug?: string;
      function_id?: string;
      enabled?: boolean;
    }>();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "name is required" });
    }
    if (typeof body.method !== "string" || !isCustomHttpMethod(body.method)) {
      throw new HTTPException(400, {
        message: "method must be GET, POST, PATCH, or DELETE",
      });
    }
    if (typeof body.slug !== "string" || !isValidApiSlug(body.slug)) {
      throw new HTTPException(400, {
        message:
          "slug must match [a-zA-Z][a-zA-Z0-9_-]{0,63} (no slashes)",
      });
    }
    if (typeof body.function_id !== "string") {
      throw new HTTPException(400, { message: "function_id is required" });
    }
    const fn = await deps.jord.getFunction(body.function_id);
    if (!fn) throw new HTTPException(400, { message: "function_id not found" });

    const clash = await deps.jord.getCustomApiByMethodSlug(
      body.method as JordHttpMethod,
      body.slug,
    );
    if (clash) {
      throw new HTTPException(409, {
        message: "method+slug already registered",
      });
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.insertCustomApi({
        name: body.name!.trim(),
        method: body.method as JordHttpMethod,
        slug: body.slug!,
        functionId: body.function_id!,
        enabled: body.enabled ?? true,
      }),
    );
    return c.json(publicCustomApi(row), 201);
  });

  protectedRoutes.get("/custom-apis/:id", async (c) => {
    const row = await deps.jord.getCustomApi(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "custom API not found" });
    }
    return c.json(publicCustomApi(row));
  });

  protectedRoutes.patch("/custom-apis/:id", requireManageApis(), async (c) => {
    const id = c.req.param("id");
    const existing = await deps.jord.getCustomApi(id);
    if (!existing) {
      throw new HTTPException(404, { message: "custom API not found" });
    }
    const body = await c.req.json<{
      name?: string;
      method?: string;
      slug?: string;
      function_id?: string;
      enabled?: boolean;
    }>();
    if (body.method !== undefined && !isCustomHttpMethod(body.method)) {
      throw new HTTPException(400, {
        message: "method must be GET, POST, PATCH, or DELETE",
      });
    }
    if (body.slug !== undefined && !isValidApiSlug(body.slug)) {
      throw new HTTPException(400, {
        message:
          "slug must match [a-zA-Z][a-zA-Z0-9_-]{0,63} (no slashes)",
      });
    }
    if (body.function_id !== undefined) {
      const fn = await deps.jord.getFunction(body.function_id);
      if (!fn) {
        throw new HTTPException(400, { message: "function_id not found" });
      }
    }
    const nextMethod = (body.method ?? existing.method) as JordHttpMethod;
    const nextSlug = body.slug ?? existing.slug;
    if (nextMethod !== existing.method || nextSlug !== existing.slug) {
      const clash = await deps.jord.getCustomApiByMethodSlug(
        nextMethod,
        nextSlug,
      );
      if (clash && clash.id !== id) {
        throw new HTTPException(409, {
          message: "method+slug already registered",
        });
      }
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.updateCustomApi({
        id,
        name: body.name,
        method: body.method as JordHttpMethod | undefined,
        slug: body.slug,
        functionId: body.function_id,
        enabled: body.enabled,
      }),
    );
    return c.json(publicCustomApi(row!));
  });

  protectedRoutes.delete("/custom-apis/:id", requireManageApis(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(() =>
      deps.jord.deleteCustomApi(id),
    );
    if (!deleted) {
      throw new HTTPException(404, { message: "custom API not found" });
    }
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.all("/x/:slug", requireInvokeApis(), async (c) => {
    const slug = c.req.param("slug");
    if (!isValidApiSlug(slug)) {
      throw new HTTPException(404, { message: "custom API not found" });
    }
    const method = c.req.method.toUpperCase();
    if (!isCustomHttpMethod(method)) {
      return c.json({ error: "method_not_allowed" }, 405);
    }

    const api = await deps.jord.getCustomApiByMethodSlug(
      method as JordHttpMethod,
      slug,
    );
    if (!api) {
      // Method exists under another verb?
      const any = (await deps.jord.listCustomApis()).some(
        (row) => row.slug === slug,
      );
      if (any) return c.json({ error: "method_not_allowed" }, 405);
      throw new HTTPException(404, { message: "custom API not found" });
    }

    if (!api.enabled || isCustomApiEnvDisabled(api, customApiDisabled)) {
      return c.json(
        {
          error: "api_disabled",
          kind: "custom",
          id: api.id,
          message: `Custom API "${api.method} /x/${api.slug}" is disabled`,
        },
        503,
      );
    }

    const fn = await deps.jord.getFunction(api.functionId);
    if (!fn) {
      throw new HTTPException(500, {
        message: "custom API function missing",
      });
    }

    let body: unknown = null;
    if (method !== "GET" && method !== "DELETE") {
      const contentType = c.req.header("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          body = await c.req.json();
        } catch {
          body = null;
        }
      }
    }

    const query: Record<string, string> = {};
    const url = new URL(c.req.url);
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });

    const run = await runFunction({
      jord: deps.jord,
      fn,
      role: c.get("jordRole"),
      enqueueWrite: deps.enqueueWrite,
      request: {
        method,
        path: `/x/${slug}`,
        slug,
        params: { slug },
        query,
        body,
      },
    });

    if (!run.ok) {
      return c.json(
        {
          error: run.error,
          message: run.message,
          stepIndex: run.stepIndex,
          kind: run.kind,
        },
        run.status as 400 | 403 | 404 | 500 | 503,
      );
    }
    return c.json({
      ok: true as const,
      custom_api_id: api.id,
      function_id: fn.id,
      result: run.result,
      steps_run: run.stepsRun,
    });
  });

  app.route("/", protectedRoutes);

  return app;
}

export type JordApp = ReturnType<typeof createJordApp>;
