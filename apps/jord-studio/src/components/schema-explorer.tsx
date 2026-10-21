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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@altr/apolyx";

import {
  COLUMN_TYPES,
  previewAddColumnSql,
  type ColumnType,
  type SchemaTable,
} from "@/lib/schema";

type ViewMode = "browser" | "visualizer";

type ApiError = { error?: string; message?: string };

export function SchemaExplorer() {
  const [tables, setTables] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string>("records");
  const [tableInfo, setTableInfo] = useState<SchemaTable | null>(null);
  const [allTables, setAllTables] = useState<SchemaTable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("browser");
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState<ColumnType>("TEXT");
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadTables = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/schema/tables", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ??
          (res.status === 503
            ? "jord-server is down — start `pnpm dev:jord`."
            : `Failed to list tables (${res.status}).`),
      );
    }
    const data = (await res.json()) as { tables: string[] };
    setTables(data.tables);
    if (data.tables.length > 0 && !data.tables.includes(selected)) {
      setSelected(data.tables[0]!);
    }
    return data.tables;
  }, [selected]);

  const loadTable = useCallback(async (name: string) => {
    const res = await fetch(`/api/schema/tables/${encodeURIComponent(name)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(body.message ?? `Failed to describe ${name} (${res.status}).`);
    }
    return (await res.json()) as SchemaTable;
  }, []);

  const refreshAll = useCallback(() => {
    startTransition(async () => {
      try {
        const names = await loadTables();
        const infos = await Promise.all(names.map((n) => loadTable(n)));
        setAllTables(infos);
        const current = infos.find((t) => t.name === selected) ?? infos[0] ?? null;
        setTableInfo(current);
        if (current) setSelected(current.name);
        setError(null);
      } catch (err) {
        setTables(null);
        setTableInfo(null);
        setAllTables([]);
        setError(err instanceof Error ? err.message : "Load failed.");
      }
    });
  }, [loadTable, loadTables, selected]);

  useEffect(() => {
    refreshAll();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  useEffect(() => {
    if (!tables?.includes(selected)) return;
    startTransition(async () => {
      try {
        const info = await loadTable(selected);
        setTableInfo(info);
        setAllTables((prev) => {
          const next = prev.filter((t) => t.name !== info.name);
          next.push(info);
          return [...next].sort((a, b) => a.name.localeCompare(b.name));
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Describe failed.");
      }
    });
  }, [selected, tables, loadTable]);

  function onAddColumn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    const name = colName.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      setFormError("Column name must match [a-zA-Z_][a-zA-Z0-9_]*");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/schema/tables/${encodeURIComponent(selected)}/columns`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type: colType }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as ApiError & {
          table?: SchemaTable;
          sql?: string;
        };
        if (!res.ok) {
          setFormError(body.message ?? `ADD COLUMN failed (${res.status}).`);
          return;
        }
        setFormOk(`Applied ${body.sql ?? "ADD COLUMN"}`);
        setColName("");
        if (body.table) {
          setTableInfo(body.table);
          setAllTables((prev) => {
            const next = prev.filter((t) => t.name !== body.table!.name);
            next.push(body.table!);
            return [...next].sort((a, b) => a.name.localeCompare(b.name));
          });
        } else {
          refreshAll();
        }
      } catch {
        setFormError("Network error talking to Studio BFF.");
      }
    });
  }

  const sqlPreview =
    colName.trim().length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(colName.trim())
      ? previewAddColumnSql(selected, colName.trim(), colType)
      : `ALTER TABLE "${selected}" ADD COLUMN … ${colType};`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Database
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Schema</h1>
          <p className="text-sm text-muted-foreground">
            libSQL catalog via jord-server. Live save is additive{" "}
            <code className="font-mono">ADD COLUMN</code> only.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "browser" ? "default" : "outline"}
            onClick={() => setView("browser")}
          >
            Browser
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "visualizer" ? "default" : "outline"}
            onClick={() => setView("visualizer")}
          >
            Visualizer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={refreshAll} disabled={isPending}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Schema unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!error && tables === null ? (
        <p className="text-sm text-muted-foreground">Loading schema…</p>
      ) : null}

      {!error && tables && tables.length === 0 ? (
        <Alert variant="info">
          <AlertTitle>No tables</AlertTitle>
          <AlertDescription>sqlite_master has no user tables yet.</AlertDescription>
        </Alert>
      ) : null}

      {!error && tables && tables.length > 0 && view === "browser" ? (
        <>
          <Field label="table" description="From sqlite_master" className="max-w-xs">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {tableInfo ? (
            <Table striped>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">name</TableHead>
                  <TableHead className="font-mono text-xs">type</TableHead>
                  <TableHead className="font-mono text-xs">pk</TableHead>
                  <TableHead className="font-mono text-xs">notnull</TableHead>
                  <TableHead className="font-mono text-xs">dflt_value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableInfo.columns.map((col) => (
                  <TableRow key={col.name}>
                    <TableCell className="font-mono text-xs">{col.name}</TableCell>
                    <TableCell className="font-mono text-xs">{col.type || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{col.pk ? "1" : "0"}</TableCell>
                    <TableCell className="font-mono text-xs">{col.notnull ? "1" : "0"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {col.dflt_value ?? "null"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          <form
            onSubmit={onAddColumn}
            className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4"
          >
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">Add column</h2>
              <p className="text-sm text-muted-foreground">
                Live save v1 — no DROP / RENAME / CREATE TABLE.
              </p>
            </div>

            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>DDL failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            {formOk ? (
              <Alert variant="success">
                <AlertTitle>Applied</AlertTitle>
                <AlertDescription className="font-mono text-xs">{formOk}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="name" required>
                <FieldInput
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  placeholder="column_name"
                  className="font-mono text-sm"
                />
              </Field>
              <Field label="type" required>
                <Select value={colType} onValueChange={(v) => setColType(v as ColumnType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {sqlPreview}
            </pre>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Applying…" : "Apply ADD COLUMN"}
            </Button>
          </form>
        </>
      ) : null}

      {!error && view === "visualizer" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {(allTables.length > 0 ? allTables : tableInfo ? [tableInfo] : []).map((t) => (
            <article
              key={t.name}
              className={cn(
                "rounded-xl border border-border bg-card p-4 shadow-sm",
                t.name === selected && "ring-2 ring-ring/40",
              )}
            >
              <header className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">{t.name}</h2>
                <Badge variant="outline">{t.columns.length} cols</Badge>
              </header>
              <ul className="space-y-1 font-mono text-xs">
                {t.columns.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-2 border-t border-border/60 py-1.5 text-muted-foreground first:border-t-0"
                  >
                    <span className="text-foreground">
                      {c.pk ? (
                        <Badge variant="secondary" className="mr-1 text-[10px]">
                          pk
                        </Badge>
                      ) : null}
                      {c.name}
                    </span>
                    <span>{c.type || "?"}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {allTables.length === 0 && !tableInfo ? (
            <p className="text-sm text-muted-foreground">No table metadata loaded yet.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
