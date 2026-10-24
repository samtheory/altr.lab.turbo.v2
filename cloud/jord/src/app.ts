import type {
  JordColumnType,
  JordCustomApi,
  JordDriverPort,
  JordFunction,
  JordHttpMethod,
  JordJob,
  JordJobRun,
  JordPolicy,
  JordPolicyEffect,
  JordPolicyOperation,
  JordRecord,
  JordTrigger,
  JordTriggerEvent,
} from "@altr/jord";
import {
  buildAddColumnSql,
  isJordColumnType,
  isValidSqlIdent,
} from "@altr/jord";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";

import {
  createAuthMiddleware,
  requireAlterSchema,
  requireInvokeApis,
  requireManageApis,
  requireManageJobs,
  requireSubscribeRealtime,
  requireWriteRecords,
  requireWriteTableRows,
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
import {
  evaluatePolicies,
  isBuiltinPolicyRuleKind,
  policiesDisabledFromEnv,
} from "./policies/index.js";
import {
  createBlobDiskStore,
  registerBlobRoutes,
  resolveBlobsRoot,
} from "./blobs/index.js";
import type { WriteQueue } from "./queue.js";
import { registerVectorRoutes } from "./vectors/index.js";
import {
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  REALTIME_V1_TABLE,
  RealtimeBus,
  type JordChangeDraft,
} from "./realtime/index.js";
import {
  isBuiltinTriggerActionKind,
  parseActionsJson,
  runTriggersAfterWrite,
  triggersDisabledFromEnv,
} from "./triggers/index.js";

const POLICY_OPS = new Set<JordPolicyOperation>([
  "select",
  "insert",
  "update",
  "delete",
]);
const POLICY_EFFECTS = new Set<JordPolicyEffect>(["allow", "deny"]);
const TRIGGER_EVENTS = new Set<JordTriggerEvent>([
  "insert",
  "update",
  "delete",
]);
const V1_TABLE = "records";

export type JordAppDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  auth: JordAuthConfig;
  /** Defaults to env-seeded registry when omitted. */
  generatedApi?: GeneratedApiRegistry;
  logs?: LogRing;
  scheduler?: JobScheduler;
  /** In-process change fanout. Created when omitted. */
  realtime?: RealtimeBus;
  /** Absolute or relative blob disk root. Defaults to data/blobs or JORD_BLOBS_ROOT. */
  blobsRoot?: string;
  /** Max upload bytes (default 10 MiB). */
  maxBlobBytes?: number;
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

function publicPolicy(row: JordPolicy) {
  return {
    id: row.id,
    name: row.name,
    table_name: row.tableName,
    operation: row.operation,
    effect: row.effect,
    rules: row.rules,
    priority: row.priority,
    enabled: row.enabled,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function publicTrigger(row: JordTrigger) {
  return {
    id: row.id,
    name: row.name,
    table_name: row.tableName,
    timing: row.timing,
    event: row.event,
    actions: row.actions,
    enabled: row.enabled,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function policyDeniedBody(policy: JordPolicy, operation: JordPolicyOperation) {
  return {
    error: "policy_denied" as const,
    policyId: policy.id,
    table: policy.tableName,
    operation,
  };
}

function validateRulesJson(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "rules must be valid JSON";
  }
  if (!Array.isArray(parsed)) return "rules must be a JSON array";
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return "each rule must be an object";
    }
    const kind = (item as { kind?: unknown }).kind;
    if (typeof kind !== "string" || !isBuiltinPolicyRuleKind(kind)) {
      return "each rule.kind must be a built-in policy rule kind";
    }
  }
  return null;
}

function validateActionsJson(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "actions must be valid JSON";
  }
  if (!Array.isArray(parsed)) return "actions must be a JSON array";
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return "each action must be an object";
    }
    const kind = (item as { kind?: unknown }).kind;
    if (typeof kind !== "string" || !isBuiltinTriggerActionKind(kind)) {
      return "each action.kind must be a built-in trigger action kind";
    }
  }
  return null;
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

function tableRowStatus(error: string): 400 | 404 | 409 {
  if (error === "pk_exists") return 409;
  if (error === "table_not_found" || error === "not_found") return 404;
  return 400;
}

function schemaDdlStatus(error: string): 400 | 404 | 409 {
  if (error === "table_exists" || error === "column_exists") return 409;
  if (error === "table_not_found" || error === "column_not_found") return 404;
  return 400;
}

export function createJordApp(deps: JordAppDeps) {
  const app = new Hono<{ Variables: JordAuthVariables }>();
  const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
  const requireAuth = createAuthMiddleware(deps.auth);
  const generatedApi =
    deps.generatedApi ?? createGeneratedApiRegistry(process.env);
  const logs = deps.logs ?? new LogRing();
  const realtime = deps.realtime ?? new RealtimeBus();

  function publishChange(draft: JordChangeDraft): void {
    try {
      realtime.publish({
        type: "jord.change",
        table: draft.table ?? REALTIME_V1_TABLE,
        op: draft.op,
        id: draft.id,
        version: draft.version,
        at: Date.now(),
        dialect: deps.jord.dialect,
      });
    } catch (err) {
      console.error("[@altr/jord-server] realtime publish failed", err);
    }
  }

  /** @deprecated alias — records emit sites */
  const publishRecordChange = publishChange;

  app.get("/health", (c) =>
    c.json({
      ok: true as const,
      dialect: deps.jord.dialect,
      urlScheme: deps.jord.urlScheme,
    }),
  );

  const protectedRoutes = new Hono<{ Variables: JordAuthVariables }>();
  protectedRoutes.use("*", requireAuth);
  protectedRoutes.use("*", async (c, next) => {
    deps.jord.bindRlsSession?.({
      role: c.get("jordRole"),
      bucket: c.req.query("bucket") ?? "",
    });
    await next();
  });
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

  protectedRoutes.post("/schema/tables", requireAlterSchema(), async (c) => {
    const body = await c.req.json<{
      name?: unknown;
      columns?: unknown;
    }>();
    if (typeof body.name !== "string" || !Array.isArray(body.columns)) {
      throw new HTTPException(400, {
        message: "name (string) and columns (array) are required",
      });
    }
    const columns: Array<{
      name: string;
      type: JordColumnType;
      pk?: boolean;
    }> = [];
    for (const raw of body.columns) {
      if (!raw || typeof raw !== "object") {
        throw new HTTPException(400, {
          message: "each column needs name and type",
        });
      }
      const col = raw as { name?: unknown; type?: unknown; pk?: unknown };
      if (typeof col.name !== "string" || typeof col.type !== "string") {
        throw new HTTPException(400, {
          message: "each column needs name and type",
        });
      }
      if (!isJordColumnType(col.type)) {
        throw new HTTPException(400, {
          message: "type must be TEXT, INTEGER, REAL, or BLOB",
        });
      }
      columns.push({
        name: col.name,
        type: col.type,
        pk: col.pk === true,
      });
    }

    const result = await deps.enqueueWrite(() =>
      deps.jord.createTable({ name: body.name as string, columns }),
    );
    if (!result.ok) {
      const status = result.error === "table_exists" ? 409 : 400;
      return c.json(
        { error: result.error, message: result.message },
        status,
      );
    }
    const info = await deps.jord.describeTable(body.name);
    return c.json({ ok: true as const, sql: result.sql, table: info }, 201);
  });

  protectedRoutes.get("/schema/tables/:name/rows", async (c) => {
    const name = c.req.param("name");
    const limit = Number(c.req.query("limit") ?? "50");
    const offset = Number(c.req.query("offset") ?? "0");
    const result = await deps.jord.listTableRows({
      table: name,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    if (!result.ok) {
      const status = result.error === "table_not_found" ? 404 : 400;
      return c.json(
        { error: result.error, message: result.message },
        status,
      );
    }
    return c.json(result);
  });

  protectedRoutes.post(
    "/schema/tables/:name/rows",
    requireWriteTableRows(),
    async (c) => {
      const name = c.req.param("name");
      const body = (await c.req.json().catch(() => null)) as {
        values?: unknown;
      } | null;
      if (!body || body.values == null || typeof body.values !== "object") {
        throw new HTTPException(400, { message: "values object is required" });
      }
      const values = body.values as Record<string, unknown>;
      const result = await deps.enqueueWrite(() =>
        deps.jord.insertTableRow({
          table: name,
          values,
        }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          tableRowStatus(result.error),
        );
      }
      const info = await deps.jord.describeTable(name);
      const pkCol = info?.columns.find((col) => col.pk)?.name ?? "id";
      const pkRaw = values[pkCol];
      publishChange({
        table: name,
        op: "insert",
        id: pkRaw == null ? "" : String(pkRaw),
      });
      return c.json({ ok: true as const }, 201);
    },
  );

  protectedRoutes.patch(
    "/schema/tables/:name/rows/:pk",
    requireWriteTableRows(),
    async (c) => {
      const name = c.req.param("name");
      const pk = c.req.param("pk");
      const body = (await c.req.json().catch(() => null)) as {
        values?: unknown;
      } | null;
      if (!body || body.values == null || typeof body.values !== "object") {
        throw new HTTPException(400, { message: "values object is required" });
      }
      const result = await deps.enqueueWrite(() =>
        deps.jord.updateTableRow({
          table: name,
          pk,
          values: body.values as Record<string, unknown>,
        }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          tableRowStatus(result.error),
        );
      }
      publishChange({ table: name, op: "update", id: pk });
      return c.json({ ok: true as const });
    },
  );

  protectedRoutes.delete(
    "/schema/tables/:name/rows/:pk",
    requireWriteTableRows(),
    async (c) => {
      const name = c.req.param("name");
      const pk = c.req.param("pk");
      const result = await deps.enqueueWrite(() =>
        deps.jord.deleteTableRow({ table: name, pk }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          tableRowStatus(result.error),
        );
      }
      publishChange({ table: name, op: "delete", id: pk });
      return c.json({ ok: true as const });
    },
  );

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

  protectedRoutes.delete(
    "/schema/tables/:name",
    requireAlterSchema(),
    async (c) => {
      const name = c.req.param("name");
      const result = await deps.enqueueWrite(() =>
        deps.jord.dropTable({ name }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      return c.json({ ok: true as const });
    },
  );

  protectedRoutes.patch(
    "/schema/tables/:name",
    requireAlterSchema(),
    async (c) => {
      const name = c.req.param("name");
      const body = (await c.req.json().catch(() => null)) as {
        name?: unknown;
      } | null;
      if (!body || typeof body.name !== "string") {
        throw new HTTPException(400, {
          message: "name (string) is required",
        });
      }
      const result = await deps.enqueueWrite(() =>
        deps.jord.renameTable({ name, newName: body.name as string }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      const info = await deps.jord.describeTable(body.name as string);
      return c.json({ ok: true as const, table: info });
    },
  );

  protectedRoutes.patch(
    "/schema/tables/:name/columns/:column",
    requireAlterSchema(),
    async (c) => {
      const table = c.req.param("name");
      const column = c.req.param("column");
      const body = (await c.req.json().catch(() => null)) as {
        name?: unknown;
        type?: unknown;
      } | null;
      if (!body) {
        throw new HTTPException(400, { message: "JSON body is required" });
      }
      const patch: { name?: string; type?: JordColumnType } = {};
      if (body.name !== undefined) {
        if (typeof body.name !== "string") {
          throw new HTTPException(400, { message: "name must be a string" });
        }
        patch.name = body.name;
      }
      if (body.type !== undefined) {
        if (typeof body.type !== "string" || !isJordColumnType(body.type)) {
          throw new HTTPException(400, {
            message: "type must be TEXT, INTEGER, REAL, or BLOB",
          });
        }
        patch.type = body.type;
      }
      if (patch.name === undefined && patch.type === undefined) {
        throw new HTTPException(400, {
          message: "name and/or type is required",
        });
      }
      const result = await deps.enqueueWrite(() =>
        deps.jord.alterColumn({ table, column, ...patch }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      const info = await deps.jord.describeTable(table);
      return c.json({ ok: true as const, table: info });
    },
  );

  protectedRoutes.delete(
    "/schema/tables/:name/columns/:column",
    requireAlterSchema(),
    async (c) => {
      const table = c.req.param("name");
      const column = c.req.param("column");
      const result = await deps.enqueueWrite(() =>
        deps.jord.dropColumn({ table, column }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      const info = await deps.jord.describeTable(table);
      return c.json({ ok: true as const, table: info });
    },
  );

  const policiesOff = policiesDisabledFromEnv();
  const triggersOff = triggersDisabledFromEnv();
  if (policiesOff) {
    console.warn("[@altr/jord-server] JORD_POLICIES_DISABLED — skipping policy evaluation");
  }
  if (triggersOff) {
    console.warn("[@altr/jord-server] JORD_TRIGGERS_DISABLED — skipping trigger hooks");
  }

  async function syncPoliciesRls(): Promise<void> {
    if (policiesOff || deps.jord.dialect !== "postgres") return;
    try {
      await deps.jord.syncRecordsPoliciesRls?.();
    } catch (err) {
      console.error("[@altr/jord-server] rls sync failed", err);
      throw new HTTPException(500, { message: "rls_sync_failed" });
    }
  }

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

    const role = c.get("jordRole");
    const decision = await evaluatePolicies({
      jord: deps.jord,
      tableName: V1_TABLE,
      operation: "insert",
      role,
      bucket: body.bucket,
      disabled: policiesOff,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision.policy, "insert"), 403);
    }

    const row = await deps.enqueueWrite(() => {
      deps.jord.bindRlsSession?.({ role, bucket: body.bucket });
      return deps.jord.insertRecord({
        bucket: body.bucket!,
        body: body.body!,
        metadata: body.metadata,
      });
    });
    await runTriggersAfterWrite({
      jord: deps.jord,
      logs,
      tableName: V1_TABLE,
      event: "insert",
      row,
      role,
      enqueueWrite: deps.enqueueWrite,
      disabled: triggersOff,
      onRecordChange: publishRecordChange,
    });
    publishRecordChange({ op: "insert", id: row.id, version: row.version });
    return c.json(publicRecord(row), 201);
  });

  recordsRoutes.get("/", async (c) => {
    const bucket = c.req.query("bucket");
    if (!bucket) {
      throw new HTTPException(400, { message: "query bucket= is required" });
    }
    const decision = await evaluatePolicies({
      jord: deps.jord,
      tableName: V1_TABLE,
      operation: "select",
      role: c.get("jordRole"),
      bucket,
      disabled: policiesOff,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision.policy, "select"), 403);
    }
    deps.jord.bindRlsSession?.({ role: c.get("jordRole"), bucket });
    const rows = await deps.jord.listRecordsByBucket(bucket);
    return c.json(rows.map(publicRecord));
  });

  recordsRoutes.get("/:id", async (c) => {
    const row = await deps.jord.getRecord(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "record not found" });
    }
    const decision = await evaluatePolicies({
      jord: deps.jord,
      tableName: V1_TABLE,
      operation: "select",
      role: c.get("jordRole"),
      bucket: row.bucket,
      disabled: policiesOff,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision.policy, "select"), 403);
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

    const existing = await deps.jord.getRecord(id);
    if (!existing) {
      throw new HTTPException(404, { message: "record not found" });
    }
    const role = c.get("jordRole");
    const decision = await evaluatePolicies({
      jord: deps.jord,
      tableName: V1_TABLE,
      operation: "update",
      role,
      bucket: body.bucket ?? existing.bucket,
      disabled: policiesOff,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision.policy, "update"), 403);
    }

    const result = await deps.enqueueWrite(() => {
      deps.jord.bindRlsSession?.({
        role,
        bucket: body.bucket ?? existing.bucket,
      });
      return deps.jord.updateRecord({
        id,
        version: body.version!,
        body: body.body,
        metadata: body.metadata,
        bucket: body.bucket,
      });
    });

    if (!result.ok) {
      return c.json(
        { error: "version_conflict", message: "stale version" },
        409,
      );
    }
    await runTriggersAfterWrite({
      jord: deps.jord,
      logs,
      tableName: V1_TABLE,
      event: "update",
      row: result.record,
      prior: existing,
      role,
      enqueueWrite: deps.enqueueWrite,
      disabled: triggersOff,
      onRecordChange: publishRecordChange,
    });
    publishRecordChange({
      op: "update",
      id: result.record.id,
      version: result.record.version,
    });
    return c.json(publicRecord(result.record));
  });

  recordsRoutes.delete("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const existing = await deps.jord.getRecord(id);
    if (!existing) {
      throw new HTTPException(404, { message: "record not found" });
    }
    const role = c.get("jordRole");
    const decision = await evaluatePolicies({
      jord: deps.jord,
      tableName: V1_TABLE,
      operation: "delete",
      role,
      bucket: existing.bucket,
      disabled: policiesOff,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision.policy, "delete"), 403);
    }
    const deleted = await deps.enqueueWrite(() => {
      deps.jord.bindRlsSession?.({ role, bucket: existing.bucket });
      return deps.jord.deleteRecord(id);
    });
    if (!deleted) {
      throw new HTTPException(404, { message: "record not found" });
    }
    await runTriggersAfterWrite({
      jord: deps.jord,
      logs,
      tableName: V1_TABLE,
      event: "delete",
      row: existing,
      prior: existing,
      role,
      enqueueWrite: deps.enqueueWrite,
      disabled: triggersOff,
      onRecordChange: publishRecordChange,
    });
    publishRecordChange({ op: "delete", id });
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.get(
    "/realtime",
    requireSubscribeRealtime(),
    async (c) => {
      const table = c.req.query("table") ?? REALTIME_V1_TABLE;
      if (!isRealtimeSubscribeTable(table)) {
        throw new HTTPException(400, {
          message:
            'table must be "records" or a valid non-reserved user-table identifier',
        });
      }
      const idFilter = c.req.query("id")?.trim() || null;
      if (table === REALTIME_V1_TABLE) {
        const decision = await evaluatePolicies({
          jord: deps.jord,
          tableName: REALTIME_V1_TABLE,
          operation: "select",
          role: c.get("jordRole"),
          disabled: policiesOff,
        });
        if (!decision.allowed) {
          return c.json(policyDeniedBody(decision.policy, "select"), 403);
        }
      }
      if (realtime.size >= MAX_REALTIME_SUBSCRIBERS) {
        return c.json(
          {
            error: "realtime_full",
            message: "too many realtime subscribers",
          },
          503,
        );
      }

      return streamSSE(c, async (stream) => {
        const unsubscribe = realtime.trySubscribeFiltered(
          { table, id: idFilter },
          (event) => {
            void stream.writeSSE({
              event: "jord.change",
              data: JSON.stringify(event),
            });
          },
        );
        if (!unsubscribe) return;

        const timer = setInterval(() => {
          void stream.writeSSE({ event: "ping", data: "ping" });
        }, 15_000);

        try {
          while (!stream.aborted) {
            await stream.sleep(1000);
          }
        } finally {
          clearInterval(timer);
          unsubscribe();
        }
      });
    },
  );

  protectedRoutes.get(
    "/realtime/ws",
    requireSubscribeRealtime(),
    async (c, next) => {
      const table = c.req.query("table") ?? REALTIME_V1_TABLE;
      if (!isRealtimeSubscribeTable(table)) {
        throw new HTTPException(400, {
          message:
            'table must be "records" or a valid non-reserved user-table identifier',
        });
      }
      if (table === REALTIME_V1_TABLE) {
        const decision = await evaluatePolicies({
          jord: deps.jord,
          tableName: REALTIME_V1_TABLE,
          operation: "select",
          role: c.get("jordRole"),
          disabled: policiesOff,
        });
        if (!decision.allowed) {
          return c.json(policyDeniedBody(decision.policy, "select"), 403);
        }
      }
      if (realtime.size >= MAX_REALTIME_SUBSCRIBERS) {
        return c.json(
          {
            error: "realtime_full",
            message: "too many realtime subscribers",
          },
          503,
        );
      }
      await next();
    },
    upgradeWebSocket((c) => {
      const table =
        (c.req.query("table") as string | undefined) ?? REALTIME_V1_TABLE;
      const idFilter = c.req.query("id")?.trim() || null;
      let unsubscribe: (() => void) | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;

      return {
        onOpen(_evt, ws) {
          unsubscribe = realtime.trySubscribeFiltered(
            { table, id: idFilter },
            (event) => {
              try {
                ws.send(JSON.stringify(event));
              } catch (err) {
                console.error("[@altr/jord-server] ws send failed", err);
              }
            },
          );
          if (!unsubscribe) {
            ws.close(1013, "realtime_full");
            return;
          }
          pingTimer = setInterval(() => {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch {
              /* closed */
            }
          }, 15_000);
        },
        onMessage(evt, ws) {
          const raw = typeof evt.data === "string" ? evt.data : "";
          if (raw.includes("pong")) return;
          // v1: ignore other client messages
          void ws;
        },
        onClose() {
          if (pingTimer) clearInterval(pingTimer);
          unsubscribe?.();
        },
        onError() {
          if (pingTimer) clearInterval(pingTimer);
          unsubscribe?.();
        },
      };
    }),
  );

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
        logs,
        onRecordChange: publishRecordChange,
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
      logs,
      onRecordChange: publishRecordChange,
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

  protectedRoutes.get("/policies", async (c) => {
    const rows = await deps.jord.listPolicies();
    return c.json({ policies: rows.map(publicPolicy) });
  });

  protectedRoutes.post("/policies", requireAlterSchema(), async (c) => {
    const body = await c.req.json<{
      name?: string;
      table_name?: string;
      operation?: string;
      effect?: string;
      rules?: string;
      priority?: number;
      enabled?: boolean;
    }>();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "name is required" });
    }
    const tableName = body.table_name ?? V1_TABLE;
    if (tableName !== V1_TABLE) {
      throw new HTTPException(400, {
        message: `table_name must be "${V1_TABLE}" in S7`,
      });
    }
    if (
      typeof body.operation !== "string" ||
      !POLICY_OPS.has(body.operation as JordPolicyOperation)
    ) {
      throw new HTTPException(400, {
        message: "operation must be select|insert|update|delete",
      });
    }
    if (
      typeof body.effect !== "string" ||
      !POLICY_EFFECTS.has(body.effect as JordPolicyEffect)
    ) {
      throw new HTTPException(400, {
        message: "effect must be allow|deny",
      });
    }
    const rules =
      typeof body.rules === "string" ? body.rules : JSON.stringify([]);
    const rulesErr = validateRulesJson(rules);
    if (rulesErr) throw new HTTPException(400, { message: rulesErr });
    const priority =
      typeof body.priority === "number" && Number.isFinite(body.priority)
        ? Math.floor(body.priority)
        : 0;

    const row = await deps.enqueueWrite(async () => {
      const created = await deps.jord.insertPolicy({
        name: body.name!.trim(),
        tableName,
        operation: body.operation as JordPolicyOperation,
        effect: body.effect as JordPolicyEffect,
        rules,
        priority,
        enabled: body.enabled,
      });
      await syncPoliciesRls();
      return created;
    });
    return c.json(publicPolicy(row), 201);
  });

  protectedRoutes.get("/policies/:id", async (c) => {
    const row = await deps.jord.getPolicy(c.req.param("id"));
    if (!row) throw new HTTPException(404, { message: "policy not found" });
    return c.json(publicPolicy(row));
  });

  protectedRoutes.patch("/policies/:id", requireAlterSchema(), async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
      name?: string;
      table_name?: string;
      operation?: string;
      effect?: string;
      rules?: string;
      priority?: number;
      enabled?: boolean;
    }>();
    if (body.table_name !== undefined && body.table_name !== V1_TABLE) {
      throw new HTTPException(400, {
        message: `table_name must be "${V1_TABLE}" in S7`,
      });
    }
    if (
      body.operation !== undefined &&
      !POLICY_OPS.has(body.operation as JordPolicyOperation)
    ) {
      throw new HTTPException(400, {
        message: "operation must be select|insert|update|delete",
      });
    }
    if (
      body.effect !== undefined &&
      !POLICY_EFFECTS.has(body.effect as JordPolicyEffect)
    ) {
      throw new HTTPException(400, {
        message: "effect must be allow|deny",
      });
    }
    if (body.rules !== undefined) {
      const rulesErr = validateRulesJson(body.rules);
      if (rulesErr) throw new HTTPException(400, { message: rulesErr });
    }

    const row = await deps.enqueueWrite(async () => {
      const updated = await deps.jord.updatePolicy({
        id,
        name: body.name,
        tableName: body.table_name,
        operation: body.operation as JordPolicyOperation | undefined,
        effect: body.effect as JordPolicyEffect | undefined,
        rules: body.rules,
        priority: body.priority,
        enabled: body.enabled,
      });
      if (updated) await syncPoliciesRls();
      return updated;
    });
    if (!row) throw new HTTPException(404, { message: "policy not found" });
    return c.json(publicPolicy(row));
  });

  protectedRoutes.delete("/policies/:id", requireAlterSchema(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(async () => {
      const removed = await deps.jord.deletePolicy(id);
      if (removed) await syncPoliciesRls();
      return removed;
    });
    if (!deleted) throw new HTTPException(404, { message: "policy not found" });
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.get("/triggers", async (c) => {
    const rows = await deps.jord.listTriggers();
    return c.json({ triggers: rows.map(publicTrigger) });
  });

  protectedRoutes.post("/triggers", requireAlterSchema(), async (c) => {
    const body = await c.req.json<{
      name?: string;
      table_name?: string;
      event?: string;
      actions?: string;
      enabled?: boolean;
    }>();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new HTTPException(400, { message: "name is required" });
    }
    const tableName = body.table_name ?? V1_TABLE;
    if (tableName !== V1_TABLE) {
      throw new HTTPException(400, {
        message: `table_name must be "${V1_TABLE}" in S7`,
      });
    }
    if (
      typeof body.event !== "string" ||
      !TRIGGER_EVENTS.has(body.event as JordTriggerEvent)
    ) {
      throw new HTTPException(400, {
        message: "event must be insert|update|delete",
      });
    }
    const actions =
      typeof body.actions === "string" ? body.actions : JSON.stringify([]);
    const actionsErr = validateActionsJson(actions);
    if (actionsErr) throw new HTTPException(400, { message: actionsErr });

    // Validate invoke_function targets exist
    for (const action of parseActionsJson(actions)) {
      if (action.kind === "invoke_function") {
        const fid = action.config?.functionId;
        if (typeof fid !== "string" || !fid) {
          throw new HTTPException(400, {
            message: "invoke_function requires config.functionId",
          });
        }
        const fn = await deps.jord.getFunction(fid);
        if (!fn) {
          throw new HTTPException(400, {
            message: `function ${fid} not found`,
          });
        }
      }
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.insertTrigger({
        name: body.name!.trim(),
        tableName,
        event: body.event as JordTriggerEvent,
        actions,
        enabled: body.enabled,
      }),
    );
    return c.json(publicTrigger(row), 201);
  });

  protectedRoutes.get("/triggers/:id", async (c) => {
    const row = await deps.jord.getTrigger(c.req.param("id"));
    if (!row) throw new HTTPException(404, { message: "trigger not found" });
    return c.json(publicTrigger(row));
  });

  protectedRoutes.patch("/triggers/:id", requireAlterSchema(), async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
      name?: string;
      table_name?: string;
      event?: string;
      actions?: string;
      enabled?: boolean;
    }>();
    if (body.table_name !== undefined && body.table_name !== V1_TABLE) {
      throw new HTTPException(400, {
        message: `table_name must be "${V1_TABLE}" in S7`,
      });
    }
    if (
      body.event !== undefined &&
      !TRIGGER_EVENTS.has(body.event as JordTriggerEvent)
    ) {
      throw new HTTPException(400, {
        message: "event must be insert|update|delete",
      });
    }
    if (body.actions !== undefined) {
      const actionsErr = validateActionsJson(body.actions);
      if (actionsErr) throw new HTTPException(400, { message: actionsErr });
      for (const action of parseActionsJson(body.actions)) {
        if (action.kind === "invoke_function") {
          const fid = action.config?.functionId;
          if (typeof fid !== "string" || !fid) {
            throw new HTTPException(400, {
              message: "invoke_function requires config.functionId",
            });
          }
          const fn = await deps.jord.getFunction(fid);
          if (!fn) {
            throw new HTTPException(400, {
              message: `function ${fid} not found`,
            });
          }
        }
      }
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.updateTrigger({
        id,
        name: body.name,
        tableName: body.table_name,
        event: body.event as JordTriggerEvent | undefined,
        actions: body.actions,
        enabled: body.enabled,
      }),
    );
    if (!row) throw new HTTPException(404, { message: "trigger not found" });
    return c.json(publicTrigger(row));
  });

  protectedRoutes.delete("/triggers/:id", requireAlterSchema(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(() => deps.jord.deleteTrigger(id));
    if (!deleted) {
      throw new HTTPException(404, { message: "trigger not found" });
    }
    return c.json({ ok: true as const, id });
  });

  const blobsRoot = resolveBlobsRoot(process.env, deps.blobsRoot);
  registerBlobRoutes(protectedRoutes, {
    jord: deps.jord,
    enqueueWrite: deps.enqueueWrite,
    disk: createBlobDiskStore(blobsRoot),
    maxBytes: deps.maxBlobBytes,
  });

  registerVectorRoutes(protectedRoutes, {
    jord: deps.jord,
    enqueueWrite: deps.enqueueWrite,
  });

  app.route("/", protectedRoutes);

  return Object.assign(app, { injectWebSocket });
}

export type JordApp = ReturnType<typeof createJordApp>;
