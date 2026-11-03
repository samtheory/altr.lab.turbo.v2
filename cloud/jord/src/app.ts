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
  SecretPort,
} from "@altr/jord";
import {
  buildAddColumnSql,
  createSecretPortFromEnv,
  hasUsableMasterKey,
  isJordColumnType,
  isValidSqlIdent,
  quoteIdent,
  quoteQualified,
} from "@altr/jord";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { streamSSE } from "hono/streaming";

import {
  createAuthMiddleware,
  createAuthRoutes,
  createOAuthAdminRoutes,
  createAuthSettingsRoutes,
  createMailerFromEnv,
  requireAlterSchema,
  requireInvokeApis,
  requireManageApis,
  requireManageJobs,
  requireSubscribeRealtime,
  requireWriteRecords,
  requireWriteTableRows,
  isJordRole,
  type JordAuthConfig,
  type JordAuthVariables,
  type JordRole,
  type MailerPort,
  type Principal,
} from "./auth/index.js";
import {
  buildRecordsResource,
  createGeneratedApiRegistry,
  isGeneratedApiResourceId,
  type GeneratedApiRegistry,
} from "./generated-api/index.js";
import { isCustomApiExposed } from "./functions/exposure.js";
import {
  isBuiltinStepKind,
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
import { LogBatcher } from "./logs/batch.js";
import type { LogSink } from "./logs/sink.js";
import { createSqlRoutes } from "./sql/routes.js";
import {
  getMigrateJob,
  MigrateTargetError,
  runMigrateJob,
  startMigrateJob,
} from "./migrate/wizard.js";
import {
  listUsers,
  revokeUserSessions,
  setUserDisabled,
} from "./auth/admin.js";
import { createAdminAuthUserRoutes } from "./auth/admin-routes.js";
import { createJwtKeyring } from "./auth/keyring.js";
import {
  createProjectRoutes,
  createStudioProjectRoutes,
  type ProjectConnectTester,
  type ProjectConnectInput,
} from "./projects/index.js";
import { createProjectStatsRoutes } from "./projects/stats.js";
import { attachRealtimeCounters } from "./projects/stats-counters.js";
import { createPolicyEvaluateRoutes } from "./policies/evaluate-routes.js";
import {
  evaluatePolicies,
  isBuiltinPolicyRuleKind,
  ownerUnchanged,
  policiesDisabledFromEnv,
  scopeColumns,
  stampInsertScope,
  type PolicyDecision,
} from "./policies/index.js";
import {
  registerBlobRoutes,
  registerSignedBlobRoutes,
  resolveBlobsRoot,
} from "./blobs/index.js";
import {
  createBlobKeyRoutes,
  createBlobKeySet,
  createBucketAdminRoutes,
  createBucketResolver,
  createStorageFromEnv,
  resolveHmacSecret,
  resolveMaxBlobBytes,
  resolvePublicBaseUrl,
  type BucketAdminDeps,
  type CreatePortFromBucketConfig,
  type JordStoragePort,
} from "./storage/index.js";
import {
  createCorsMiddleware,
  createDataRateLimitMiddleware,
  createHttpRequestLogMiddleware,
  createJsonBodyLimitMiddleware,
  createMemoryRateLimitStore,
  createPostgresRateLimitStore,
  parseCorsOrigins,
  registerHealthRoutes,
  resolveDataRateLimit,
  resolveHttpLogEnabled,
  resolveMaxJsonBytes,
  type HttpRequestLogWriter,
  type RateLimitStore,
} from "./http/index.js";
import {
  createOtelHttpMiddleware,
  instrumentStorage,
  instrumentWriteQueue,
} from "./telemetry/index.js";
import {
  createIdempotencyStore,
  resolveIdempotencyTtlMs,
  type IdempotencyStore,
} from "./idempotency/store.js";
import { createPostgresIdempotencyStore } from "./idempotency/pg-store.js";
import {
  hashBodyText,
  idempotencyPrincipalKey,
  readBodyTextCapped,
  isIdempotencyKeyBadRequest,
  isIdempotentWriteMethod,
  isIdempotentWritePath,
  readIdempotencyKey,
} from "./idempotency/middleware.js";
import type { WriteQueue } from "./queue.js";
import { registerVectorRoutes } from "./vectors/index.js";
import { createTableApiRoutes } from "./table-api/routes.js";
import {
  createOutbox,
  createOutboxListenBridge,
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  REALTIME_V1_TABLE,
  RealtimeBus,
  type JordChangeEvent,
  type OutboxListenBridge,
} from "./realtime/index.js";
import { liveDeliveryAllowed } from "./realtime/deliver.js";
import { PresenceHub, WS_MAX_PAYLOAD_BYTES } from "./realtime/channels.js";
import {
  authorizeChannel,
  channelPrincipalKey,
  deniedChannelBody,
  parseChannelRef,
  presencePerPrincipalFromEnv,
  type ChannelRef,
} from "./realtime/channel-auth.js";
import {
  channelSocketHandlers,
  setDeadline,
} from "./realtime/channel-socket.js";
import {
  principalSessionLive,
  REALTIME_RECHECK_MS,
} from "./realtime/liveness.js";
import {
  createPgPeerTransport,
  type PgPeerTransport,
} from "./realtime/presence-pg.js";
import type { OutboxRow } from "./realtime/outbox.js";
import type { WriteWithChange } from "./realtime/types.js";
import {
  appRealtimeLimitsFromEnv,
  createAppRealtime,
} from "./realtime/app-endpoint.js";
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
  /**
   * Table-owner connection for schema DDL and RLS sync. On Postgres the
   * runtime pool is `jord_app`, which cannot CREATE/ALTER or CREATE POLICY.
   * Defaults to `jord`.
   */
  ddl?: JordDriverPort;
  enqueueWrite: WriteQueue;
  auth: JordAuthConfig;
  /** Confirm / reset mail. Defaults to the console adapter. */
  mailer?: MailerPort;
  /** Defaults to env-seeded registry when omitted. */
  generatedApi?: GeneratedApiRegistry;
  logs?: LogSink;
  scheduler?: JobScheduler;
  /** In-process change fanout. Created when omitted. */
  realtime?: RealtimeBus;
  /**
   * Postgres URL for a dedicated LISTEN connection (S0037). When set on a
   * postgres dialect, the app starts one LISTEN bridge and stops it via
   * `stopRealtimeListen`. Omit in unit tests that do not need cross-instance fan-out.
   */
  realtimeListenUrl?: string;
  /**
   * S0083 presence/broadcast hub. Created when omitted; on postgres with
   * `realtimeListenUrl` it gets a NOTIFY peer transport for multi-instance.
   */
  presence?: PresenceHub;
  /** S0083: open-stream session/policy re-check cadence (default 30s). */
  realtimeRecheckMs?: number;
  /** Absolute or relative blob disk root. Defaults to data/blobs or JORD_BLOBS_ROOT. */
  blobsRoot?: string;
  /** Max upload bytes (default 10 MiB). */
  maxBlobBytes?: number;
  /** Injected storage adapter (tests). Defaults from JORD_STORAGE_BACKEND. */
  storage?: JordStoragePort;
  /** Test override: build a port from a jord_buckets row (S0066). */
  createBucketPort?: CreatePortFromBucketConfig;
  /** Test override: probe port factory for /admin/buckets (S0067). */
  createBucketProbePort?: BucketAdminDeps["createProbePort"];
  /** Test override: connection probe for /admin/buckets (S0067). */
  runBucketProbe?: BucketAdminDeps["runProbe"];
  /** HMAC secret for local signed blob URLs. */
  blobSigningSecret?: string;
  /** Optional process env for CORS / body / rate / idempotency / HTTP log knobs. */
  env?: NodeJS.ProcessEnv;
  /**
   * Idempotency store. When omitted: Postgres-backed (shared across
   * instances, S0036) on a postgres port, in-process memory on libSQL.
   */
  idempotency?: IdempotencyStore;
  /**
   * Data-route rate-limit counters. When omitted: Postgres-backed (shared
   * across instances, S0036) on a postgres port, in-process memory on libSQL.
   */
  rateLimit?: RateLimitStore;
  /**
   * Structured JSON request log sink (S0035). Defaults to stdout/stderr.
   * Inject in tests; set `JORD_HTTP_LOG=0` to disable.
   */
  httpLog?: HttpRequestLogWriter;
  /**
   * Control-plane secret port (S0042/S0043). When omitted and `JORD_MASTER_KEY`
   * is set, built from env. When the key is absent, stays `null` so
   * zero-project boots keep working; `/admin/projects` returns 503.
   */
  secrets?: SecretPort | null;
  /** S0075: provider HTTP for the OAuth token exchange (tests). */
  oauthFetch?: typeof fetch;
  /** Override project connect test (S0043 tests). */
  projectConnectTest?: ProjectConnectTester;
  /** Override project target baseline / migrate open (S0043 tests). */
  projectBaseline?: (input: ProjectConnectInput) => Promise<void>;
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

/** Outbox row image for `records` (no timestamps). */
function recordChangeRow(row: JordRecord): Record<string, unknown> {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata,
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

function policyDeniedBody(
  decision: Extract<PolicyDecision, { allowed: false }>,
  operation: JordPolicyOperation,
) {
  const body: {
    error: "policy_denied";
    operation: JordPolicyOperation;
    policyId?: string;
    table?: string;
    reason?: string;
  } = {
    error: "policy_denied",
    operation,
  };
  if (decision.policy) {
    body.policyId = decision.policy.id;
    body.table = decision.policy.tableName;
  }
  if (decision.reason) body.reason = decision.reason;
  return body;
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

function tableRowStatus(error: string): 400 | 404 | 409 | 422 {
  if (error === "pk_exists" || error === "conflict") return 409;
  if (error === "table_not_found" || error === "not_found") return 404;
  if (error === "validation") return 422;
  return 400;
}

function schemaDdlStatus(error: string): 400 | 404 | 409 {
  if (error === "table_exists" || error === "column_exists") return 409;
  if (error === "table_not_found" || error === "column_not_found") return 404;
  return 400;
}

async function assertPolicyTable(
  jord: JordDriverPort,
  tableName: string,
  schema?: string,
): Promise<void> {
  if (tableName === "records") return;
  if (!isValidSqlIdent(tableName) || tableName.startsWith("jord_")) {
    throw new HTTPException(400, { message: "table_name is not a user table" });
  }
  const info = await jord.describeTable(tableName, schema);
  if (!info) {
    throw new HTTPException(400, { message: "table_name was not found" });
  }
}

export function createJordApp(deps: JordAppDeps) {
  const app = new Hono<{ Variables: JordAuthVariables }>();
  const { upgradeWebSocket, injectWebSocket, wss } = createNodeWebSocket({
    app,
  });
  // @hono/node-ws builds its WebSocketServer with ws defaults (100 MiB
  // maxPayload). ws reads `options.maxPayload` at each handleUpgrade, so this
  // caps every socket: oversized frames close 1009 before being buffered.
  // /realtime/ws clients only send tiny pongs; channel frames cap at 6 KiB.
  wss.options.maxPayload = WS_MAX_PAYLOAD_BYTES;

  const env = deps.env ?? process.env;
  const mailer = deps.mailer ?? createMailerFromEnv({ env });
  const sharedState = deps.jord.dialect === "postgres";
  const idempotencyTtlMs = resolveIdempotencyTtlMs(env);
  const idempotency =
    deps.idempotency ??
    (sharedState
      ? createPostgresIdempotencyStore(deps.jord, idempotencyTtlMs)
      : createIdempotencyStore(idempotencyTtlMs));
  const rateLimitStore =
    deps.rateLimit ??
    (sharedState
      ? createPostgresRateLimitStore(deps.jord)
      : createMemoryRateLimitStore());
  const dataRate = resolveDataRateLimit(env);
  const blobsRoot = resolveBlobsRoot(env, deps.blobsRoot);
  const maxBlobBytes = resolveMaxBlobBytes(env, deps.maxBlobBytes);
  // S0042/S0043: inject secret port when a master key is configured.
  const secrets: SecretPort | null =
    deps.secrets === undefined
      ? hasUsableMasterKey(env)
        ? createSecretPortFromEnv(env)
        : null
      : deps.secrets;
  // S0093: blob signing key set (current + previous with expiry). Env secret
  // until the first rotation; sealed in jord_key_sets afterwards.
  const blobKeys = createBlobKeySet({
    jord: deps.jord,
    secrets,
    enqueueWrite: deps.enqueueWrite,
    baseSecret:
      deps.blobSigningSecret ?? resolveHmacSecret(env, deps.auth.secret),
    fingerprintKey: deps.auth.secret,
  });
  const hmacSecret = blobKeys;
  const publicBaseUrl = resolvePublicBaseUrl(env);
  const storageFactory = {
    env,
    blobsRoot,
    hmacSecret,
    publicBaseUrl,
  };
  const storage = instrumentStorage(
    deps.storage ?? createStorageFromEnv(storageFactory),
  );
  const bucketResolver = createBucketResolver({
    jord: deps.jord,
    envPort: storage,
    env,
    envMaxBytes: maxBlobBytes,
    factory: storageFactory,
    secrets,
    createPort: deps.createBucketPort,
  });
  const enqueueWrite = instrumentWriteQueue(deps.enqueueWrite);
  // S0071 — per-project signing key (sealed in auth settings, env fallback).
  const jwtKeyring = createJwtKeyring({
    jord: deps.jord,
    auth: deps.auth,
    secrets,
    enqueueWrite,
  });
  const requireAuth = createAuthMiddleware(deps.auth, jwtKeyring, deps.jord);
  // Prefer `enqueueWrite` below so jobs get `jord.write` spans (S0039).
  const projectRegistry = {
    jord: deps.jord,
    secrets,
    testConnect: deps.projectConnectTest,
    baseline: deps.projectBaseline,
    enqueueWrite,
  };
  const bucketAdmin: BucketAdminDeps = {
    jord: deps.jord,
    secrets,
    enqueueWrite,
    factory: storageFactory,
    clearPortCache: () => bucketResolver.clearPortCache(),
    createProbePort: deps.createBucketProbePort,
    runProbe: deps.runBucketProbe,
  };

  app.use("*", createCorsMiddleware(parseCorsOrigins(env)));
  app.use(
    "*",
    createHttpRequestLogMiddleware({
      enabled: resolveHttpLogEnabled(env),
      write: deps.httpLog,
    }),
  );
  // After request-id (set by the log middleware) so every span carries it.
  app.use("*", createOtelHttpMiddleware());
  app.use("*", createJsonBodyLimitMiddleware(resolveMaxJsonBytes(env)));

  // S0093: refresh the blob key set (cached ~5 s) before any signing/verify.
  app.use("/blobs/*", async (_c, next) => {
    await blobKeys.ready();
    await next();
  });

  registerSignedBlobRoutes(app, {
    storage,
    resolveBucket: (name) => bucketResolver.resolveBucket(name),
    hmacSecret,
    maxBytes: maxBlobBytes,
    jord: deps.jord,
    enqueueWrite,
  });

  function stepRole(principal: Principal): JordRole {
    if (principal.kind === "operator" && isJordRole(principal.role)) {
      return principal.role;
    }
    if (principal.kind === "service") return "editor";
    return "readonly";
  }

  function rlsSessionRole(principal: Principal): string {
    if (principal.kind === "user" || principal.kind === "anon") {
      return principal.kind;
    }
    return stepRole(principal);
  }

  function rlsSessionFor(principal: Principal, bucket?: string | null) {
    return {
      role: rlsSessionRole(principal),
      bucket: bucket ?? "",
      uid: principal.uid ?? "",
      claims: principal.claims,
    };
  }
  const generatedApi =
    deps.generatedApi ?? createGeneratedApiRegistry(process.env);
  const logs =
    deps.logs ??
    (() => {
      const batcher = new LogBatcher(deps.jord);
      batcher.start();
      return batcher;
    })();
  const realtime = deps.realtime ?? new RealtimeBus();
  const outbox = createOutbox(deps.jord);
  const ddlJord = deps.ddl ?? deps.jord;
  const listenUrl = deps.realtimeListenUrl?.trim() ?? "";
  let listenBridge: OutboxListenBridge | null = null;
  let listenStarted: Promise<void> | null = null;
  if (deps.jord.dialect === "postgres" && listenUrl) {
    listenBridge = createOutboxListenBridge({
      connectionString: listenUrl,
      outbox,
      bus: realtime,
    });
    listenStarted = listenBridge.start();
    void listenStarted.catch((err) => {
      console.error("[@altr/jord-server] realtime LISTEN start failed", err);
    });
  }
  // S0083: presence/broadcast hub; NOTIFY peer transport on postgres.
  const realtimeRecheckMs = deps.realtimeRecheckMs ?? REALTIME_RECHECK_MS;
  let presenceTransport: PgPeerTransport | null = null;
  if (!deps.presence && deps.jord.dialect === "postgres" && listenUrl) {
    presenceTransport = createPgPeerTransport({ connectionString: listenUrl });
    void presenceTransport.start().catch((err) => {
      console.error("[@altr/jord-server] presence LISTEN start failed", err);
    });
  }
  const presencePerPrincipal = presencePerPrincipalFromEnv(env);
  const presence =
    deps.presence ??
    new PresenceHub({
      transport: presenceTransport,
      limits: presencePerPrincipal
        ? { maxSocketsPerPrincipal: presencePerPrincipal }
        : undefined,
    });

  /**
   * Single emit path. The data write and its jord_changes rows (tracked
   * tables only) commit in one transaction on the write queue; fan-out runs
   * after commit. An outbox failure fails the write.
   */
  function writeChangeAs(principal?: Principal): WriteWithChange {
    const actor = principal
      ? { kind: principal.kind, uid: principal.uid ?? null, role: principal.role }
      : null;
    return async (work, changes) => {
      const appended: OutboxRow[] = [];
      let result: Awaited<ReturnType<typeof work>>;
      try {
        result = await enqueueWrite(() =>
          deps.jord.transaction(async () => {
            const value = await work();
            const raw = changes(value);
            const drafts = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
            for (const draft of drafts) {
              const row = await outbox.appendChange({
                tableName: draft.table ?? REALTIME_V1_TABLE,
                schema: draft.schema,
                op: draft.op,
                pk: draft.id,
                oldRow: draft.oldRow ?? null,
                newRow:
                  draft.newRow ??
                  (draft.version != null
                    ? { id: draft.id, version: draft.version }
                    : draft.op === "delete"
                      ? null
                      : { id: draft.id }),
                blobColumns: new Set(draft.blobColumns ?? []),
                actor,
              });
              if (row) appended.push(row);
            }
            return value;
          }),
        );
      } catch (err) {
        for (const row of appended) await outbox.settle(row.seq, false);
        throw err;
      }
      for (const row of appended) {
        await outbox.settle(row.seq, true);
        listenBridge?.noteLocalSeq(row.seq);
        realtime.publish(outbox.toEvent(row));
      }
      return result;
    };
  }

  /**
   * B4: one table-level `op: "resync"` row per tracked table, for writes
   * whose touched rows are unknown (SQL console write, migrate apply).
   * Caller must already hold the write queue. Runs in its own transaction
   * after the triggering write has committed: raw user SQL can carry its own
   * BEGIN/COMMIT, so it cannot share ours. Advisory: a failure is logged and
   * never fails the write that already landed.
   */
  async function resyncTrackedAs(principal: Principal): Promise<void> {
    const actor = {
      kind: principal.kind,
      uid: principal.uid ?? null,
      role: principal.role,
    };
    const appended: OutboxRow[] = [];
    try {
      await deps.jord.transaction(async () => {
        for (const tracked of await outbox.listTracked()) {
          const row = await outbox.appendChange({
            tableName: tracked.table,
            schema: tracked.schema,
            op: "resync",
            pk: "",
            actor,
          });
          if (row) appended.push(row);
        }
      });
    } catch (err) {
      for (const row of appended) await outbox.settle(row.seq, false);
      console.error("[@altr/jord-server] resync emit failed", err);
      return;
    }
    for (const row of appended) {
      await outbox.settle(row.seq, true);
      listenBridge?.noteLocalSeq(row.seq);
      realtime.publish(outbox.toEvent(row));
    }
  }

  async function deliveryAllowed(
    principal: Principal,
    event: JordChangeEvent,
    row: { oldJson: string | null; newJson: string | null; op: string },
  ): Promise<boolean> {
    let parsed: Record<string, unknown> | null = null;
    try {
      const raw =
        row.op === "delete" ? row.oldJson : row.newJson ?? row.oldJson;
      parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }
    const decision = await decide(principal, event.table, "select", {
      row: parsed,
    });
    return decision.allowed;
  }

  /** Live fan-out gate shared by SSE and WebSocket (fail closed). */
  function canDeliverLive(
    principal: Principal,
    event: JordChangeEvent,
  ): Promise<boolean> {
    return liveDeliveryAllowed({
      event,
      getBySeq: (seq) => outbox.getBySeq(seq),
      allowed: (ev, row) => deliveryAllowed(principal, ev, row),
    });
  }

  app.route(
    "/auth",
    createAuthRoutes({
      jord: deps.jord,
      auth: deps.auth,
      mailer,
      enqueueWrite: enqueueWrite,
      rateLimit: rateLimitStore,
      keyring: jwtKeyring,
      secrets,
      oauthFetch: deps.oauthFetch,
    }),
  );

  registerHealthRoutes(app, {
    jord: deps.jord,
    enqueueWrite: enqueueWrite,
  });

  // S0084 — app realtime (publishable key); registered before the
  // operator-auth protected routes so their Bearer gate never runs here.
  createAppRealtime({
    jord: deps.jord,
    auth: deps.auth,
    keyring: jwtKeyring,
    outbox,
    bus: realtime,
    decide: (principal, table, operation, extra) =>
      decide(principal, table, operation, extra),
    bindRls: (principal) => deps.jord.bindRlsSession?.(rlsSessionFor(principal)),
    upgradeWebSocket,
    rateLimit: rateLimitStore,
    recheckMs: realtimeRecheckMs,
    limits: appRealtimeLimitsFromEnv(env),
  }).register(app);

  const protectedRoutes = new Hono<{ Variables: JordAuthVariables }>();
  protectedRoutes.use("*", requireAuth);
  protectedRoutes.use(
    "*",
    createDataRateLimitMiddleware(
      {
        maxHits: dataRate.maxHits,
        windowMs: dataRate.windowMs,
      },
      rateLimitStore,
    ),
  );
  protectedRoutes.use("*", async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    const key = readIdempotencyKey(c);
    if (isIdempotencyKeyBadRequest(key)) {
      throw new HTTPException(400, { message: "Idempotency-Key is too long" });
    }
    if (
      !key ||
      !isIdempotentWriteMethod(method) ||
      !isIdempotentWritePath(path)
    ) {
      await next();
      return;
    }
    const principal = c.get("principal");
    const principalKey = idempotencyPrincipalKey(
      principal,
      c.req.header("x-forwarded-for"),
    );
    // Bounded read: chunked bodies cannot bypass the Content-Length body cap.
    const bodyText = await readBodyTextCapped(
      c.req.raw.clone(),
      path.startsWith("/blobs/") ? null : resolveMaxJsonBytes(env),
    );
    if (bodyText === null) {
      return c.json({ error: "payload_too_large" }, 413);
    }
    const bodyHash = hashBodyText(bodyText);
    const looked = await idempotency.lookup(key, principalKey, bodyHash);
    if (looked.kind === "hit") {
      return c.json(looked.body as never, looked.status as never);
    }
    if (looked.kind === "conflict") {
      return c.json({ error: "idempotency_conflict" }, 409);
    }
    await next();
    try {
      const storedBody = await c.res.clone().json();
      await idempotency.remember(
        key,
        principalKey,
        bodyHash,
        { status: c.res.status, body: storedBody },
        `${method} ${path}`,
      );
    } catch (err) {
      // Non-JSON responses are not stored; a failed store write must not
      // fail a write that already committed.
      if (!(err instanceof SyntaxError)) {
        console.error("[@altr/jord-server] idempotency remember failed", err);
      }
    }
  });
  protectedRoutes.use("*", async (c, next) => {
    deps.jord.bindRlsSession?.(
      rlsSessionFor(c.get("principal"), c.req.query("bucket")),
    );
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

  /**
   * `?schema=` → validated schema (default `deps.jord.defaultSchema`).
   * Unknown or malformed → 400. `fallback` is a body-supplied schema used
   * only when the query param is absent.
   */
  async function resolveSchemaQuery(
    c: { req: { query: (name: string) => string | undefined } },
    fallback?: string | null,
  ): Promise<string> {
    const fromQuery = c.req.query("schema");
    const requested =
      fromQuery !== undefined && fromQuery !== "" ? fromQuery : fallback;
    const resolved = await deps.jord.resolveSchema(requested);
    if (!resolved.ok) {
      throw new HTTPException(400, { message: resolved.message });
    }
    return resolved.schema;
  }

  protectedRoutes.get("/schema/schemas", async (c) => {
    const schemas = await deps.jord.listSchemas();
    return c.json({ schemas });
  });

  protectedRoutes.get("/schema/tables", async (c) => {
    const schema = await resolveSchemaQuery(c);
    const tables = await deps.jord.listTables(schema);
    return c.json({ tables });
  });

  protectedRoutes.post("/schema/tables", requireAlterSchema(), async (c) => {
    const body = await c.req.json<{
      name?: unknown;
      columns?: unknown;
      schema?: unknown;
      foreignKeys?: unknown;
    }>();
    if (body.schema !== undefined && typeof body.schema !== "string") {
      throw new HTTPException(400, { message: "schema must be a string" });
    }
    const schema = await resolveSchemaQuery(c, body.schema);
    if (typeof body.name !== "string" || !Array.isArray(body.columns)) {
      throw new HTTPException(400, {
        message: "name (string) and columns (array) are required",
      });
    }
    const columns: Array<{
      name: string;
      type: JordColumnType;
      pk?: boolean;
      settings?: unknown;
    }> = [];
    for (const raw of body.columns) {
      if (!raw || typeof raw !== "object") {
        throw new HTTPException(400, {
          message: "each column needs name and type",
        });
      }
      const col = raw as {
        name?: unknown;
        type?: unknown;
        pk?: unknown;
        settings?: unknown;
      };
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
        settings:
          col.settings !== undefined && typeof col.settings === "object"
            ? col.settings
            : undefined,
      });
    }

    const result = await enqueueWrite(() =>
      ddlJord.createTable({
        name: body.name as string,
        columns: columns as never,
        schema,
        foreignKeys: Array.isArray(body.foreignKeys)
          ? (body.foreignKeys as never)
          : undefined,
      }),
    );
    if (!result.ok) {
      const status = result.error === "table_exists" ? 409 : 400;
      return c.json(
        { error: result.error, message: result.message },
        status,
      );
    }
    // Opt-in capture: mark newly created tables tracked (S0023).
    await outbox.setTracked(body.name as string, true, schema);
    await syncPoliciesRls();
    const info = await deps.jord.describeTable(body.name, schema);
    return c.json({ ok: true as const, sql: result.sql, table: info }, 201);
  });

  protectedRoutes.get("/schema/tables/:name/rows", async (c) => {
    const name = c.req.param("name");
    const principal = c.get("principal");
    const schema = await resolveSchemaQuery(c);
    const decision = await decide(principal, name, "select", { schema });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "select"), 403);
    }
    const limit = Number(c.req.query("limit") ?? "50");
    const offset = Number(c.req.query("offset") ?? "0");
    const includeTotal =
      c.req.query("total") === "1" || c.req.query("total") === "true";
    const result = await deps.jord.listTableRows({
      table: name,
      schema,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
      includeTotal,
      rowScope: principal.kind === "service" ? undefined : decision.scope,
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
      const principal = c.get("principal");
      const schema = await resolveSchemaQuery(c);
      const decision = await decide(principal, name, "insert", {
        row: null,
        nextRow: body.values as Record<string, unknown>,
        schema,
      });
      if (!decision.allowed) {
        return c.json(policyDeniedBody(decision, "insert"), 403);
      }
      const values =
        principal.kind === "service"
          ? { ...(body.values as Record<string, unknown>) }
          : stampInsertScope(decision.scope, body.values as Record<string, unknown>);
      if (!values) {
        return c.json(policyDeniedBody({ allowed: false }, "insert"), 403);
      }
      const info = await deps.jord.describeTable(name, schema);
      const pkCol = info?.columns.find((col) => col.pk)?.name ?? "id";
      const pkRaw = values[pkCol];
      const result = await writeChangeAs(principal)(
        () => deps.jord.insertTableRow({ table: name, schema, values }),
        (inserted) =>
          inserted.ok
            ? {
                table: name,
                schema,
                op: "insert",
                id: pkRaw == null ? "" : String(pkRaw),
                newRow: values,
              }
            : null,
      );
      if (!result.ok) {
        return c.json(
          {
            error: result.error,
            message: result.message,
            ...(result.field
              ? { field: result.field, reason: result.reason ?? result.message }
              : {}),
          },
          tableRowStatus(result.error),
        );
      }
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
        old?: unknown;
      } | null;
      if (!body || body.values == null || typeof body.values !== "object") {
        throw new HTTPException(400, { message: "values object is required" });
      }
      const values = body.values as Record<string, unknown>;
      const old =
        body.old != null && typeof body.old === "object" && !Array.isArray(body.old)
          ? (body.old as Record<string, unknown>)
          : undefined;
      const principal = c.get("principal");
      const schema = await resolveSchemaQuery(c);
      const existing = await readUserTableRow(name, pk, schema);
      const decision = await decide(principal, name, "update", {
        row: existing,
        nextRow: values,
        schema,
      });
      if (!decision.allowed) {
        return c.json(policyDeniedBody(decision, "update"), 403);
      }
      if (
        principal.kind !== "service" &&
        scopeColumns(decision.scope).some(
          (column) => !ownerUnchanged(existing, values, column),
        )
      ) {
        return c.json(
          {
            error: "policy_denied",
            reason: "owner_changed",
            operation: "update",
          },
          403,
        );
      }
      const result = await writeChangeAs(principal)(
        () =>
          deps.jord.updateTableRow({
            table: name,
            schema,
            pk,
            values,
            ...(old ? { old } : {}),
          }),
        (updated) =>
          updated.ok
            ? {
                table: name,
                schema,
                op: "update",
                id: pk,
                oldRow: existing,
                newRow: { ...(existing ?? {}), ...values },
              }
            : null,
      );
      if (!result.ok) {
        return c.json(
          {
            error: result.error,
            message: result.message,
            ...(result.field
              ? { field: result.field, reason: result.reason ?? result.message }
              : {}),
          },
          tableRowStatus(result.error),
        );
      }
      return c.json({ ok: true as const });
    },
  );

  protectedRoutes.delete(
    "/schema/tables/:name/rows/:pk",
    requireWriteTableRows(),
    async (c) => {
      const name = c.req.param("name");
      const pk = c.req.param("pk");
      const principal = c.get("principal");
      const schema = await resolveSchemaQuery(c);
      const existing = await readUserTableRow(name, pk, schema);
      const decision = await decide(principal, name, "delete", {
        row: existing,
        schema,
      });
      if (!decision.allowed) {
        return c.json(policyDeniedBody(decision, "delete"), 403);
      }
      const result = await writeChangeAs(principal)(
        () => deps.jord.deleteTableRow({ table: name, schema, pk }),
        (deleted) =>
          deleted.ok
            ? {
                table: name,
                schema,
                op: "delete",
                id: pk,
                oldRow: existing,
                newRow: null,
              }
            : null,
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          tableRowStatus(result.error),
        );
      }
      return c.json({ ok: true as const });
    },
  );

  protectedRoutes.put(
    "/schema/tables/:name/rls",
    requireAlterSchema(),
    async (c) => {
      const name = c.req.param("name");
      const body = (await c.req.json().catch(() => null)) as {
        rls_enabled?: unknown;
        owner_column?: unknown;
      } | null;
      if (!body || typeof body.rls_enabled !== "boolean") {
        throw new HTTPException(400, {
          message: "rls_enabled (boolean) is required",
        });
      }
      if (
        body.owner_column !== undefined &&
        body.owner_column !== null &&
        typeof body.owner_column !== "string"
      ) {
        throw new HTTPException(400, {
          message: "owner_column must be a string or null",
        });
      }
      const schema = await resolveSchemaQuery(c);
      const saved = await deps.jord.setTableRls({
        tableName: name,
        schema,
        rlsEnabled: body.rls_enabled,
        ownerColumn:
          body.owner_column === undefined
            ? undefined
            : (body.owner_column as string | null),
      });
      await syncPoliciesRls();
      return c.json({
        table_name: saved.tableName,
        schema: saved.schema ?? schema,
        rls_enabled: saved.rlsEnabled,
        owner_column: saved.ownerColumn,
      });
    },
  );

  protectedRoutes.put(
    "/schema/tables/:name/track",
    requireAlterSchema(),
    async (c) => {
      const name = c.req.param("name");
      const body = (await c.req.json().catch(() => null)) as {
        tracked?: unknown;
      } | null;
      if (!body || typeof body.tracked !== "boolean") {
        throw new HTTPException(400, {
          message: "tracked (boolean) is required",
        });
      }
      const schema = await resolveSchemaQuery(c);
      if (name !== REALTIME_V1_TABLE) {
        const info = await deps.jord.describeTable(name, schema);
        if (!info) {
          throw new HTTPException(404, { message: "table not found" });
        }
      }
      await outbox.setTracked(name, body.tracked, schema);
      return c.json({ table_name: name, tracked: body.tracked });
    },
  );

  protectedRoutes.get("/schema/tables/:name", async (c) => {
    const name = c.req.param("name");
    if (!isValidSqlIdent(name)) {
      throw new HTTPException(400, { message: "invalid table name" });
    }
    const schema = await resolveSchemaQuery(c);
    const info = await deps.jord.describeTable(name, schema);
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
      const body = await c.req.json<{
        name?: string;
        type?: string;
        settings?: unknown;
        confirm?: unknown;
      }>();
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
      const schema = await resolveSchemaQuery(c);
      const preview =
        isValidSqlIdent(table) && isValidSqlIdent(body.name)
          ? buildAddColumnSql(
              table,
              body.name,
              type,
              deps.jord.dialect === "postgres" ? schema : undefined,
              typeof body.settings === "object" && body.settings
                ? (body.settings as never)
                : undefined,
              deps.jord.dialect === "postgres" ? "postgres" : "libsql",
            )
          : null;

      const result = await enqueueWrite(() =>
        ddlJord.addColumn({
          table,
          name: body.name!,
          type,
          schema,
          settings:
            body.settings !== undefined
              ? (body.settings as never)
              : undefined,
          confirm: body.confirm === true,
        }),
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

      const info = await deps.jord.describeTable(table, schema);
      return c.json({ ok: true as const, sql: preview, table: info }, 201);
    },
  );

  protectedRoutes.delete(
    "/schema/tables/:name",
    requireAlterSchema(),
    async (c) => {
      const name = c.req.param("name");
      const schema = await resolveSchemaQuery(c);
      const body = (await c.req.json().catch(() => null)) as {
        confirm?: unknown;
      } | null;
      const result = await enqueueWrite(() =>
        ddlJord.dropTable({
          name,
          schema,
          confirm: body?.confirm === true,
        }),
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
      const schema = await resolveSchemaQuery(c);
      const result = await enqueueWrite(() =>
        ddlJord.renameTable({ name, newName: body.name as string, schema }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      await syncPoliciesRls();
      const info = await deps.jord.describeTable(body.name as string, schema);
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
        settings?: unknown;
        confirm?: unknown;
      } | null;
      if (!body) {
        throw new HTTPException(400, { message: "JSON body is required" });
      }
      const patch: {
        name?: string;
        type?: JordColumnType;
        settings?: unknown;
        confirm?: boolean;
      } = {};
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
      if (body.settings !== undefined) {
        patch.settings = body.settings;
      }
      patch.confirm = body.confirm === true;
      if (
        patch.name === undefined &&
        patch.type === undefined &&
        patch.settings === undefined
      ) {
        throw new HTTPException(400, {
          message: "name, type, and/or settings is required",
        });
      }
      const schema = await resolveSchemaQuery(c);
      const result = await enqueueWrite(() =>
        ddlJord.alterColumn({
          table,
          schema,
          column,
          name: patch.name,
          type: patch.type,
          settings: patch.settings as never,
          confirm: patch.confirm,
        }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      await syncPoliciesRls();
      const info = await deps.jord.describeTable(table, schema);
      return c.json({ ok: true as const, table: info });
    },
  );

  protectedRoutes.delete(
    "/schema/tables/:name/columns/:column",
    requireAlterSchema(),
    async (c) => {
      const table = c.req.param("name");
      const column = c.req.param("column");
      const schema = await resolveSchemaQuery(c);
      const body = (await c.req.json().catch(() => null)) as {
        confirm?: unknown;
      } | null;
      const result = await enqueueWrite(() =>
        ddlJord.dropColumn({
          table,
          schema,
          column,
          confirm: body?.confirm === true,
        }),
      );
      if (!result.ok) {
        return c.json(
          { error: result.error, message: result.message },
          schemaDdlStatus(result.error),
        );
      }
      await syncPoliciesRls();
      const info = await deps.jord.describeTable(table, schema);
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
      await ddlJord.syncRecordsPoliciesRls?.();
    } catch (err) {
      console.error("[@altr/jord-server] rls sync failed", err);
      throw new HTTPException(500, { message: "rls_sync_failed" });
    }
  }

  async function readUserTableRow(
    table: string,
    pk: string,
    schema?: string,
  ): Promise<Record<string, unknown> | null> {
    if (!isValidSqlIdent(table)) return null;
    const info = await deps.jord.describeTable(table, schema);
    const pkCol = info?.columns.find((col) => col.pk)?.name;
    if (!pkCol || !isValidSqlIdent(pkCol)) return null;
    // libSQL has one schema; keep its SQL unqualified. Postgres always qualifies.
    const target =
      deps.jord.dialect === "postgres"
        ? quoteQualified(info?.schema ?? deps.jord.defaultSchema, table)
        : quoteIdent(table);
    const sql = `SELECT * FROM ${target} WHERE ${quoteIdent(pkCol)} = ? LIMIT 1`;
    const rows =
      deps.jord.dialect === "postgres"
        ? await deps.jord.query(sql.replace("?", "$1"), [pk])
        : await deps.jord.query(sql, [pk]);
    return rows[0] ?? null;
  }

  function decide(
    principal: Principal,
    tableName: string,
    operation: JordPolicyOperation,
    extra?: {
      bucket?: string | null;
      row?: Record<string, unknown> | null;
      nextRow?: Record<string, unknown> | null;
      /** Schema of `tableName` for the `jord_table_rls` lookup. */
      schema?: string;
    },
  ) {
    return evaluatePolicies({
      jord: deps.jord,
      tableName,
      schema: extra?.schema,
      operation,
      role: principal.role,
      subject: principal.kind,
      uid: principal.uid ?? null,
      claims: principal.claims,
      bypass: principal.kind === "service",
      bucket: extra?.bucket,
      row: extra?.row,
      nextRow: extra?.nextRow,
      disabled: policiesOff,
    });
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

    const principal = c.get("principal");
    const role = stepRole(principal);
    const decision = await decide(principal, V1_TABLE, "insert", {
      bucket: body.bucket,
      nextRow: {
        bucket: body.bucket,
        body: body.body,
        metadata: body.metadata ?? null,
      },
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "insert"), 403);
    }

    deps.jord.bindRlsSession?.(rlsSessionFor(principal, body.bucket));
    const write = writeChangeAs(principal);
    const row = await write(
      () =>
        deps.jord.insertRecord({
          bucket: body.bucket!,
          body: body.body!,
          metadata: body.metadata,
        }),
      (inserted) => ({
        op: "insert",
        id: inserted.id,
        version: inserted.version,
        newRow: recordChangeRow(inserted),
      }),
    );
    await runTriggersAfterWrite({
      jord: deps.jord,
      logs,
      tableName: V1_TABLE,
      event: "insert",
      row,
      role,
      subject: principal.kind,
      uid: principal.uid,
      enqueueWrite: enqueueWrite,
      disabled: triggersOff,
      writeChange: write,
    });
    return c.json(publicRecord(row), 201);
  });

  recordsRoutes.get("/", async (c) => {
    const bucket = c.req.query("bucket");
    const decision = await decide(c.get("principal"), V1_TABLE, "select", {
      bucket: bucket ?? null,
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "select"), 403);
    }
    if (!bucket) {
      throw new HTTPException(400, { message: "query bucket= is required" });
    }
    deps.jord.bindRlsSession?.(rlsSessionFor(c.get("principal"), bucket));
    const rows = await deps.jord.listRecordsByBucket(bucket);
    return c.json(rows.map(publicRecord));
  });

  recordsRoutes.get("/:id", async (c) => {
    const row = await deps.jord.getRecord(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "record not found" });
    }
    const decision = await decide(c.get("principal"), V1_TABLE, "select", {
      bucket: row.bucket,
      row: {
        id: row.id,
        bucket: row.bucket,
        body: row.body,
        metadata: row.metadata,
        version: row.version,
      },
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "select"), 403);
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
    const principal = c.get("principal");
    const role = stepRole(principal);
    const decision = await decide(principal, V1_TABLE, "update", {
      bucket: body.bucket ?? existing.bucket,
      row: {
        id: existing.id,
        bucket: existing.bucket,
        body: existing.body,
        metadata: existing.metadata,
        version: existing.version,
      },
      nextRow: {
        bucket: body.bucket ?? existing.bucket,
        body: body.body ?? existing.body,
        metadata: body.metadata === undefined ? existing.metadata : body.metadata,
        version: body.version,
      },
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "update"), 403);
    }

    deps.jord.bindRlsSession?.(
      rlsSessionFor(principal, body.bucket ?? existing.bucket),
    );
    const write = writeChangeAs(principal);
    const result = await write(
      () =>
        deps.jord.updateRecord({
          id,
          version: body.version!,
          body: body.body,
          metadata: body.metadata,
          bucket: body.bucket,
        }),
      (updated) =>
        updated.ok
          ? {
              op: "update",
              id: updated.record.id,
              version: updated.record.version,
              oldRow: recordChangeRow(existing),
              newRow: recordChangeRow(updated.record),
            }
          : null,
    );

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
      subject: principal.kind,
      uid: principal.uid,
      enqueueWrite: enqueueWrite,
      disabled: triggersOff,
      writeChange: write,
    });
    return c.json(publicRecord(result.record));
  });

  recordsRoutes.delete("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const existing = await deps.jord.getRecord(id);
    if (!existing) {
      throw new HTTPException(404, { message: "record not found" });
    }
    const principal = c.get("principal");
    const role = stepRole(principal);
    const decision = await decide(principal, V1_TABLE, "delete", {
      bucket: existing.bucket,
      row: {
        id: existing.id,
        bucket: existing.bucket,
        body: existing.body,
        metadata: existing.metadata,
        version: existing.version,
      },
    });
    if (!decision.allowed) {
      return c.json(policyDeniedBody(decision, "delete"), 403);
    }
    deps.jord.bindRlsSession?.(rlsSessionFor(principal, existing.bucket));
    const write = writeChangeAs(principal);
    const deleted = await write(
      () => deps.jord.deleteRecord(id),
      (removed) =>
        removed
          ? { op: "delete", id, oldRow: recordChangeRow(existing), newRow: null }
          : null,
    );
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
      subject: principal.kind,
      uid: principal.uid,
      enqueueWrite: enqueueWrite,
      disabled: triggersOff,
      writeChange: write,
    });
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
      const sinceRaw = c.req.query("since");
      const principal = c.get("principal");
      if (table === REALTIME_V1_TABLE) {
        const decision = await decide(principal, REALTIME_V1_TABLE, "select");
        if (!decision.allowed) {
          return c.json(policyDeniedBody(decision, "select"), 403);
        }
      }
      if (sinceRaw != null && sinceRaw !== "") {
        if (!/^\d+$/.test(sinceRaw)) {
          throw new HTTPException(400, { message: "since must be an integer" });
        }
        const since = Number(sinceRaw);
        const floor = await outbox.minSeq();
        const expired =
          floor == null
            ? since > 0
            : since < floor - 1;
        if (expired) {
          return c.json(
            {
              error: "gone",
              message: "since is older than the retained change log",
              hint: "resync",
              floor,
            },
            410,
          );
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

      const accessExp = c.get("accessExp");
      const since =
        sinceRaw != null && sinceRaw !== "" && /^\d+$/.test(sinceRaw)
          ? Number(sinceRaw)
          : null;
      return streamSSE(c, async (stream) => {
        if (since != null) {
          const catchup = await outbox.listAfter(since, { table });
          for (const row of catchup) {
            if (idFilter && row.op !== "resync" && row.pk !== idFilter) continue;
            const event = outbox.toEvent(row);
            if (!(await deliveryAllowed(principal, event, row))) continue;
            await stream.writeSSE({
              event: "jord.change",
              data: JSON.stringify(event),
            });
          }
        }

        let sendChain: Promise<void> = Promise.resolve();
        const unsubscribe = realtime.trySubscribeFiltered(
          { table, id: idFilter },
          (event) => {
            sendChain = sendChain.then(async () => {
              if (!(await canDeliverLive(principal, event))) return;
              await stream.writeSSE({
                event: "jord.change",
                data: JSON.stringify(event),
              });
            }).catch((err) => {
              console.error("[@altr/jord-server] sse send failed", err);
            });
          },
        );
        if (!unsubscribe) return;

        const timer = setInterval(() => {
          void stream.writeSSE({ event: "ping", data: "ping" });
        }, 15_000);

        // S0083: a revoked/expired session (S0076) drops the stream.
        let nextSessionCheck = Date.now() + realtimeRecheckMs;
        try {
          while (!stream.aborted) {
            if (accessExp != null && Date.now() >= accessExp) {
              await stream.writeSSE({
                event: "expired",
                data: "token_expired",
              });
              break;
            }
            if (Date.now() >= nextSessionCheck) {
              nextSessionCheck = Date.now() + realtimeRecheckMs;
              if (!(await principalSessionLive(deps.jord, principal))) {
                await stream.writeSSE({
                  event: "expired",
                  data: "session_revoked",
                });
                break;
              }
            }
            await stream.sleep(Math.min(1000, realtimeRecheckMs));
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
        const decision = await decide(
          c.get("principal"),
          REALTIME_V1_TABLE,
          "select",
        );
        if (!decision.allowed) {
          return c.json(policyDeniedBody(decision, "select"), 403);
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
      let expTimer: { clear(): void } | null = null;
      let sessionTimer: ReturnType<typeof setInterval> | null = null;
      const accessExp = c.get("accessExp");
      const principal = c.get("principal");
      let sendChain: Promise<void> = Promise.resolve();

      return {
        onOpen(_evt, ws) {
          if (accessExp != null) {
            // Clamped + re-armed: a far-future exp must not fire at once.
            expTimer = setDeadline(accessExp, () => {
              try {
                ws.close(4401, "token_expired");
              } catch {
                /* already closed */
              }
            });
          }
          unsubscribe = realtime.trySubscribeFiltered(
            { table, id: idFilter },
            (event) => {
              // Same per-event policy decision as SSE (SF-1); ordered.
              sendChain = sendChain.then(async () => {
                if (!(await canDeliverLive(principal, event))) return;
                try {
                  ws.send(JSON.stringify(event));
                } catch (err) {
                  console.error("[@altr/jord-server] ws send failed", err);
                }
              });
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
          // S0083: a revoked/expired session (S0076) drops the socket.
          sessionTimer = setInterval(() => {
            void principalSessionLive(deps.jord, principal).then((live) => {
              if (live) return;
              try {
                ws.close(4401, "session_revoked");
              } catch {
                /* already closed */
              }
            });
          }, realtimeRecheckMs);
        },
        onMessage(evt, ws) {
          const raw = typeof evt.data === "string" ? evt.data : "";
          if (raw.includes("pong")) return;
          // v1: ignore other client messages
          void ws;
        },
        onClose() {
          if (pingTimer) clearInterval(pingTimer);
          expTimer?.clear();
          if (sessionTimer) clearInterval(sessionTimer);
          unsubscribe?.();
        },
        onError() {
          if (pingTimer) clearInterval(pingTimer);
          expTimer?.clear();
          if (sessionTimer) clearInterval(sessionTimer);
          unsubscribe?.();
        },
      };
    }),
  );

  // S0083 — presence + broadcast. Policy check runs before upgrade: a
  // denied caller gets HTTP 403 and never becomes a hub member.
  async function readChannelRow(table: string, id: string) {
    if (table === REALTIME_V1_TABLE) {
      const rec = await deps.jord.getRecord(id);
      if (!rec) return null;
      return {
        row: {
          id: rec.id,
          bucket: rec.bucket,
          body: rec.body,
          metadata: rec.metadata,
          version: rec.version,
        },
        bucket: rec.bucket,
      };
    }
    const row = await readUserTableRow(table, id);
    return row ? { row } : null;
  }
  function channelPrincipalKeyFor(c: {
    get(key: "principal"): Principal;
    req: { header(name: string): string | undefined };
    env?: unknown;
  }): string {
    const incoming = (
      c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined
    )?.incoming;
    return channelPrincipalKey(
      c.get("principal"),
      c.req.header("x-forwarded-for"),
      incoming?.socket?.remoteAddress ?? null,
    );
  }
  function authorizeChannelFor(principal: Principal, ref: ChannelRef) {
    return authorizeChannel({
      principal,
      ref,
      decide: (p, table, op, extra) => decide(p, table, op, extra),
      readRow: readChannelRow,
    });
  }

  protectedRoutes.get(
    "/realtime/channel",
    requireSubscribeRealtime(),
    async (c, next) => {
      const ref = parseChannelRef(c.req.query("channel"));
      if ("error" in ref) {
        throw new HTTPException(400, { message: ref.error });
      }
      const verdict = await authorizeChannelFor(c.get("principal"), ref);
      if (!verdict.allowed) {
        return c.json(deniedChannelBody(ref.channel), 403);
      }
      const full = presence.canAdmit(
        ref.channel,
        channelPrincipalKeyFor(c),
      );
      if (full === "principal_full") {
        return c.json(
          {
            error: "too_many_connections",
            message: "too many presence sockets for this principal",
          },
          429,
        );
      }
      if (full) {
        return c.json(
          { error: "realtime_full", message: `presence ${full}` },
          503,
        );
      }
      await next();
    },
    upgradeWebSocket((c) => {
      const ref = parseChannelRef(c.req.query("channel")) as ChannelRef;
      const principal = c.get("principal");
      return channelSocketHandlers({
        hub: presence,
        channel: ref.channel,
        // Cap re-checked inside hub.connect (concurrent upgrades race here).
        identity: {
          principalKey: channelPrincipalKeyFor(c),
          kind: principal.kind,
        },
        accessExp: c.get("accessExp"),
        recheckMs: realtimeRecheckMs,
        recheck: async () => {
          if (!(await principalSessionLive(deps.jord, principal))) {
            return { ok: false, code: 4401, reason: "session_revoked" };
          }
          const again = await authorizeChannelFor(principal, ref);
          return again.allowed
            ? { ok: true }
            : { ok: false, code: 4403, reason: "access_revoked" };
        },
      });
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

    const job = await enqueueWrite(() =>
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

    const job = await enqueueWrite(() =>
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
    const deleted = await enqueueWrite(() => deps.jord.deleteJob(id));
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

    const row = await enqueueWrite(() =>
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

    const row = await enqueueWrite(() =>
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
    const result = await enqueueWrite(() => deps.jord.deleteFunction(id));
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
        role: stepRole(c.get("principal")),
        policyBypass: c.get("principal").kind === "service",
        subject: c.get("principal").kind,
        uid: c.get("principal").uid,
        enqueueWrite: enqueueWrite,
        logs,
        writeChange: writeChangeAs(c.get("principal")),
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

    const row = await enqueueWrite(() =>
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

    const row = await enqueueWrite(() =>
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
    const deleted = await enqueueWrite(() =>
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

    if (!isCustomApiExposed(api, customApiDisabled)) {
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
      role: stepRole(c.get("principal")),
      policyBypass: c.get("principal").kind === "service",
      subject: c.get("principal").kind,
      uid: c.get("principal").uid,
      enqueueWrite: enqueueWrite,
      logs,
      writeChange: writeChangeAs(c.get("principal")),
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
    await assertPolicyTable(deps.jord, tableName, await resolveSchemaQuery(c));
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

    const row = await enqueueWrite(async () => {
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
    if (body.table_name !== undefined) {
      await assertPolicyTable(
        deps.jord,
        body.table_name,
        await resolveSchemaQuery(c),
      );
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

    const row = await enqueueWrite(async () => {
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
    const deleted = await enqueueWrite(async () => {
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

    const row = await enqueueWrite(() =>
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

    const row = await enqueueWrite(() =>
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
    const deleted = await enqueueWrite(() => deps.jord.deleteTrigger(id));
    if (!deleted) {
      throw new HTTPException(404, { message: "trigger not found" });
    }
    return c.json({ ok: true as const, id });
  });

  registerBlobRoutes(protectedRoutes, {
    jord: deps.jord,
    enqueueWrite: enqueueWrite,
    storage,
    resolveBucket: (name) => bucketResolver.resolveBucket(name),
    hmacSecret,
    maxBytes: maxBlobBytes,
    env,
    localRoot: blobsRoot,
  });

  registerVectorRoutes(protectedRoutes, {
    jord: deps.jord,
    enqueueWrite: enqueueWrite,
  });

  protectedRoutes.route(
    "/api/v1",
    createTableApiRoutes({
      jord: deps.jord,
      writeChangeAs,
      generatedRecordsEnabled: () => generatedApi.isEnabled("records"),
      // S0080: bulk/RPC body cap + RPC runner deps (same as /x/:slug).
      maxJsonBytes: resolveMaxJsonBytes(env),
      rpc: { enqueueWrite, logs, stepRole, customApiDisabled },
    }),
  );

  const sqlLogs =
    logs instanceof LogBatcher
      ? logs
      : new LogBatcher(deps.jord);
  if (!(logs instanceof LogBatcher)) sqlLogs.start();
  protectedRoutes.route(
    "/sql",
    createSqlRoutes({
      jord: deps.jord,
      enqueueWrite: enqueueWrite,
      logs: sqlLogs,
      resyncTracked: resyncTrackedAs,
    }),
  );

  protectedRoutes.post("/migrate/jobs", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    const body = (await c.req.json().catch(() => ({}))) as { targetUrl?: string };
    const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
    if (!targetUrl) {
      throw new HTTPException(400, { message: "targetUrl required" });
    }
    let job;
    try {
      job = await startMigrateJob({ source: deps.jord, targetUrl });
    } catch (err) {
      if (err instanceof MigrateTargetError) {
        throw new HTTPException(400, { message: err.message });
      }
      throw err;
    }
    // No resync here (B4): the wizard only reads this database and writes the
    // external target, whose subscribers live on another server.
    runMigrateJob({ source: deps.jord, jobId: job.id }).catch((err) => {
      console.error("[@altr/jord-server] migrate job failed", err);
    });
    return c.json({
      job: {
        id: job.id,
        status: job.status,
        phase: job.phase,
        tables: job.tables,
        targetScheme: job.targetScheme,
      },
    }, 201);
  });

  protectedRoutes.get("/migrate/jobs/:id", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    const job = await getMigrateJob(deps.jord, c.req.param("id"));
    if (!job) throw new HTTPException(404, { message: "job not found" });
    return c.json({
      job: {
        id: job.id,
        status: job.status,
        phase: job.phase,
        tables: job.tables,
        counts: job.counts,
        targetScheme: job.targetScheme,
        errorText: job.errorText,
      },
    });
  });

  protectedRoutes.get("/admin/users", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    return c.json({ users: await listUsers(deps.jord) });
  });

  protectedRoutes.post("/admin/users/:id/disable", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    const body = (await c.req.json().catch(() => ({}))) as { disabled?: boolean };
    const user = await setUserDisabled({
      jord: deps.jord,
      userId: c.req.param("id"),
      disabled: body.disabled !== false,
    });
    if (!user) throw new HTTPException(404, { message: "user not found" });
    return c.json({ user });
  });

  protectedRoutes.post("/admin/users/:id/revoke", async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "operator" || principal.role !== "admin") {
      throw new HTTPException(403, { message: "admin operator only" });
    }
    const result = await revokeUserSessions({
      jord: deps.jord,
      userId: c.req.param("id"),
    });
    return c.json(result);
  });

  // S0069 — auth settings document (admin-only; enforced inside /auth/*).
  protectedRoutes.route(
    "/admin/auth",
    createAuthSettingsRoutes({
      jord: deps.jord,
      enqueueWrite,
      keyring: jwtKeyring,
      mailer,
      rateLimit: rateLimitStore,
    }),
  );
  // S0075 — OAuth provider config (client secret is write-only).
  protectedRoutes.route(
    "/admin/auth",
    createOAuthAdminRoutes({ jord: deps.jord, enqueueWrite, secrets }),
  );
  // S0070 — admin user CRUD (create/invite, metadata, ban, delete, revoke).
  protectedRoutes.route(
    "/admin/auth",
    createAdminAuthUserRoutes({
      jord: deps.jord,
      mailer,
      enqueueWrite,
    }),
  );
  // S0043 — project registry (admin-only; secrets required for mutate/list).
  protectedRoutes.route("/admin", createProjectRoutes(projectRegistry));
  // S0095 — per-project stats (admin-only, read-only, partial-tolerant).
  protectedRoutes.route(
    "/admin",
    createProjectStatsRoutes(projectRegistry, {
      queuePending: () => deps.enqueueWrite.pending(),
      realtime: attachRealtimeCounters(realtime),
    }),
  );
  // S0067 — bucket config API (admin-only; secrets for s3-family credentials).
  protectedRoutes.route("/admin", createBucketAdminRoutes(bucketAdmin));
  // S0077 — policy tester "run as user" (admin-only, read-only, audited).
  protectedRoutes.route(
    "/admin",
    createPolicyEvaluateRoutes({
      jord: deps.jord,
      enqueueWrite,
      rateLimit: rateLimitStore,
      jwt: { iss: deps.auth.jwtIss, aud: deps.auth.jwtAud },
      // Same `records` 503 gate as the table API; policy env is process.env on both sides.
      generatedRecordsEnabled: () => generatedApi.isEnabled("records"),
    }),
  );
  // S0093 — blob signing key set: rotate / revoke-previous (admin-only).
  protectedRoutes.route(
    "/admin/storage/keys",
    createBlobKeyRoutes({ jord: deps.jord, keys: blobKeys }),
  );
  // S0045 — Studio project catalog / resolve (any authenticated principal).
  protectedRoutes.route("/studio", createStudioProjectRoutes(projectRegistry));

  app.route("/", protectedRoutes);

  async function stopRealtimeListen(): Promise<void> {
    await listenStarted?.catch(() => undefined);
    await listenBridge?.stop();
    listenBridge = null;
    // S0083: close presence sockets and the NOTIFY peer connection.
    if (!deps.presence) presence.close();
    await presenceTransport?.stop();
    presenceTransport = null;
  }

  return Object.assign(app, { injectWebSocket, stopRealtimeListen, secrets });
}

export type JordApp = ReturnType<typeof createJordApp>;
