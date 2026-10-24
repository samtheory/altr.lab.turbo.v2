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

import { canAlterSchema, type JordRole } from "@/lib/auth/roles";
import {
  TRIGGER_EVENTS,
  type PublicTrigger,
} from "@/lib/database-api";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

const DEFAULT_ACTIONS = JSON.stringify(
  [{ kind: "log", config: { message: "records insert" } }],
  null,
  0,
);

export function TriggersPanel({ role }: Props) {
  const canManage = canAlterSchema(role);
  const [rows, setRows] = useState<PublicTrigger[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Log inserts");
  const [event, setEvent] = useState<string>("insert");
  const [actions, setActions] = useState(DEFAULT_ACTIONS);
  const [editActions, setEditActions] = useState(DEFAULT_ACTIONS);
  const [isPending, startTransition] = useTransition();

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/triggers", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load triggers (${res.status}).`),
      );
    }
    const data = (await res.json()) as { triggers: PublicTrigger[] };
    setRows(data.triggers);
    if (data.triggers.length > 0) {
      setSelectedId((prev) =>
        prev && data.triggers.some((t) => t.id === prev)
          ? prev
          : data.triggers[0]!.id,
      );
    }
    return data.triggers;
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
    if (selected) setEditActions(selected.actions);
  }, [selected]);

  function create() {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/triggers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            table_name: "records",
            event,
            actions,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Create failed (${res.status})`);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  }

  function saveSelected() {
    if (!selected) return;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/triggers/${selected.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ actions: editActions }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Save failed (${res.status})`);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function toggleEnabled(row: PublicTrigger, enabled: boolean) {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/triggers/${row.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Update failed (${res.status})`);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function removeSelected() {
    if (!selected) return;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/triggers/${selected.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Delete failed (${res.status})`);
        }
        setSelectedId(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Triggers</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          AFTER hooks on successful <code>records</code> writes (server write
          path). Actions: <code>log</code>, <code>echo</code>,{" "}
          <code>invoke_function</code>. Fail-soft by default — the original
          write is not rolled back.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canManage ? (
        <div className="flex flex-col gap-3 max-w-xl border border-border p-4 rounded-md">
          <h2 className="text-sm font-medium">Create trigger</h2>
          <Field label="Name">
            <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <label className="text-sm flex flex-col gap-1">
            Event
            <select
              className="border border-border rounded-md px-2 py-1.5 bg-background"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            >
              {TRIGGER_EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
          <Field label="Actions JSON">
            <textarea
              className="w-full min-h-24 border border-border rounded-md px-2 py-1.5 font-mono text-xs bg-background"
              value={actions}
              onChange={(e) => setActions(e.target.value)}
            />
          </Field>
          <Button type="button" onClick={create} disabled={isPending}>
            Create
          </Button>
        </div>
      ) : (
        <Alert>
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            Your role cannot create or edit triggers (admin / alter-schema
            only).
          </AlertDescription>
        </Alert>
      )}

      {rows === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No triggers yet.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Timing</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  row.id === selectedId ? "bg-muted/40 cursor-pointer" : "cursor-pointer"
                }
                onClick={() => setSelectedId(row.id)}
              >
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.event}</Badge>
                </TableCell>
                <TableCell>{row.timing}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={row.enabled}
                    disabled={!canManage || isPending}
                    onCheckedChange={(v) => toggleEnabled(row, v)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {selected ? (
        <div className="flex flex-col gap-3 max-w-2xl border border-border p-4 rounded-md">
          <h2 className="text-sm font-medium">Edit · {selected.name}</h2>
          <Field label="Actions JSON">
            <textarea
              className="w-full min-h-28 border border-border rounded-md px-2 py-1.5 font-mono text-xs bg-background"
              value={editActions}
              disabled={!canManage}
              onChange={(e) => setEditActions(e.target.value)}
            />
          </Field>
          {canManage ? (
            <div className="flex gap-2">
              <Button type="button" onClick={saveSelected} disabled={isPending}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={removeSelected}
                disabled={isPending}
              >
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
