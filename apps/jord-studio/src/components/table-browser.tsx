"use client";

import Link from "next/link";
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

import { useProjectHref } from "@/hooks/use-project-path";
import { canWriteTableRows, type JordRole } from "@/lib/auth/roles";

type ApiError = { message?: string };

type Cell = string | number | boolean | null;

type RowPage = {
  columns: string[];
  rows: Array<Record<string, Cell>>;
  limit: number;
  offset: number;
};

type ColumnInfo = {
  name: string;
  type: string;
  pk: boolean;
};

type Props = {
  table: string;
  role: JordRole;
};

const PAGE = 50;

function parseCell(type: string, raw: string): Cell {
  if (raw === "") return null;
  const kind = type.toUpperCase();
  if (kind.includes("INT")) {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      throw new Error(`${type} needs an integer`);
    }
    return n;
  }
  if (
    kind.includes("REAL") ||
    kind.includes("FLOA") ||
    kind.includes("DOUBLE")
  ) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error(`${type} needs a number`);
    }
    return n;
  }
  return raw;
}

export function TableBrowser({ table, role }: Props) {
  const hrefFor = useProjectHref();
  const canWrite = canWriteTableRows(role);
  const [page, setPage] = useState<RowPage | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingPk, setEditingPk] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveState, setLiveState] = useState<
    "off" | "connecting" | "live" | "reconnecting"
  >("off");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    (nextOffset: number) => {
      startTransition(async () => {
        try {
          const [rowRes, infoRes] = await Promise.all([
            fetch(
              `/api/schema/tables/${encodeURIComponent(table)}/rows?limit=${PAGE}&offset=${nextOffset}`,
              { cache: "no-store" },
            ),
            fetch(`/api/schema/tables/${encodeURIComponent(table)}`, {
              cache: "no-store",
            }),
          ]);
          if (!rowRes.ok) {
            const body = (await rowRes.json().catch(() => ({}))) as ApiError;
            throw new Error(body.message ?? `Failed to load rows (${rowRes.status}).`);
          }
          if (!infoRes.ok) {
            const body = (await infoRes.json().catch(() => ({}))) as ApiError;
            throw new Error(body.message ?? `Failed to load schema (${infoRes.status}).`);
          }
          const data = (await rowRes.json()) as RowPage;
          const info = (await infoRes.json()) as { columns?: ColumnInfo[] };
          setPage(data);
          setColumns(info.columns ?? []);
          setError(null);
        } catch (err) {
          setPage(null);
          setError(err instanceof Error ? err.message : "Load failed.");
        }
      });
    },
    [table],
  );

  useEffect(() => {
    load(offset);
  }, [load, offset]);

  useEffect(() => {
    if (!live) {
      setLiveState("off");
      return;
    }

    const source = new EventSource(
      `/api/realtime?table=${encodeURIComponent(table)}`,
    );
    setLiveState("connecting");

    source.addEventListener("jord.change", () => {
      setLiveState("live");
      load(offset);
    });
    source.onopen = () => setLiveState("live");
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setLive(false);
        setLiveState("off");
        setError("Live updates closed.");
        return;
      }
      setLiveState("reconnecting");
    };

    return () => {
      source.close();
    };
  }, [live, table, load, offset]);

  const pkName = columns.find((col) => col.pk)?.name ?? "id";
  const gridColumns = page?.columns ?? columns.map((col) => col.name);
  const rows = page?.rows ?? [];

  function beginEdit(row: Record<string, Cell>) {
    const next: Record<string, string> = {};
    for (const col of columns) {
      const value = row[col.name];
      next[col.name] = value == null ? "" : String(value);
    }
    setDraft(next);
    setEditingPk(row[pkName] == null ? null : String(row[pkName]));
  }

  function resetDraft() {
    setDraft({});
    setEditingPk(null);
  }

  function saveRow() {
    startTransition(async () => {
      try {
        const values: Record<string, Cell> = {};
        for (const col of columns) {
          if (editingPk && col.pk) continue;
          const raw = draft[col.name] ?? "";
          if (raw === "" && !col.pk) continue;
          values[col.name] = parseCell(col.type, raw);
        }
        if (!editingPk) {
          values[pkName] = parseCell(
            columns.find((col) => col.pk)?.type ?? "TEXT",
            draft[pkName] ?? "",
          );
        }
        const path = editingPk
          ? `/api/schema/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(editingPk)}`
          : `/api/schema/tables/${encodeURIComponent(table)}/rows`;
        const res = await fetch(path, {
          method: editingPk ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ values }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Save failed (${res.status}).`);
        }
        resetDraft();
        load(offset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  function removeRow(pk: string) {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/schema/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(pk)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Delete failed (${res.status}).`);
        }
        if (editingPk === pk) resetDraft();
        load(offset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Data
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{table}</h1>
          <p className="text-sm text-muted-foreground">
            {canWrite
              ? "Insert, edit, and delete rows. The records scratchpad stays on its own editor."
              : "Read-only for this role."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={live}
              onCheckedChange={setLive}
              aria-label="Live updates"
              size="sm"
            />
            <span className="text-sm text-muted-foreground">Live</span>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase">
              {liveState}
            </Badge>
          </div>
          <Button asChild variant="outline">
            <Link href={hrefFor("/tables")}>All tables</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Rows unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canWrite && columns.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            {editingPk ? `Edit ${pkName} ${editingPk}` : "Insert row"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((col) => (
              <Field
                key={col.name}
                label={`${col.name}${col.pk ? " (pk)" : ""}`}
                description={col.type}
              >
                <FieldInput
                  value={draft[col.name] ?? ""}
                  disabled={Boolean(editingPk) && col.pk}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [col.name]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={isPending} onClick={saveRow}>
              {editingPk ? "Save" : "Insert"}
            </Button>
            {editingPk ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={resetDraft}>
                Cancel
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!error && page === null ? (
        <p className="text-sm text-muted-foreground">Loading rows…</p>
      ) : null}

      {page && rows.length === 0 ? (
        <Alert variant="info">
          <AlertTitle>Empty table</AlertTitle>
          <AlertDescription>
            <code className="font-mono">{table}</code> has no rows in this page.
          </AlertDescription>
        </Alert>
      ) : null}

      {page && gridColumns.length > 0 && rows.length > 0 ? (
        <Table striped>
          <TableHeader>
            <TableRow>
              {gridColumns.map((name) => (
                <TableHead key={name} className="font-mono text-xs">
                  {name}
                </TableHead>
              ))}
              {canWrite ? <TableHead className="text-xs">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const pk = row[pkName] == null ? "" : String(row[pkName]);
              return (
                <TableRow key={`${offset}-${pk}-${index}`}>
                  {gridColumns.map((name) => (
                    <TableCell key={name} className="font-mono text-xs">
                      {row[name] == null ? "null" : String(row[name])}
                    </TableCell>
                  ))}
                  {canWrite ? (
                    <TableCell className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => beginEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || pk === ""}
                        onClick={() => removeRow(pk)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending || offset === 0}
          onClick={() => setOffset((current) => Math.max(0, current - PAGE))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || rows.length < PAGE}
          onClick={() => setOffset((current) => current + PAGE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
