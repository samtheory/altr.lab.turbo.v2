/** Realtime stats (S0086): typed helper for the BFF route `/api/admin/projects/:id/realtime-stats`. */

export const REALTIME_REFRESH_MS = 10_000;

export type RealtimeStats = {
  version: 1;
  generated_at: number;
  subscribers: number;
  eventsPerMin: number;
  lastEventAt: number | null;
  lastEventAgeMs: number | null;
  tables: Array<{ table: string; events: number }>;
};

export type RealtimeStatsResult =
  | { kind: "ok"; stats: RealtimeStats }
  | { kind: "error"; message: string };

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Defensive normalisation of the server body. Returns null when it is not an object. */
export function normalizeRealtimeStats(raw: unknown): RealtimeStats | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const tables = Array.isArray(r.tables)
    ? r.tables
        .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
        .map((t) => ({ table: String(t.table ?? ""), events: Math.max(0, num(t.events)) }))
        .filter((t) => t.table !== "")
    : [];
  return {
    version: 1,
    generated_at: num(r.generated_at, Date.now()),
    subscribers: Math.max(0, num(r.subscribers)),
    eventsPerMin: Math.max(0, num(r.eventsPerMin)),
    lastEventAt: numOrNull(r.lastEventAt),
    lastEventAgeMs: numOrNull(r.lastEventAgeMs),
    tables,
  };
}

/** Top-N tables by events (stable: ties keep server order). */
export function topTables(stats: RealtimeStats, n = 5): Array<{ table: string; events: number }> {
  return stats.tables
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.events - a.t.events || a.i - b.i)
    .slice(0, n)
    .map((x) => x.t);
}

export function isRealtimeIdle(stats: RealtimeStats): boolean {
  return stats.subscribers === 0 && stats.lastEventAt == null && stats.eventsPerMin === 0;
}

/**
 * Age of the last event in ms, ticking client-side: the server age at `generatedAt` plus the time
 * elapsed since the response was received (`receivedAt`). Null when there was never an event.
 */
export function liveLastEventAgeMs(stats: RealtimeStats, receivedAt: number, now: number): number | null {
  if (stats.lastEventAgeMs == null) return null;
  return Math.max(0, stats.lastEventAgeMs + Math.max(0, now - receivedAt));
}

export function formatLastEventAge(ageMs: number | null): string {
  if (ageMs == null) return "never";
  const s = Math.floor(ageMs / 1000);
  if (s < 1) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

/** Typed browser fetch of the BFF route. Never throws. */
export async function fetchRealtimeStats(
  projectId: string,
  signal?: AbortSignal,
): Promise<RealtimeStatsResult> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/projects/${encodeURIComponent(projectId)}/realtime-stats`, {
      cache: "no-store",
      signal,
    });
  } catch {
    return { kind: "error", message: "Cannot reach Studio." };
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      kind: "error",
      message: String(b.message ?? b.error ?? `Realtime stats failed (${res.status}).`),
    };
  }
  const stats = normalizeRealtimeStats(body);
  return stats
    ? { kind: "ok", stats }
    : { kind: "error", message: "Unexpected realtime stats response." };
}
