"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SegmentedControl,
  Skeleton,
  StatTile,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TimeSeriesChart,
} from "@altr/apolyx";

import { DashboardRealtime } from "@/components/dashboard-realtime";
import { DashboardConnectCard } from "@/components/dashboard-connect-card";
import { ProjectArchived } from "@/components/project-archived";
import type { ProjectPublic } from "@/lib/projects";
import {
  REFRESH_MS,
  WINDOW_LABELS,
  ageSeconds,
  describePartial,
  errorRateStatus,
  fetchProjectStats,
  formatAge,
  formatBucketTime,
  formatBytes,
  formatCount,
  formatMs,
  formatPercent,
  isEmptyProject,
  parseStatsWindow,
  summarizeSeries,
  toChartData,
  type ProjectStats,
  type StatsFetchResult,
  type StatsWindow,
} from "@/lib/studio-dashboard";

type Props = {
  slug: string;
  serverUrl: string;
  project: ProjectPublic | null;
  initialWindow: StatsWindow;
};

const WINDOW_OPTIONS = [
  { value: "1h", label: "1h", "aria-label": "Last hour" },
  { value: "24h", label: "24h", "aria-label": "Last 24 hours" },
  { value: "7d", label: "7d", "aria-label": "Last 7 days" },
] as const;

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <CardTitle id={id} as="h2">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Unavailable({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground">{what} is temporarily unavailable.</p>;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <StatTile key={i} label="Loading" value="" loading />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ProjectDashboard({ slug, serverUrl, project, initialWindow }: Props) {
  const [win, setWin] = useState<StatsWindow>(initialWindow);
  const [result, setResult] = useState<StatsFetchResult | null>(null);
  const [lastGood, setLastGood] = useState<ProjectStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const abort = useRef<AbortController | null>(null);
  // Refs keep the polling effect stable: depending on `lastGood` rebuilt both timers after every load.
  const lastGoodRef = useRef<ProjectStats | null>(null);
  const inflight = useRef(false);
  const projectId = project?.id ?? slug;

  const load = useCallback(
    async (w: StatsWindow, scheduled = false) => {
      // A scheduled refresh never aborts a request that is still running: on a slow server that would
      // restart the request every tick and the dashboard would never receive a response.
      if (scheduled && inflight.current) return;
      abort.current?.abort();
      const ctl = new AbortController();
      abort.current = ctl;
      inflight.current = true;
      setRefreshing(true);
      try {
        const r = await fetchProjectStats(projectId, w, ctl.signal);
        if (ctl.signal.aborted) return;
        setResult(r);
        if (r.kind === "ok") {
          lastGoodRef.current = r.stats;
          setLastGood(r.stats);
        }
        setRefreshing(false);
        setNow(Date.now());
      } finally {
        if (abort.current === ctl) inflight.current = false;
      }
    },
    [projectId],
  );

  // Initial load + window changes.
  useEffect(() => {
    void load(win);
    return () => abort.current?.abort();
  }, [load, win]);

  // Auto-refresh every 30 s while visible; refresh on becoming visible; tick the "updated Ns ago" label.
  useEffect(() => {
    const refresh = setInterval(() => {
      if (document.visibilityState === "visible") void load(win, true);
    }, REFRESH_MS);
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        const good = lastGoodRef.current;
        if (good && Date.now() - good.generated_at >= REFRESH_MS) void load(win, true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, win]);

  function changeWindow(next: string) {
    const w = parseStatsWindow(next);
    setWin(w);
    const url = new URL(window.location.href);
    url.searchParams.set("window", w);
    window.history.replaceState(window.history.state, "", url);
  }

  if (result?.kind === "archived") {
    return <ProjectArchived slug={slug} reason={result.reason} />;
  }

  const stats = result?.kind === "ok" ? result.stats : null;
  const stale = result && result.kind !== "ok" ? lastGood : null;
  const view = stats ?? stale;
  const connect = <DashboardConnectCard slug={slug} serverUrl={serverUrl} project={project} />;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{slug}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground" role="status" aria-live="off">
          {view
            ? `Updated ${formatAge(ageSeconds(view.generated_at, now))}${refreshing ? " · refreshing" : ""}`
            : refreshing
              ? "Loading…"
              : ""}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => void load(win)} disabled={refreshing}>
          Refresh
        </Button>
        <SegmentedControl
          aria-label="Time window"
          options={WINDOW_OPTIONS}
          value={win}
          onValueChange={changeWindow}
        />
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (!result && !view) {
    body = <LoadingSkeleton />;
  } else if (result?.kind === "not_registered" && !view) {
    body = (
      <>
        <Alert variant="info">
          <AlertTitle>No live stats for this project</AlertTitle>
          <AlertDescription>
            The env-backed default project is not in the project registry, so there is no stats
            source for it. Register a project to see request charts and the database report.
          </AlertDescription>
        </Alert>
        {connect}
      </>
    );
  } else if (result && result.kind !== "ok" && !view) {
    const unavailable = result.kind === "unavailable";
    body = (
      <>
        <Alert variant="destructive">
          <AlertTitle>{unavailable ? "Database unreachable" : "Could not load stats"}</AlertTitle>
          <AlertDescription>
            <p>
              {result.kind === "unavailable" || result.kind === "error" ? result.message : "Unknown error."}
              {unavailable && result.partialSections.length > 0
                ? ` Failed: ${describePartial(result.partialSections)}.`
                : ""}
            </p>
            <div className="mt-3">
              <Button type="button" size="sm" variant="outline" onClick={() => void load(win)}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        {connect}
      </>
    );
  } else if (view) {
    body = (
      <>
        {result && result.kind !== "ok" ? (
          <Alert variant="warning">
            <AlertTitle>Showing the last good numbers</AlertTitle>
            <AlertDescription>
              <p>
                The latest refresh failed
                {result.kind === "unavailable" || result.kind === "error" ? `: ${result.message}` : "."}
              </p>
              <div className="mt-3">
                <Button type="button" size="sm" variant="outline" onClick={() => void load(win)}>
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
        <DashboardBody stats={view} win={win} connect={connect} projectId={projectId} />
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      {header}
      {body}
    </div>
  );
}

function DashboardBody({
  stats,
  win,
  connect,
  projectId,
}: {
  stats: ProjectStats;
  win: StatsWindow;
  connect: React.ReactNode;
  projectId: string;
}) {
  const empty = isEmptyProject(stats);
  const req = stats.requests;
  const label = WINDOW_LABELS[win];

  const rateData = req
    ? req.series.map((p) => ({
        t: p.t,
        rate: p.total === 0 ? 0 : Math.round((p.errors / p.total) * 1000) / 10,
      }))
    : [];
  const fmtX = (t: number) => formatBucketTime(t, win);

  return (
    <>
      {stats.partial ? (
        <Alert variant="info">
          <AlertTitle>Some sections are unavailable</AlertTitle>
          <AlertDescription>
            Could not read: {describePartial(stats.partial_sections)}. The rest is shown; it will
            retry on the next refresh.
          </AlertDescription>
        </Alert>
      ) : null}
      {req?.truncated ? (
        <Alert variant="info">
          <AlertTitle>Sampled numbers</AlertTitle>
          <AlertDescription>
            This window has more request logs than the dashboard reads; figures describe the newest{" "}
            {formatCount(req.sampled)} requests.
          </AlertDescription>
        </Alert>
      ) : null}

      {empty ? (
        <>
          <Alert variant="info">
            <AlertTitle>No requests yet</AlertTitle>
            <AlertDescription>
              This project has not served any traffic in the last {label}. Connect an app below;
              charts fill in as requests arrive.
            </AlertDescription>
          </Alert>
          {connect}
        </>
      ) : null}

      <section aria-label="Health" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Requests"
          value={req ? formatCount(req.total) : "–"}
          hint={`last ${label}`}
        />
        <StatTile
          label="Error rate"
          value={req ? formatPercent(req.errorRate) : "–"}
          status={req ? errorRateStatus(req.errorRate, req.total) : "neutral"}
          hint="4xx and 5xx responses"
        />
        <StatTile
          label="Latency p50"
          value={formatMs(stats.latency?.p50 ?? null)}
          unit={stats.latency?.p50 != null ? "ms" : undefined}
        />
        <StatTile
          label="Latency p95"
          value={formatMs(stats.latency?.p95 ?? null)}
          unit={stats.latency?.p95 != null ? "ms" : undefined}
        />
        <StatTile
          label="Queue depth"
          value={stats.queue ? formatCount(stats.queue.depth) : "–"}
          hint="pending writes now"
        />
      </section>

      <Section id="dash-charts" title="Traffic" description={`Per-bucket requests and error rate, last ${label}.`}>
        {req ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <TimeSeriesChart
              aria-label="Requests over time"
              data={toChartData(req.series)}
              series={[
                { key: "total", label: "Requests", color: "chart-1", marker: "circle" },
                { key: "errors", label: "Errors", color: "chart-5", dashed: true, marker: "diamond" },
              ]}
              xLabel="Time"
              yLabel="Requests per bucket"
              formatX={fmtX}
              formatY={formatCount}
              summary={summarizeSeries(req.series, label)}
            />
            <TimeSeriesChart
              aria-label="Error rate over time"
              data={rateData}
              series={[{ key: "rate", label: "Error rate (%)", color: "chart-5", marker: "square" }]}
              xLabel="Time"
              yLabel="Error rate (%)"
              formatX={fmtX}
              formatY={(v) => `${v}%`}
              summary={`Overall error rate ${formatPercent(req.errorRate)} across ${formatCount(req.total)} requests in the last ${label}.`}
            />
          </div>
        ) : (
          <Unavailable what="Request data" />
        )}
      </Section>

      <Section id="dash-db" title="Database report" description="Row counts are estimates; see the note on each source.">
        {stats.db || stats.blobs || stats.policies != null || stats.jobs ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Tables" value={stats.db ? formatCount(stats.db.tables) : "–"} />
            <StatTile
              label="Row estimate"
              value={stats.db ? formatCount(stats.db.rowsEstimate) : "–"}
              hint={stats.db?.rowsEstimateMethod}
            />
            <StatTile label="Database size" value={stats.db ? formatBytes(stats.db.sizeBytes) : "–"} />
            <StatTile
              label="Blob bytes"
              value={stats.blobs ? formatBytes(stats.blobs.bytes) : "–"}
              hint={stats.blobs ? `${formatCount(stats.blobs.objects)} objects` : undefined}
            />
            <StatTile label="Policies" value={stats.policies != null ? formatCount(stats.policies) : "–"} />
            <StatTile
              label="Job failures"
              value={stats.jobs ? formatCount(stats.jobs.failures) : "–"}
              status={stats.jobs ? (stats.jobs.failures > 0 ? "warn" : "ok") : "neutral"}
              statusLabel={stats.jobs && stats.jobs.failures > 0 ? "Failures" : "None"}
              hint={`last ${label}`}
            />
            <StatTile
              label="SQL audit failures"
              value={stats.sqlAudit ? formatCount(stats.sqlAudit.failures) : "–"}
              hint={stats.sqlAudit ? `of ${formatCount(stats.sqlAudit.total)} statements` : undefined}
            />
          </div>
        ) : (
          <Unavailable what="The database report" />
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="dash-top" title="Top tables" description="Largest tables by estimated rows.">
          {stats.db ? (
            stats.db.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables yet.</p>
            ) : (
              <Table density="compact">
                <caption className="sr-only">Top tables by estimated rows</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Table</TableHead>
                    <TableHead scope="col" className="text-right">
                      Rows (est.)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.db.top.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-mono text-xs">{t.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(t.rows)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <Unavailable what="Table sizes" />
          )}
        </Section>

        <Section id="dash-rt" title="Realtime" description="Live connections on this server process.">
          <DashboardRealtime projectId={projectId} />
        </Section>
      </div>

      <Section id="dash-errors" title="Recent errors" description="Grouped by method, templated path and status.">
        {stats.errors ? (
          stats.errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors in the last {label}.</p>
          ) : (
            <Table density="compact">
              <caption className="sr-only">Error groups in the last {label}</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Method</TableHead>
                  <TableHead scope="col">Path</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Count
                  </TableHead>
                  <TableHead scope="col">Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.errors.map((e) => (
                  <TableRow key={`${e.method} ${e.path} ${e.status}`}>
                    <TableCell className="font-mono text-xs">{e.method}</TableCell>
                    <TableCell className="font-mono text-xs">{e.path}</TableCell>
                    <TableCell className="tabular-nums">{e.status}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(e.count)}</TableCell>
                    <TableCell>
                      <time dateTime={new Date(e.lastAt).toISOString()}>
                        {new Date(e.lastAt).toLocaleString()}
                      </time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : (
          <Unavailable what="Error list" />
        )}
      </Section>

      {empty ? null : connect}
    </>
  );
}
