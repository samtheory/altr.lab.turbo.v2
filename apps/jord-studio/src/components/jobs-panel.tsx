"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Field,
  FieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

import { canManageJobs, type JordRole } from "@/lib/auth/roles";
import {
  BUILTIN_JOB_KINDS,
  formatMs,
  type BuiltinJobKind,
  type PublicJob,
  type PublicJobRun,
} from "@/lib/jobs";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

export function JobsPanel({ role }: Props) {
  const canManage = canManageJobs(role);
  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<PublicJobRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Echo lab");
  const [kind, setKind] = useState<BuiltinJobKind>("echo");
  const [intervalMs, setIntervalMs] = useState("60000");
  const [config, setConfig] = useState('{"message":"hello"}');
  const [isPending, startTransition] = useTransition();

  const loadJobs = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load jobs (${res.status}).`),
      );
    }
    const data = (await res.json()) as { jobs: PublicJob[] };
    setJobs(data.jobs);
    if (data.jobs.length > 0) {
      setSelectedId((prev) =>
        prev && data.jobs.some((j) => j.id === prev)
          ? prev
          : data.jobs[0]!.id,
      );
    }
    return data.jobs;
  }, []);

  const loadRuns = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/runs?limit=20`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { runs: PublicJobRun[] };
    setRuns(data.runs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await loadJobs();
      } catch (err) {
        if (!cancelled) {
          setJobs(null);
          setError(err instanceof Error ? err.message : "Failed to load jobs");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedId) {
      setRuns([]);
      return;
    }
    void loadRuns(selectedId);
  }, [selectedId, loadRuns]);

  function createJob() {
    if (!canManage) return;
    const interval = Number(intervalMs);
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            kind,
            enabled: false,
            interval_ms: interval,
            config,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          setError(body.message ?? `Create failed (${res.status}).`);
          return;
        }
        const job = (await res.json()) as PublicJob;
        await loadJobs();
        setSelectedId(job.id);
      } catch {
        setError("Network error talking to Studio BFF.");
      }
    });
  }

  function toggleEnabled(job: PublicJob, enabled: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Update failed (${res.status}).`);
        return;
      }
      await loadJobs();
    });
  }

  function runNow(jobId: string) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? body.error ?? `Run failed (${res.status}).`);
        return;
      }
      await loadJobs();
      await loadRuns(jobId);
    });
  }

  function deleteJob(jobId: string) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Delete failed (${res.status}).`);
        return;
      }
      setSelectedId(null);
      await loadJobs();
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Runtime
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Interval schedules on jord-server (built-in kinds only). Jobs never run in the
          browser.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Jobs error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <Field label="Name">
            <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as BuiltinJobKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILTIN_JOB_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Interval (ms)">
            <FieldInput
              value={intervalMs}
              onChange={(e) => setIntervalMs(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Config JSON">
            <FieldInput
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              className="font-mono"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="button" disabled={isPending} onClick={createJob}>
              Create job
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="info">
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            Role <code className="font-mono">{role}</code> can inspect jobs; only admin
            can create, enable, or run.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Last</TableHead>
              <TableHead>Next</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jobs ?? []).map((job) => (
              <TableRow
                key={job.id}
                className={selectedId === job.id ? "bg-muted/40" : undefined}
                onClick={() => setSelectedId(job.id)}
              >
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell className="font-mono text-xs">{job.kind}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={job.enabled}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => toggleEnabled(job, v)}
                    aria-label={`Enable ${job.name}`}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {job.last_status ? (
                    <Badge
                      variant={job.last_status === "ok" ? "success" : "destructive"}
                      className="mr-1 text-[10px] uppercase"
                    >
                      {job.last_status}
                    </Badge>
                  ) : null}
                  {formatMs(job.last_run_at)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatMs(job.next_run_at)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={!canManage || isPending}
                      onClick={() => runNow(job.id)}
                    >
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      disabled={!canManage || isPending}
                      onClick={() => deleteJob(job.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {jobs && jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No jobs yet.
                </TableCell>
              </TableRow>
            ) : null}
            {!jobs && !error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {selectedId ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Recent runs
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Error / result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === "ok"
                            ? "success"
                            : run.status === "error"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] uppercase"
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatMs(run.started_at)}</TableCell>
                    <TableCell className="text-xs">{formatMs(run.finished_at)}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs">
                      {run.error ?? run.result ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No runs yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
