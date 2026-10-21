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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@altr/apolyx";

import {
  canManageApis,
  canWriteRecords,
  type JordRole,
} from "@/lib/auth/roles";
import {
  buildStudioCurl,
  type GeneratedApiCatalog,
  type GeneratedApiOperation,
  type GeneratedApiResource,
} from "@/lib/generated-api";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

export function GeneratedApiPanel({ role }: Props) {
  const canToggle = canManageApis(role);
  const canWrite = canWriteRecords(role);
  const [catalog, setCatalog] = useState<GeneratedApiCatalog | null>(null);
  const [selectedId, setSelectedId] = useState("records");
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tryBucket, setTryBucket] = useState("lab");
  const [tryId, setTryId] = useState("");
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadCatalog = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/apis/generated", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load catalog (${res.status}).`),
      );
    }
    const data = (await res.json()) as GeneratedApiCatalog;
    setCatalog(data);
    if (data.resources.length > 0) {
      const stillThere = data.resources.some((r) => r.id === selectedId);
      if (!stillThere) setSelectedId(data.resources[0]!.id);
    }
    return data;
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await loadCatalog();
      } catch (err) {
        if (!cancelled) {
          setCatalog(null);
          setError(err instanceof Error ? err.message : "Failed to load catalog");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  const selected: GeneratedApiResource | null =
    catalog?.resources.find((r) => r.id === selectedId) ?? null;

  function onToggle(enabled: boolean) {
    if (!selected || !canToggle) return;
    setToggleError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/apis/generated/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          setToggleError(
            body.message ?? `Toggle failed (${res.status}).`,
          );
          return;
        }
        await loadCatalog();
      } catch {
        setToggleError("Network error talking to Studio BFF.");
      }
    });
  }

  async function copyCurl(op: GeneratedApiOperation) {
    const text = buildStudioCurl(op, { id: tryId, bucket: tryBucket });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${op.method} ${op.path}`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function runTry(op: GeneratedApiOperation) {
    setTryResult(null);
    startTransition(async () => {
      try {
        let path = op.path.replace(":id", tryId.trim() || "missing-id");
        if (op.method === "GET" && op.path === "/records") {
          path = `${path}?bucket=${encodeURIComponent(tryBucket)}`;
        }
        const init: RequestInit = {
          method: op.method,
          cache: "no-store",
        };
        if (op.method === "POST") {
          init.headers = { "Content-Type": "application/json" };
          init.body = JSON.stringify({ bucket: tryBucket, body: "{}" });
        }
        if (op.method === "PATCH") {
          init.headers = { "Content-Type": "application/json" };
          init.body = JSON.stringify({ version: 1, body: "{}" });
        }
        const res = await fetch(`/api${path}`, init);
        const text = await res.text();
        setTryResult(`${res.status}\n${text.slice(0, 2000)}`);
        if (op.method !== "GET") await loadCatalog();
      } catch {
        setTryResult("Network error talking to Studio BFF.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          APIs
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Generated API
        </h1>
        <p className="text-sm text-muted-foreground">
          Auto CRUD for SQL tables on jord-server. Inspect routes, copy curl via
          the Studio BFF, toggle availability (admin). Custom endpoints are Studio
          S6.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Catalog unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside className="flex flex-col gap-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </p>
          {(catalog?.resources ?? []).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm transition-colors",
                r.id === selectedId
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="font-mono">{r.id}</span>
              {!r.enabled ? (
                <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                  off
                </Badge>
              ) : null}
            </button>
          ))}
          {!catalog && !error ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
        </aside>

        {selected ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <p className="font-mono text-sm font-medium">{selected.table}</p>
                <p className="text-xs text-muted-foreground">
                  Resource <code className="font-mono">{selected.id}</code>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Enabled</span>
                  <Switch
                    checked={selected.enabled}
                    disabled={!canToggle || isPending}
                    onCheckedChange={onToggle}
                    aria-label="Enable generated API resource"
                  />
                </div>
                {!canToggle ? (
                  <p className="text-[11px] text-muted-foreground">
                    Admin only — your role is {role}
                  </p>
                ) : null}
              </div>
            </div>

            {toggleError ? (
              <Alert variant="destructive">
                <AlertTitle>Toggle failed</AlertTitle>
                <AlertDescription>{toggleError}</AlertDescription>
              </Alert>
            ) : null}

            {!selected.enabled ? (
              <Alert variant="warning">
                <AlertTitle>API disabled</AlertTitle>
                <AlertDescription>
                  CRUD calls to <code className="font-mono">/records</code> return{" "}
                  <strong>503</strong> <code className="font-mono">api_disabled</code>{" "}
                  until an admin re-enables this resource.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead className="hidden sm:table-cell">Summary</TableHead>
                    <TableHead className="w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.operations.map((op) => {
                    const needsWrite = op.auth === "write";
                    const tryBlocked = needsWrite && !canWrite;
                    return (
                      <TableRow key={`${op.method}-${op.path}`}>
                        <TableCell>
                          <Badge
                            variant={
                              op.method === "GET"
                                ? "secondary"
                                : op.method === "DELETE"
                                  ? "destructive"
                                  : "default"
                            }
                            className="font-mono text-[10px]"
                          >
                            {op.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {op.path}
                        </TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground">
                          {op.auth}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {op.summary}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => void copyCurl(op)}
                            >
                              {copied === `${op.method} ${op.path}`
                                ? "Copied"
                                : "Curl"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              disabled={tryBlocked || isPending}
                              onClick={() => runTry(op)}
                            >
                              Try
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Try-it bucket (list / insert)">
                <FieldInput
                  value={tryBucket}
                  onChange={(e) => setTryBucket(e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="Try-it id (get / patch / delete)">
                <FieldInput
                  value={tryId}
                  onChange={(e) => setTryId(e.target.value)}
                  placeholder="uuid"
                  className="font-mono"
                />
              </Field>
            </div>

            {tryResult ? (
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
                {tryResult}
              </pre>
            ) : null}

            <Alert variant="info">
              <AlertTitle>BFF vs jord-server</AlertTitle>
              <AlertDescription>
                Curl samples hit Studio at{" "}
                <code className="font-mono">/api/…</code> with the session cookie.
                Machine callers use jord-server directly with{" "}
                <code className="font-mono">Authorization: Bearer …</code>. The
                browser never opens <code className="font-mono">data/jord.db</code>.
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
      </div>
    </div>
  );
}
