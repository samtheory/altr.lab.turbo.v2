"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldInput,
} from "@altr/apolyx";

type Props = { role: string };

type Job = {
  id: string;
  status: string;
  phase: string;
  tables: string[];
  counts: Record<string, { source: number; target: number }> | null;
  targetScheme: string;
  errorText: string | null;
};

export function MigrateWizardPanel({ role }: Props) {
  const [targetUrl, setTargetUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            The migrate wizard is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Database
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Migrate wizard
        </h1>
        <p className="text-sm text-muted-foreground">
          Copy this file libSQL source to Turso or Postgres. Source is never
          deleted. <code className="font-mono">jord_vix_*</code> tables are
          skipped. The destination URL is used only for this job and is not
          stored in Studio or returned by the API.
        </p>
      </div>

      <Field label="Target DATABASE_URL">
        <FieldInput
          type="password"
          autoComplete="off"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="libsql://… or postgres://…"
        />
      </Field>

      <Button
        disabled={isPending || !targetUrl.trim()}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await fetch("/api/migrate/jobs", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ targetUrl }),
            });
            const body = (await res.json().catch(() => ({}))) as {
              message?: string;
              job?: Job;
            };
            if (!res.ok || !body.job) {
              setError(body.message ?? `Start failed (${res.status})`);
              return;
            }
            setTargetUrl("");
            setJob(body.job);
            const id = body.job.id;
            const poll = async () => {
              const statusRes = await fetch(`/api/migrate/jobs/${id}`);
              const statusBody = (await statusRes.json().catch(() => ({}))) as {
                job?: Job;
              };
              if (statusBody.job) setJob(statusBody.job);
              if (
                statusBody.job &&
                (statusBody.job.status === "done" ||
                  statusBody.job.status === "error")
              ) {
                return;
              }
              window.setTimeout(poll, 1000);
            };
            window.setTimeout(poll, 800);
          });
        }}
      >
        Start copy
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {job ? (
        <Alert variant={job.status === "error" ? "destructive" : "info"}>
          <AlertTitle>
            {job.status} · {job.phase} · {job.targetScheme}
          </AlertTitle>
          <AlertDescription>
            Tables: {job.tables.join(", ") || "(none)"}
            {job.errorText ? ` — ${job.errorText}` : ""}
            {job.counts
              ? ` — counts ${JSON.stringify(job.counts)}`
              : ""}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
