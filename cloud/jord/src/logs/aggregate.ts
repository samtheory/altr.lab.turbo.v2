/**
 * S0095 — pure aggregation over persisted request-log rows (`jord_logs`,
 * source = 'http', meta_json = {method, path, status, ms}). No I/O here.
 *
 * Percentiles are EXACT (nearest-rank) over the rows supplied. When the caller
 * hit its row cap the sample is the newest N rows, so numbers describe that
 * sample (`truncated: true`), not the whole window.
 */

export type RequestLogRow = { at: number; meta_json: string | null };

export type RequestSeriesPoint = {
  t: number;
  total: number;
  errors: number;
};

export type RequestAggregate = {
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
    series: RequestSeriesPoint[];
    bucketMs: number;
    errorRate: number;
    truncated: boolean;
    sampled: number;
  };
  latency: { p50: number | null; p95: number | null; method: "exact-nearest-rank" };
  errors: Array<{
    method: string;
    path: string;
    status: number;
    count: number;
    lastAt: number;
  }>;
};

export const WINDOWS = {
  "1h": { ms: 60 * 60_000, bucketMs: 60_000 },
  "24h": { ms: 24 * 60 * 60_000, bucketMs: 60 * 60_000 },
  "7d": { ms: 7 * 24 * 60 * 60_000, bucketMs: 3 * 60 * 60_000 },
} as const;
export type StatsWindow = keyof typeof WINDOWS;

export function parseWindow(raw: string | undefined): StatsWindow | null {
  if (raw === undefined || raw === "") return "1h";
  return raw === "1h" || raw === "24h" || raw === "7d" ? raw : null;
}

/** Nearest-rank percentile over an ascending-sorted array. */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1]!;
}

export const MAX_ERROR_GROUPS = 10;

export function aggregateRequestLogs(
  rows: RequestLogRow[],
  opts: { now: number; window: StatsWindow; truncated: boolean },
): RequestAggregate {
  const { ms: windowMs, bucketMs } = WINDOWS[opts.window];
  const since = opts.now - windowMs;
  const firstBucket = Math.floor(since / bucketMs) * bucketMs;
  const bucketCount = Math.ceil((opts.now - firstBucket) / bucketMs) + 1;
  const series: RequestSeriesPoint[] = Array.from(
    { length: bucketCount },
    (_, i) => ({ t: firstBucket + i * bucketMs, total: 0, errors: 0 }),
  );
  const byStatus: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  const latencies: number[] = [];
  const errorGroups = new Map<
    string,
    { method: string; path: string; status: number; count: number; lastAt: number }
  >();
  let total = 0;
  let errorCount = 0;

  for (const row of rows) {
    if (row.at < since || row.at > opts.now || !row.meta_json) continue;
    let meta: Record<string, unknown>;
    try {
      meta = JSON.parse(row.meta_json) as Record<string, unknown>;
    } catch {
      continue;
    }
    const status = Number(meta.status);
    if (!Number.isFinite(status)) continue;
    const method = typeof meta.method === "string" ? meta.method : "?";
    const path = typeof meta.path === "string" ? meta.path : "?";
    total++;
    const cls = `${Math.floor(status / 100)}xx`;
    byStatus[cls] = (byStatus[cls] ?? 0) + 1;
    byMethod[method] = (byMethod[method] ?? 0) + 1;
    const ms = Number(meta.ms);
    if (Number.isFinite(ms) && ms >= 0) latencies.push(ms);
    const point = series[Math.floor((row.at - firstBucket) / bucketMs)];
    if (point) point.total++;
    if (status >= 500) {
      errorCount++;
      if (point) point.errors++;
      const templated = templatePath(path);
      const key = `${method} ${templated} ${status}`;
      const g = errorGroups.get(key);
      if (g) {
        g.count++;
        g.lastAt = Math.max(g.lastAt, row.at);
      } else {
        errorGroups.set(key, { method, path: templated, status, count: 1, lastAt: row.at });
      }
    }
  }

  latencies.sort((a, b) => a - b);
  return {
    requests: {
      total,
      byStatus,
      byMethod,
      series,
      bucketMs,
      errorRate: total === 0 ? 0 : errorCount / total,
      truncated: opts.truncated,
      sampled: rows.length,
    },
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      method: "exact-nearest-rank",
    },
    errors: [...errorGroups.values()]
      .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
      .slice(0, MAX_ERROR_GROUPS),
  };
}


const ID_SEGMENT = /^(?:\d+|[0-9a-f]{8,}|[0-9a-f]{8}-[0-9a-f-]{27,})$/i;

/**
 * Collapse id-like and user-chosen path segments so the error list neither leaks record ids or
 * object keys (which can be emails) nor fans one hot route out into thousands of groups.
 * `/blobs/<bucket>/objects/<anything...>` -> `/blobs/<bucket>/objects/:key`.
 */
export function templatePath(path: string): string {
  const parts = path.split("?")[0]!.split("/");
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]!;
    if (seg === "") {
      out.push(seg);
      continue;
    }
    if (out[1] === "blobs" && out[3] === "objects" && out.length >= 4) {
      out.push(":key");
      break;
    }
    if (ID_SEGMENT.test(seg) || seg.length > 32 || seg.includes("@") || seg.includes("%")) {
      out.push(":id");
      continue;
    }
    out.push(seg);
  }
  return out.join("/");
}
