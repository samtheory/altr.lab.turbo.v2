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
  POLICY_EFFECTS,
  POLICY_OPERATIONS,
  type PublicPolicy,
} from "@/lib/database-api";

type ApiError = { error?: string; message?: string };

type Props = {
  role: JordRole;
};

const DEFAULT_RULES = JSON.stringify(
  [{ kind: "role_in", config: { roles: ["readonly"] } }],
  null,
  0,
);

export function PoliciesPanel({ role }: Props) {
  const canManage = canAlterSchema(role);
  const [rows, setRows] = useState<PublicPolicy[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Deny readonly select");
  const [operation, setOperation] = useState<string>("select");
  const [effect, setEffect] = useState<string>("deny");
  const [priority, setPriority] = useState("10");
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [editRules, setEditRules] = useState(DEFAULT_RULES);
  const [isPending, startTransition] = useTransition();
  const [dialect, setDialect] = useState<"libsql" | "postgres" | null>(null);

  const selected = rows?.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/policies", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to load policies (${res.status}).`),
      );
    }
    const data = (await res.json()) as { policies: PublicPolicy[] };
    setRows(data.policies);
    if (data.policies.length > 0) {
      setSelectedId((prev) =>
        prev && data.policies.some((p) => p.id === prev)
          ? prev
          : data.policies[0]!.id,
      );
    }
    return data.policies;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { dialect?: string } | null) => {
        if (cancelled || !body) return;
        if (body.dialect === "postgres" || body.dialect === "libsql") {
          setDialect(body.dialect);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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
    if (selected) setEditRules(selected.rules);
  }, [selected]);

  function create() {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/policies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            table_name: "records",
            operation,
            effect,
            priority: Number(priority) || 0,
            rules,
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
        const res = await fetch(`/api/policies/${selected.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rules: editRules }),
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

  function toggleEnabled(row: PublicPolicy, enabled: boolean) {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/policies/${row.id}`, {
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
        const res = await fetch(`/api/policies/${selected.id}`, {
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
        <h1 className="text-xl font-semibold">Policies</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Built-in rules on <code>records</code> (role / bucket). Higher
          priority wins; deny beats allow at the same priority. Default is
          allow when nothing matches. Admin manages; all roles may inspect.
        </p>
      </div>

      {dialect === "postgres" ? (
        <Alert>
          <AlertTitle>Postgres RLS</AlertTitle>
          <AlertDescription>
            These policies are enforced in the API and compiled to row-level
            security on <code>records</code>. The API still returns 403 when a
            policy denies a request.
          </AlertDescription>
        </Alert>
      ) : null}

      {dialect === "libsql" ? (
        <Alert>
          <AlertTitle>Server middleware</AlertTitle>
          <AlertDescription>
            This database enforces policies in jord-server before each records
            request. Native Postgres RLS is not used on the file database.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canManage ? (
        <div className="flex flex-col gap-3 max-w-xl border border-border p-4 rounded-md">
          <h2 className="text-sm font-medium">Create policy</h2>
          <Field label="Name">
            <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <label className="text-sm flex flex-col gap-1">
            Operation
            <select
              className="border border-border rounded-md px-2 py-1.5 bg-background"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              {POLICY_OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            Effect
            <select
              className="border border-border rounded-md px-2 py-1.5 bg-background"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
            >
              {POLICY_EFFECTS.map((ef) => (
                <option key={ef} value={ef}>
                  {ef}
                </option>
              ))}
            </select>
          </label>
          <Field label="Priority">
            <FieldInput
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </Field>
          <Field label="Rules JSON">
            <textarea
              className="w-full min-h-24 border border-border rounded-md px-2 py-1.5 font-mono text-xs bg-background"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
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
            Your role cannot create or edit policies (admin / alter-schema
            only).
          </AlertDescription>
        </Alert>
      )}

      {rows === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No policies yet.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Op</TableHead>
              <TableHead>Effect</TableHead>
              <TableHead>Priority</TableHead>
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
                  <Badge variant="outline">{row.operation}</Badge>
                </TableCell>
                <TableCell>{row.effect}</TableCell>
                <TableCell>{row.priority}</TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                >
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
          <Field label="Rules JSON">
            <textarea
              className="w-full min-h-28 border border-border rounded-md px-2 py-1.5 font-mono text-xs bg-background"
              value={editRules}
              disabled={!canManage}
              onChange={(e) => setEditRules(e.target.value)}
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
