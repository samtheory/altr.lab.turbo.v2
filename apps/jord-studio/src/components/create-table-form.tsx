"use client";

import { useState, useTransition } from "react";
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
} from "@altr/apolyx";
import { Plus, Trash2 } from "lucide-react";

import { InspectorFooter } from "@/components/inspector-chrome";
import { canAlterSchema, type JordRole } from "@/lib/auth/roles";
import { COLUMN_TYPES, type ColumnType } from "@/lib/schema";

type DraftColumn = { key: string; name: string; type: ColumnType };

type Props = {
  role: JordRole;
  /** Target schema for CREATE TABLE (S0050). */
  schema: string;
  onCancel?: () => void;
  onCreated?: (table: string, schema: string) => void;
};

function nextKey(): string {
  return `col-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Stub create-table inspector (S0050). Rich column model lands in S0052+.
 * Posts to the existing schema DDL path with `schema` in the body.
 */
export function CreateTableForm({
  role,
  schema,
  onCancel,
  onCreated,
}: Props) {
  const canAlter = canAlterSchema(role);
  const [tableName, setTableName] = useState("");
  const [draftCols, setDraftCols] = useState<DraftColumn[]>([
    { key: nextKey(), name: "id", type: "TEXT" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAlter) {
      setError(`Role "${role}" cannot create tables.`);
      return;
    }
    setError(null);
    setOk(null);
    const name = tableName.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      setError("Table name must match [a-zA-Z_][a-zA-Z0-9_]*");
      return;
    }
    const columns = draftCols
      .map((col) => ({ name: col.name.trim(), type: col.type }))
      .filter((col) => col.name.length > 0);
    if (columns.length === 0) {
      setError("Add at least one column.");
      return;
    }
    if (columns.some((col) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name))) {
      setError("Column names must match [a-zA-Z_][a-zA-Z0-9_]*");
      return;
    }

    startTransition(async () => {
      try {
        const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
        const res = await fetch(`/api/schema/tables${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, columns, schema }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          sql?: string;
        };
        if (!res.ok) {
          setError(body.message ?? `CREATE TABLE failed (${res.status}).`);
          return;
        }
        setOk(body.sql ?? `Created ${schema}.${name}`);
        onCreated?.(name, schema);
      } catch {
        setError("Network error talking to Studio BFF.");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-0 flex-col"
      data-slot="create-table-form"
    >
      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            New table in schema
          </p>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {schema}
          </Badge>
        </div>

        {!canAlter ? (
          <Alert variant="destructive">
            <AlertTitle>Read-only role</AlertTitle>
            <AlertDescription>
              Role &quot;{role}&quot; cannot alter schema.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Create failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {ok ? (
          <Alert variant="info">
            <AlertTitle>Created</AlertTitle>
            <AlertDescription className="font-mono text-xs">{ok}</AlertDescription>
          </Alert>
        ) : null}

        <Field label="Table name">
          <FieldInput
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="orders"
            autoComplete="off"
            disabled={!canAlter || isPending}
            className="font-mono"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Columns
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canAlter || isPending}
              onClick={() =>
                setDraftCols((prev) => [
                  ...prev,
                  { key: nextKey(), name: "", type: "TEXT" },
                ])
              }
            >
              <Plus className="mr-1 size-3.5" aria-hidden />
              Column
            </Button>
          </div>
          {draftCols.map((col, index) => (
            <div key={col.key} className="flex items-end gap-2">
              <Field
                label={index === 0 ? "Name" : " "}
                className="flex-1"
              >
                <FieldInput
                  value={col.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraftCols((prev) =>
                      prev.map((c) =>
                        c.key === col.key ? { ...c, name: v } : c,
                      ),
                    );
                  }}
                  placeholder="column"
                  disabled={!canAlter || isPending}
                  className="font-mono"
                />
              </Field>
              <Field label={index === 0 ? "Type" : " "} className="w-28">
                <Select
                  value={col.type}
                  onValueChange={(v) =>
                    setDraftCols((prev) =>
                      prev.map((c) =>
                        c.key === col.key
                          ? { ...c, type: v as ColumnType }
                          : c,
                      ),
                    )
                  }
                  disabled={!canAlter || isPending}
                >
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove column ${col.name || index + 1}`}
                disabled={!canAlter || isPending || draftCols.length <= 1}
                onClick={() =>
                  setDraftCols((prev) => prev.filter((c) => c.key !== col.key))
                }
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <InspectorFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canAlter || isPending}>
          {isPending ? "Creating…" : "Create table"}
        </Button>
      </InspectorFooter>
    </form>
  );
}
