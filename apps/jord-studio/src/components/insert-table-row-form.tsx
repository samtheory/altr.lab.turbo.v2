"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldInput,
  cn,
} from "@altr/apolyx";

import { InspectorFooter } from "@/components/inspector-chrome";
import { canWriteTableRows, type JordRole } from "@/lib/auth/roles";
import {
  buildInsertValues,
  defaultDraftFromColumns,
  draftFromRow,
  isGeneratedIdColumn,
  type RowColumnMeta,
} from "@/lib/studio-row-ops";
import { takeRowSeed } from "@/lib/studio-row-seed";

type ApiError = { message?: string; field?: string };

type Props = {
  role: JordRole;
  table: string;
  schema: string;
  /** When set, prefill from this row and clear PK (duplicate). */
  seedPk?: string;
  onCancel: () => void;
  onCreated: () => void;
};

function schemaQuery(schema: string): string {
  if (!schema || schema === "public" || schema === "main") return "";
  return `schema=${encodeURIComponent(schema)}`;
}

export function InsertTableRowForm({
  role,
  table,
  schema,
  seedPk,
  onCancel,
  onCreated,
}: Props) {
  const canWrite = canWriteTableRows(role);
  const [columns, setColumns] = useState<RowColumnMeta[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sq = schemaQuery(schema);
        const infoQs = sq ? `?${sq}` : "";
        const infoRes = await fetch(
          `/api/schema/tables/${encodeURIComponent(table)}${infoQs}`,
          { cache: "no-store" },
        );
        if (!infoRes.ok) {
          const body = (await infoRes.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Failed to load columns (${infoRes.status}).`);
        }
        const info = (await infoRes.json()) as { columns?: RowColumnMeta[] };
        const cols = info.columns ?? [];
        if (cancelled) return;
        setColumns(cols);

        if (seedPk) {
          const seeded = takeRowSeed(seedPk);
          if (seeded) {
            setDraft(draftFromRow(cols, seeded));
            setLoadError(null);
            return;
          }
          setDraft(defaultDraftFromColumns(cols));
          setLoadError(
            `Could not load seed row ${seedPk} for duplicate; fill values manually.`,
          );
          return;
        }

        setDraft(defaultDraftFromColumns(cols));
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Load failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [table, schema, seedPk]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) {
      setError(`Role "${role}" cannot write table rows.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const values = buildInsertValues(columns, draft);
        const sq = schemaQuery(schema);
        const qs = sq ? `?${sq}` : "";
        const res = await fetch(
          `/api/schema/tables/${encodeURIComponent(table)}/rows${qs}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ values }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(
            body.field
              ? `${body.field}: ${body.message ?? "validation failed"}`
              : (body.message ?? `Insert failed (${res.status}).`),
          );
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("jord-table-rows-changed", {
              detail: { table, schema },
            }),
          );
        }
        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Insert failed.");
      }
    });
  }

  const actions = (
    <>
      <Button type="submit" disabled={isPending || !canWrite || columns.length === 0}>
        {isPending ? "Inserting…" : seedPk ? "Duplicate row" : "Insert row"}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </>
  );

  return (
    <form onSubmit={onSubmit} className="flex min-h-full flex-col">
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Fields come from the column model for{" "}
          <code className="font-mono">
            {schema && schema !== "public" && schema !== "main"
              ? `${schema}.`
              : ""}
            {table}
          </code>
          . Generated id columns may be left blank.
        </p>

        {!canWrite ? (
          <Alert variant="warning">
            <AlertTitle>Read-only session</AlertTitle>
            <AlertDescription>
              Role <code className="font-mono">{role}</code> cannot insert rows.
            </AlertDescription>
          </Alert>
        ) : null}

        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not prepare form</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Insert failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3">
          {columns.map((col) => {
            const generated = isGeneratedIdColumn(col);
            return (
              <Field
                key={col.name}
                label={`${col.name}${col.pk ? " (pk)" : ""}`}
                description={
                  generated
                    ? `${col.type} · generated if blank`
                    : col.notnull
                      ? `${col.type} · required`
                      : col.type
                }
              >
                <FieldInput
                  value={draft[col.name] ?? ""}
                  placeholder={generated ? "auto" : undefined}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [col.name]: event.target.value,
                    }))
                  }
                  className={cn(generated && "placeholder:italic")}
                />
              </Field>
            );
          })}
        </div>
      </div>
      <InspectorFooter>{actions}</InspectorFooter>
    </form>
  );
}
