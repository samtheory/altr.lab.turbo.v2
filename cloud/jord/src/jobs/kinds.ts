import type { JordDriverPort, JordJob } from "@altr/jord";

export const BUILTIN_JOB_KINDS = [
  "wal_checkpoint",
  "echo",
  "records_count",
  "changes_prune",
  "blobs_gc",
  "shared_state_sweep",
  "sessions_gc",
] as const;

export type BuiltinJobKind = (typeof BUILTIN_JOB_KINDS)[number];

export function isBuiltinJobKind(value: string): value is BuiltinJobKind {
  return (BUILTIN_JOB_KINDS as readonly string[]).includes(value);
}

export type JobKindContext = {
  jord: JordDriverPort;
  job: JordJob;
};

export type JobKindResult = {
  result?: Record<string, unknown>;
};

export type JobKindHandler = (
  ctx: JobKindContext,
) => Promise<JobKindResult | void>;

function parseConfig(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export const JOB_KIND_HANDLERS: Record<BuiltinJobKind, JobKindHandler> = {
  async wal_checkpoint({ jord }) {
    await jord.checkpointTruncate();
    return { result: { ok: true, action: "wal_checkpoint" } };
  },

  async echo({ job }) {
    const config = parseConfig(job.config);
    const message =
      typeof config.message === "string" ? config.message : "echo";
    return { result: { echoed: message } };
  },

  async records_count({ jord, job }) {
    const config = parseConfig(job.config);
    const bucket =
      typeof config.bucket === "string" && config.bucket.length > 0
        ? config.bucket
        : "lab";
    const rows = await jord.listRecordsByBucket(bucket);
    return { result: { bucket, count: rows.length } };
  },

  async changes_prune({ jord, job }) {
    const { createOutbox, resolveRetention } = await import(
      "../realtime/outbox.js"
    );
    const config = parseConfig(job.config);
    const envDays =
      typeof config.days === "number" && config.days > 0
        ? config.days
        : undefined;
    const envRows =
      typeof config.rows === "number" && config.rows > 0
        ? config.rows
        : undefined;
    const defaults = resolveRetention();
    const outbox = createOutbox(jord);
    const result = await outbox.prune({
      days: envDays ?? defaults.days,
      rows: envRows ?? defaults.rows,
    });
    return { result };
  },

  async blobs_gc({ jord }) {
    const { gcExpiredPendingBlobs } = await import("../storage/lifecycle.js");
    const {
      createStorageFromEnv,
      resolveHmacSecret,
      resolvePublicBaseUrl,
    } = await import("../storage/factory.js");
    const { createBucketResolver } = await import(
      "../storage/resolve-bucket.js"
    );
    const { resolveBlobsRoot } = await import("../blobs/disk.js");
    const env = process.env;
    const factory = {
      env,
      blobsRoot: resolveBlobsRoot(env),
      hmacSecret: resolveHmacSecret(env, env.JORD_SERVER_TOKEN),
      publicBaseUrl: resolvePublicBaseUrl(env),
    };
    const storage = createStorageFromEnv(factory);
    const resolver = createBucketResolver({
      jord,
      envPort: storage,
      env,
      factory,
    });
    const resolveStorage = async (bucket: string) =>
      (await resolver.resolveBucket(bucket)).port;
    const result = await gcExpiredPendingBlobs({
      jord,
      storage,
      resolveStorage,
    });
    // S0081: abandoned multipart sessions (abort store parts, drop the row).
    const { gcExpiredUploads } = await import("../storage/multipart.js");
    const uploads = await gcExpiredUploads({ jord, resolveStorage });
    return { result: { ...result, ...uploads, errors: [...result.errors, ...uploads.errors] } };
  },

  async sessions_gc({ jord }) {
    const { gcSessions } = await import("../auth/sessions.js");
    return { result: await gcSessions(jord) };
  },

  async shared_state_sweep({ jord, job }) {
    const { sweepSharedState } = await import("../idempotency/sweep.js");
    const { resolveDataRateLimit } = await import("../http/data-rate-limit.js");
    const config = parseConfig(job.config);
    const windowMs = resolveDataRateLimit(process.env).windowMs;
    const rateRetainMs =
      typeof config.rate_retain_ms === "number" && config.rate_retain_ms > 0
        ? config.rate_retain_ms
        : Math.max(windowMs * 2, 60_000);
    const result = await sweepSharedState(jord, { rateRetainMs });
    return { result };
  },
};

export function getJobKindHandler(kind: string): JobKindHandler | null {
  if (!isBuiltinJobKind(kind)) return null;
  return JOB_KIND_HANDLERS[kind];
}
