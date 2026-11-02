import { createJordClient, JORD_TABLE_NAMES, runOwnerMigration } from "@altr/jord";
import { serve } from "@hono/node-server";

import { createJordApp } from "./app.js";
import { resolveAuthConfig } from "./auth/index.js";
import { assertPostgresMigrateUrl } from "./auth/pg-url.js";
import {
  seedDefaultJobs,
  startJobScheduler,
} from "./jobs/index.js";
import { ensureLocalDevMasterKey } from "./dev-master-key.js";
import { loadLocalEnv } from "./load-env.js";
import { createWriteQueue, resolveWriteConcurrency } from "./queue.js";
import { RealtimeBus } from "./realtime/index.js";
import { initTelemetry } from "./telemetry/index.js";
import {
  resolveWalCheckpointMs,
  startWalHygiene,
  truncateWalCheckpoint,
} from "./wal.js";

export { createJordApp } from "./app.js";
export {
  canAlterSchema,
  canInvokeApis,
  canManageApis,
  canManageBlobs,
  canManageJobs,
  canSubscribeRealtime,
  canWriteBlobs,
  canWriteRecords,
  canWriteTableRows,
  canWriteVectors,
  DEFAULT_SESSION_TTL_MS,
  isJordRole,
  JORD_ROLES,
  parseAuthorizationHeader,
  resolveAuthConfig,
  resolveBearerRole,
  signSessionToken,
  type JordAuthConfig,
  type JordRole,
  type JordSessionClaims,
} from "./auth/index.js";
export {
  createBlobDiskStore,
  resolveBlobsRoot,
  type BlobDiskStore,
} from "./blobs/index.js";
export {
  buildLocalToRemoteCopyPlan,
  clampSignTtlSeconds,
  createLocalStorageAdapter,
  createS3StorageAdapter,
  createStorageFromEnv,
  DEFAULT_SIGN_TTL_SECONDS,
  MAX_SIGN_TTL_SECONDS,
  type JordStoragePort,
  type PresignResult,
} from "./storage/index.js";
export {
  BUILTIN_STEP_KINDS,
  isBuiltinStepKind,
  isValidApiSlug,
  type BuiltinStepKind,
} from "./functions/index.js";
export {
  BUILTIN_POLICY_RULE_KINDS,
  isBuiltinPolicyRuleKind,
  type BuiltinPolicyRuleKind,
} from "./policies/index.js";
export {
  BUILTIN_TRIGGER_ACTION_KINDS,
  isBuiltinTriggerActionKind,
  type BuiltinTriggerActionKind,
} from "./triggers/index.js";
export {
  createGeneratedApiRegistry,
  GENERATED_API_RESOURCES,
  GeneratedApiRegistry,
  isGeneratedApiResourceId,
  type GeneratedApiOperation,
  type GeneratedApiResource,
  type GeneratedApiResourceId,
} from "./generated-api/index.js";
export {
  BUILTIN_JOB_KINDS,
  isBuiltinJobKind,
  LogRing,
  MIN_JOB_INTERVAL_MS,
  seedDefaultJobs,
  startJobScheduler,
  type JobScheduler,
  type LogEvent,
} from "./jobs/index.js";
export {
  createWriteQueue,
  resolveWriteConcurrency,
  DEFAULT_PG_WRITE_CONCURRENCY,
  PG_WRITE_CONCURRENCY_MAX,
  PG_WRITE_CONCURRENCY_MIN,
} from "./queue.js";
export {
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  RealtimeBus,
  REALTIME_V1_TABLE,
  createOutboxListenBridge,
  parseNotifyPayload,
  type JordChangeEvent,
  type OutboxListenBridge,
} from "./realtime/index.js";
export {
  DEFAULT_WAL_CHECKPOINT_MS,
  resolveWalCheckpointMs,
  startWalHygiene,
  truncateWalCheckpoint,
} from "./wal.js";

const DEFAULT_PORT = 8787;

export async function startJordServer(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ close: () => Promise<void> }> {
  loadLocalEnv();
  // Local DX: project registry needs AES master key (S0043). Auto-provision
  // outside production so Studio /projects works without a hand-written .env.
  const provisionedKey = ensureLocalDevMasterKey(env);
  if (provisionedKey && !process.env.JORD_MASTER_KEY_LOGGED) {
    console.info(
      "[jord] control-plane secret port enabled (JORD_MASTER_KEY from env or data/jord-master.key)",
    );
    process.env.JORD_MASTER_KEY_LOGGED = "1";
  }
  // OTel before the app so HTTP auto-instrumentation wraps Node serve.
  const telemetry = initTelemetry({ env, httpAutoInstrument: true });
  assertPostgresMigrateUrl(env);
  const auth = resolveAuthConfig(env);
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const postgres = /^postgres(ql)?:/i.test(databaseUrl);
  if (postgres) {
    const migrateUrl = env.JORD_MIGRATE_URL?.trim() ?? "";
    await runOwnerMigration(migrateUrl, [
      ...JORD_TABLE_NAMES,
      "jord_migrations",
      "jord_users",
      "jord_auth_tokens",
      "jord_refresh_tokens",
      "jord_table_rls",
      "jord_changes",
      "jord_tracked_tables",
      "jord_logs",
      "jord_sql_audit",
      "jord_migrate_jobs",
      "jord_projects",
      "jord_project_keys",
    ]);
  }
  const jord = await createJordClient({
    url: env.DATABASE_URL,
    postgresDdl: postgres ? false : undefined,
  });
  const ddl = postgres
    ? await createJordClient({ url: env.JORD_MIGRATE_URL, postgresDdl: true })
    : undefined;
  const writeConcurrency = resolveWriteConcurrency(
    env,
    jord.dialect === "postgres" ? "postgres" : "libsql",
  );
  const enqueueWrite = createWriteQueue({ concurrency: writeConcurrency });
  const realtime = new RealtimeBus();
  const { LogBatcher } = await import("./logs/batch.js");
  const logs = new LogBatcher(jord);
  logs.start();
  await seedDefaultJobs(jord);
  const scheduler = startJobScheduler({ jord, enqueueWrite, logs });
  const app = createJordApp({
    jord,
    ddl,
    enqueueWrite,
    auth,
    logs,
    scheduler,
    realtime,
    realtimeListenUrl: postgres ? databaseUrl : undefined,
    env,
  });
  const useWal = jord.dialect === "libsql" && jord.urlScheme === "file";
  const hygiene = useWal
    ? startWalHygiene(jord, resolveWalCheckpointMs(env))
    : { stop() {} };

  const port = Number(env.PORT) || DEFAULT_PORT;
  const server = serve({ fetch: app.fetch, port });
  app.injectWebSocket(server);

  console.log(
    `[@altr/jord-server] dialect=${jord.dialect} scheme=${jord.urlScheme}`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[@altr/jord-server] ${signal} — draining write queue`);
    scheduler.stop();
    hygiene.stop();
    await enqueueWrite.drain();
    await app.stopRealtimeListen();
    realtime.close();
    if (useWal) {
      console.log(`[@altr/jord-server] ${signal} — wal_checkpoint(TRUNCATE)`);
      try {
        await truncateWalCheckpoint(jord);
      } catch (err) {
        console.error("[@altr/jord-server] shutdown checkpoint failed", err);
      }
    }
    await jord.close();
    await ddl?.close();
    server.close();
    await telemetry.shutdown();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  console.log(`[@altr/jord-server] listening on http://127.0.0.1:${port}`);

  return {
    async close() {
      scheduler.stop();
      hygiene.stop();
      await enqueueWrite.drain();
      await app.stopRealtimeListen();
      realtime.close();
      if (useWal) {
        await truncateWalCheckpoint(jord);
      }
      await jord.close();
      await ddl?.close();
      server.close();
      await telemetry.shutdown();
    },
  };
}

// CLI entry when run as `tsx src/index.ts`
const isMain =
  process.argv[1] !== undefined &&
  /jord[\\/]src[\\/]index\.(ts|js)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  void startJordServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
