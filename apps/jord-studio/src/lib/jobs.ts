export const BUILTIN_JOB_KINDS = [
  "wal_checkpoint",
  "echo",
  "records_count",
] as const;

export type BuiltinJobKind = (typeof BUILTIN_JOB_KINDS)[number];

export type PublicJob = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  interval_ms: number;
  config: string;
  next_run_at: number | null;
  last_run_at: number | null;
  last_status: "ok" | "error" | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
};

export type PublicJobRun = {
  id: string;
  job_id: string;
  status: "running" | "ok" | "error";
  started_at: number;
  finished_at: number | null;
  error: string | null;
  result: string | null;
};

export type LogEvent = {
  id: string;
  at: number;
  level: "info" | "warn" | "error";
  source: "http" | "job" | "system";
  message: string;
  meta?: Record<string, unknown>;
};

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString();
}
