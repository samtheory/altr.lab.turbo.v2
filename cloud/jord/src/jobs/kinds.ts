import type { JordDriverPort, JordJob } from "@altr/jord";

export const BUILTIN_JOB_KINDS = [
  "wal_checkpoint",
  "echo",
  "records_count",
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
};

export function getJobKindHandler(kind: string): JobKindHandler | null {
  if (!isBuiltinJobKind(kind)) return null;
  return JOB_KIND_HANDLERS[kind];
}
