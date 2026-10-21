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
} from "@altr/apolyx";

import {
  canInvokeApis,
  canManageApis,
  type JordRole,
} from "@/lib/auth/roles";
import {
  BUILTIN_STEP_KINDS,
  type PublicFunction,
} from "@/lib/functions-api";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

const DEFAULT_STEPS = JSON.stringify(
  [{ kind: "echo", config: { message: "hello" } }],
  null,
  0,
);

export function FunctionsPanel({ role }: Props) {
  const canManage = canManageApis(role);
  const canInvoke = canInvokeApis(role);
  const [rows, setRows] = useState<PublicFunction[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Echo lab");
  const [slug, setSlug] = useState("echo-lab");
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [editSteps, setEditSteps] = useState(DEFAULT_STEPS);
  const [invokeBody, setInvokeBody] = useState("{}");
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/functions", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load functions (${res.status}).`),
      );
    }
    const data = (await res.json()) as { functions: PublicFunction[] };
    setRows(data.functions);
    if (data.functions.length > 0) {
      setSelectedId((prev) =>
        prev && data.functions.some((f) => f.id === prev)
          ? prev
          : data.functions[0]!.id,
      );
    }
    return data.functions;
  }, []);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setRows(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (selected) setEditSteps(selected.steps);
  }, [selected]);

  function createFn() {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, steps }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Create failed (${res.status}).`);
        return;
      }
      const row = (await res.json()) as PublicFunction;
      await load();
      setSelectedId(row.id);
    });
  }

  function saveSteps() {
    if (!canManage || !selected) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/functions/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: editSteps }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Save failed (${res.status}).`);
        return;
      }
      await load();
    });
  }

  function toggleEnabled(fn: PublicFunction, enabled: boolean) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/functions/${encodeURIComponent(fn.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        setError(body.message ?? `Update failed (${res.status}).`);
        return;
      }
      await load();
    });
  }

  function invokeFn() {
    if (!canInvoke || !selected) return;
    startTransition(async () => {
      setError(null);
      setInvokeResult(null);
      const res = await fetch(
        `/api/functions/${encodeURIComponent(selected.id)}/invoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: invokeBody,
        },
      );
      const text = await res.text();
      setInvokeResult(`${res.status}\n${text}`);
      if (!res.ok) {
        try {
          const body = JSON.parse(text) as ApiError;
          setError(body.message ?? body.error ?? `Invoke failed (${res.status}).`);
        } catch {
          setError(`Invoke failed (${res.status}).`);
        }
      }
    });
  }

  function deleteFn(id: string) {
    if (!canManage) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/functions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError & {
          dependents?: number;
        };
        setError(
          body.message ??
            (body.error === "has_dependents"
              ? `Has ${body.dependents ?? "?"} custom API(s) — delete them first.`
              : `Delete failed (${res.status}).`),
        );
        return;
      }
      setSelectedId(null);
      await load();
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          APIs
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Function APIs
        </h1>
        <p className="text-sm text-muted-foreground">
          Multi-step pipelines of built-in kinds (
          {BUILTIN_STEP_KINDS.join(", ")}). No user JS. Live save via PATCH.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Functions error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canManage ? (
        <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <Field label="Name">
            <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug">
            <FieldInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Steps JSON">
              <FieldInput
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="button" disabled={isPending} onClick={createFn}>
              Create function
            </Button>
          </div>
        </div>
      ) : (
        <Alert variant="info">
          <AlertTitle>Inspect only</AlertTitle>
          <AlertDescription>
            Role <code className="font-mono">{role}</code> can list functions; only
            admin can create or edit.{" "}
            {canInvoke ? "You may invoke." : "Readonly cannot invoke."}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((fn) => (
              <TableRow
                key={fn.id}
                className={selectedId === fn.id ? "bg-muted/40" : undefined}
                onClick={() => setSelectedId(fn.id)}
              >
                <TableCell className="font-medium">{fn.name}</TableCell>
                <TableCell className="font-mono text-xs">{fn.slug}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={fn.enabled}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => toggleEnabled(fn, v)}
                    aria-label={`Enable ${fn.name}`}
                  />
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => deleteFn(fn.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {rows?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No functions yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {selected ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{selected.name}</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              {selected.slug}
            </Badge>
          </div>
          <Field label="Steps (live save)">
            <FieldInput
              value={editSteps}
              onChange={(e) => setEditSteps(e.target.value)}
              disabled={!canManage}
              className="font-mono"
            />
          </Field>
          {canManage ? (
            <Button type="button" disabled={isPending} onClick={saveSteps}>
              Save steps
            </Button>
          ) : null}
          {canInvoke ? (
            <div className="grid gap-3 border-t border-border pt-4">
              <Field label="Invoke body JSON">
                <FieldInput
                  value={invokeBody}
                  onChange={(e) => setInvokeBody(e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Button type="button" disabled={isPending} onClick={invokeFn}>
                Invoke
              </Button>
              {invokeResult ? (
                <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
                  {invokeResult}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
