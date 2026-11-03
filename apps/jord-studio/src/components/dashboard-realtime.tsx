"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle, Button, Skeleton, StatTile } from "@altr/apolyx";

import { formatCount } from "@/lib/studio-dashboard";
import {
  REALTIME_REFRESH_MS,
  fetchRealtimeStats,
  formatLastEventAge,
  isRealtimeIdle,
  liveLastEventAgeMs,
  topTables,
  type RealtimeStats,
} from "@/lib/studio-realtime-stats";

/**
 * Realtime section body (S0086): subscribers, events/min, "last event Ns ago" (ticks every second
 * between polls) and top tables. Polls every 10 s while the tab is visible.
 */
export function DashboardRealtime({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    const r = await fetchRealtimeStats(projectId, ctl.signal);
    if (ctl.signal.aborted) return;
    if (r.kind === "ok") {
      setStats(r.stats);
      setReceivedAt(Date.now());
      setError(null);
    } else {
      setError(r.message);
    }
    setLoading(false);
    setNow(Date.now());
  }, [projectId]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REALTIME_REFRESH_MS);
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      abort.current?.abort();
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Loading realtime stats">
        <StatTile label="Loading" value="" loading />
        <StatTile label="Loading" value="" loading />
        <Skeleton className="col-span-2 h-10 w-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Realtime stats unavailable</AlertTitle>
        <AlertDescription>
          <p>{error ?? "Unknown error."}</p>
          <div className="mt-2">
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const age = liveLastEventAgeMs(stats, receivedAt, now);
  const tables = topTables(stats);

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alert variant="warning">
          <AlertTitle>Showing the last good reading</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <div className="mt-2">
              <Button type="button" size="sm" variant="outline" onClick={retry}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Subscribers" value={formatCount(stats.subscribers)} />
        <StatTile label="Events / min" value={formatCount(stats.eventsPerMin)} />
      </div>
      {isRealtimeIdle(stats) ? (
        <p className="text-sm text-muted-foreground">
          No live subscribers yet. Copy a ready-made client from the{" "}
          <a className="underline" href="#connect-title">
            Realtime tab in Connect
          </a>{" "}
          or turn on Live in a table.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status" aria-live="off">
            Last event: <span className="tabular-nums">{formatLastEventAge(age)}</span>
          </p>
          {tables.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm" aria-label="Top tables by events">
              {tables.map((t) => (
                <li key={t.table} className="flex items-center justify-between gap-3">
                  <code className="truncate font-mono text-xs">{t.table}</code>
                  <span className="tabular-nums text-muted-foreground">{formatCount(t.events)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
