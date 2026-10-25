"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

import type { JordRole } from "@/lib/auth/roles";
import { formatMs, type LogEvent } from "@/lib/jobs";

type ApiError = { error?: string; message?: string };

type SourceFilter = "all" | "http" | "job" | "system";

type Props = {
  role: JordRole;
};

export function LogsPanel({ role }: Props) {
  const [events, setEvents] = useState<LogEvent[] | null>(null);
  const [source, setSource] = useState<SourceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setError(null);
    const qs = new URLSearchParams({ limit: "100" });
    if (source !== "all") qs.set("source", source);
    const res = await fetch(`/api/logs?${qs}`, { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load logs (${res.status}).`),
      );
    }
    const data = (await res.json()) as { events: LogEvent[] };
    setEvents(data.events);
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      startTransition(async () => {
        try {
          await load();
        } catch (err) {
          if (!cancelled) {
            setEvents(null);
            setError(err instanceof Error ? err.message : "Failed to load logs");
          }
        }
      });
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Runtime
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Logs</h1>
          <p className="text-sm text-muted-foreground">
            Batched into <code className="font-mono">jord_logs</code> outside
            the hot write queue; secrets redacted. Role{" "}
            <code className="font-mono">{role}</code> · auto-refresh 5s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={source}
            onValueChange={(v) => setSource(v as SourceFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="http">http</SelectItem>
              <SelectItem value="job">job</SelectItem>
              <SelectItem value="system">system</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => void load())}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Logs unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Time</TableHead>
              <TableHead className="w-20">Level</TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(events ?? []).map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {formatMs(ev.at)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      ev.level === "error"
                        ? "destructive"
                        : ev.level === "warn"
                          ? "warning"
                          : "secondary"
                    }
                    className="text-[10px] uppercase"
                  >
                    {ev.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{ev.source}</TableCell>
                <TableCell className="text-sm">{ev.message}</TableCell>
              </TableRow>
            ))}
            {events && events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No events yet — hit an API or run a job.
                </TableCell>
              </TableRow>
            ) : null}
            {!events && !error ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
