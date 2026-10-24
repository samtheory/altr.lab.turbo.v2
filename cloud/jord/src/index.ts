import { createJordClient } from "@altr/jord";
import { serve } from "@hono/node-server";

import { createJordApp } from "./app.js";
import { resolveAuthConfig } from "./auth/index.js";
import {
  LogRing,
  seedDefaultJobs,
  startJobScheduler,
} from "./jobs/index.js";
import { loadLocalEnv } from "./load-env.js";
import { createWriteQueue } from "./queue.js";
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
export { createWriteQueue } from "./queue.js";
export {
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  RealtimeBus,
  REALTIME_V1_TABLE,
  type JordChangeEvent,
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
  const auth = resolveAuthConfig(env);
  const jord = await createJordClient({
    url: env.DATABASE_URL,
  });
  const enqueueWrite = createWriteQueue();
  const logs = new LogRing();
  await seedDefaultJobs(jord);
  const scheduler = startJobScheduler({ jord, enqueueWrite, logs });
  const app = createJordApp({
    jord,
    enqueueWrite,
    auth,
    logs,
    scheduler,
  });
  const useWal = jord.dialect === "libsql";
  const hygiene = useWal
    ? startWalHygiene(jord, resolveWalCheckpointMs(env))
    : { stop() {} };

  const port = Number(env.PORT) || DEFAULT_PORT;
  const server = serve({ fetch: app.fetch, port });
  app.injectWebSocket(server);

  const scheme = jord.dialect === "postgres" ? "postgres" : "file";
  console.log(
    `[@altr/jord-server] dialect=${jord.dialect} scheme=${scheme}`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    scheduler.stop();
    hygiene.stop();
    if (useWal) {
      console.log(`[@altr/jord-server] ${signal} — wal_checkpoint(TRUNCATE)`);
      try {
        await truncateWalCheckpoint(jord);
      } catch (err) {
        console.error("[@altr/jord-server] shutdown checkpoint failed", err);
      }
    } else {
      console.log(`[@altr/jord-server] ${signal} — shutting down`);
    }
    await jord.close();
    server.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  console.log(`[@altr/jord-server] listening on http://127.0.0.1:${port}`);

  return {
    async close() {
      scheduler.stop();
      hygiene.stop();
      if (useWal) {
        await truncateWalCheckpoint(jord);
      }
      await jord.close();
      server.close();
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
