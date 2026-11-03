/** Project dashboard (S0096): stats types, pure helpers, snippet generators, fetch helper. */

export const STATS_WINDOWS = ["1h", "24h", "7d"] as const;
export type StatsWindow = (typeof STATS_WINDOWS)[number];
export const DEFAULT_STATS_WINDOW: StatsWindow = "1h";
export const REFRESH_MS = 30_000;

/** Unknown / missing / repeated values fall back to the default window. */
export function parseStatsWindow(raw: string | string[] | null | undefined): StatsWindow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (STATS_WINDOWS as readonly string[]).includes(v ?? "")
    ? (v as StatsWindow)
    : DEFAULT_STATS_WINDOW;
}

export type StatsSeriesPoint = { t: number; total: number; errors: number };

export type StatsRequests = {
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  series: StatsSeriesPoint[];
  bucketMs: number;
  errorRate: number;
  truncated: boolean;
  sampled: number;
};

export type StatsErrorGroup = {
  method: string;
  path: string;
  status: number;
  count: number;
  lastAt: number;
};

export type ProjectStats = {
  project_id?: string;
  version: number;
  window: StatsWindow;
  generated_at: number;
  partial: boolean;
  partial_sections: string[];
  requests: StatsRequests | null;
  latency: { p50: number | null; p95: number | null; method: string } | null;
  errors: StatsErrorGroup[] | null;
  sqlAudit: { total: number; failures: number; capped: number } | null;
  queue: { depth: number } | null;
  db: {
    tables: number;
    rowsEstimate: number;
    sizeBytes: number;
    rowsEstimateMethod: string;
    top: Array<{ name: string; rows: number }>;
  } | null;
  blobs: { bytes: number; objects: number } | null;
  policies: number | null;
  jobs: { failures: number } | null;
  realtime: { subscribers: number; eventsPerMin: number } | null;
};

export type StatsFetchResult =
  | { kind: "ok"; stats: ProjectStats }
  | { kind: "archived"; reason: string }
  | { kind: "not_registered" }
  | { kind: "unavailable"; message: string; partialSections: string[] }
  | { kind: "error"; message: string };

/** Typed browser fetch of the BFF stats route. Never throws. */
export async function fetchProjectStats(
  projectId: string,
  window: StatsWindow,
  signal?: AbortSignal,
): Promise<StatsFetchResult> {
  let res: Response;
  try {
    res = await fetch(
      `/api/admin/projects/${encodeURIComponent(projectId)}/stats?window=${window}`,
      { cache: "no-store", signal },
    );
  } catch {
    return { kind: "error", message: "Cannot reach Studio." };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return { kind: "ok", stats: body as unknown as ProjectStats };
  if (res.status === 410) {
    return { kind: "archived", reason: String(body.reason ?? "This project is archived.") };
  }
  if (res.status === 404) return { kind: "not_registered" };
  const sections = Array.isArray(body.partial_sections)
    ? (body.partial_sections as unknown[]).map(String)
    : [];
  if (res.status === 503) {
    return {
      kind: "unavailable",
      message: String(body.message ?? "The project database did not answer."),
      partialSections: sections,
    };
  }
  return {
    kind: "error",
    message: String(body.message ?? body.error ?? `Stats failed (${res.status}).`),
  };
}

// ---- formatting -----------------------------------------------------------

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${i === 0 ? v : v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return "–";
  const p = rate * 100;
  return `${p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

export function formatMs(ms: number | null): string {
  return ms == null || !Number.isFinite(ms) ? "–" : String(Math.round(ms));
}

export function formatBucketTime(t: number, window: StatsWindow): string {
  const d = new Date(t);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (window === "1h") return hm;
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  return window === "24h" ? hm : `${md} ${hm}`;
}

export function ageSeconds(generatedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - generatedAt) / 1000));
}

export function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/** Error rate thresholds are display-only hints (alerting is out of scope). */
export function errorRateStatus(rate: number, total: number): "neutral" | "ok" | "warn" | "bad" {
  if (total === 0) return "neutral";
  if (rate >= 0.05) return "bad";
  if (rate >= 0.01) return "warn";
  return "ok";
}

export function isEmptyProject(stats: ProjectStats): boolean {
  return stats.requests != null && stats.requests.total === 0;
}

// ---- chart mapping ----------------------------------------------------------

export function toChartData(series: StatsSeriesPoint[]): Array<{ t: number; total: number; errors: number }> {
  return series.map((p) => ({ t: p.t, total: p.total, errors: p.errors }));
}

export function summarizeSeries(series: StatsSeriesPoint[], windowLabel: string): string {
  if (series.length === 0) return `No requests in the last ${windowLabel}.`;
  const total = series.reduce((a, p) => a + p.total, 0);
  const errors = series.reduce((a, p) => a + p.errors, 0);
  let peak = series[0]!;
  for (const p of series) if (p.total > peak.total) peak = p;
  return `${formatCount(total)} requests and ${formatCount(errors)} errors in the last ${windowLabel}; busiest bucket had ${formatCount(peak.total)} requests.`;
}

export const WINDOW_LABELS: Record<StatsWindow, string> = {
  "1h": "hour",
  "24h": "24 hours",
  "7d": "7 days",
};

export const SECTION_LABELS: Record<string, string> = {
  requests: "request charts",
  sqlAudit: "SQL audit",
  queue: "queue depth",
  db: "database report",
  blobs: "blob storage",
  policies: "policies",
  jobs: "job failures",
  realtime: "realtime counters",
};

export function describePartial(sections: string[]): string {
  return sections.map((s) => SECTION_LABELS[s] ?? s).join(", ");
}

// ---- connect card -------------------------------------------------------------

export function maskedKey(k: { prefix: string; last4: string }): string {
  return `${k.prefix}…${k.last4}`;
}

// Env / client snippet generators live in ./studio-snippets (shared with the realtime snippet panel).
