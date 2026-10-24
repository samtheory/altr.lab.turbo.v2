"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
} from "@altr/apolyx";

type HealthBody = {
  ok?: boolean;
  dialect?: string;
  error?: string;
  message?: string;
};

export function ConnectionPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialect, setDialect] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const body = (await res.json()) as HealthBody;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            body.message ??
              (res.status === 503
                ? "Cannot reach jord-server."
                : `Health failed (${res.status}).`),
          );
          setDialect(null);
          return;
        }
        if (body.dialect !== "libsql" && body.dialect !== "postgres") {
          setError("Unexpected health payload.");
          setDialect(null);
          return;
        }
        setDialect(body.dialect);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Cannot reach Studio health proxy.");
          setDialect(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Connection
        </h1>
        <p className="text-sm text-muted-foreground">
          Live dialect from jord-server. The database URL is process env only —
          Studio never edits or displays it.
        </p>
      </div>

      {loading ? (
        <Alert variant="info">
          <AlertTitle>Checking</AlertTitle>
          <AlertDescription>Reading /health…</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>jord-server unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {dialect ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
          <span className="text-sm text-muted-foreground">Dialect</span>
          <Badge variant="secondary" className="font-mono uppercase">
            {dialect}
          </Badge>
        </div>
      ) : null}

      <Alert variant="info">
        <AlertTitle>How to switch</AlertTitle>
        <AlertDescription>
          Set <code className="font-mono">DATABASE_URL</code> on the jord-server
          process to <code className="font-mono">file:…</code> or{" "}
          <code className="font-mono">postgres://…</code> /{" "}
          <code className="font-mono">postgresql://…</code>, then restart. No
          connection string is returned in JSON.
        </AlertDescription>
      </Alert>
    </div>
  );
}
