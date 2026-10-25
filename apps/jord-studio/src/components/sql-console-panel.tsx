"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldTextarea,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

type Props = { role: string };

export function SqlConsolePanel({ role }: Props) {
  const [sql, setSql] = useState("SELECT 1 AS n");
  const [readOnly, setReadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            The SQL console is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Database
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          SQL console
        </h1>
        <p className="text-sm text-muted-foreground">
          Reads use a dedicated connection with engine-enforced query_only /
          READ ONLY. Writes go through the write queue. Raw SQL bypasses
          migrations and, on libSQL, the outbox.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={readOnly} onCheckedChange={setReadOnly} id="ro" />
        <label htmlFor="ro" className="text-sm">
          Read-only
        </label>
      </div>

      <Field label="Statement">
        <FieldTextarea
          rows={8}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="font-mono text-sm"
        />
      </Field>

      <div className="flex gap-3">
        <Button
          disabled={isPending || !sql.trim()}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              setNote(null);
              const res = await fetch("/api/sql/execute", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sql, readOnly }),
              });
              const body = (await res.json().catch(() => ({}))) as {
                message?: string;
                columns?: string[];
                rows?: Array<Record<string, unknown>>;
                elapsedMs?: number;
                note?: string;
              };
              if (!res.ok) {
                setError(body.message ?? `SQL failed (${res.status})`);
                setRows([]);
                setColumns([]);
                return;
              }
              setColumns(body.columns ?? []);
              setRows(body.rows ?? []);
              setElapsedMs(body.elapsedMs ?? null);
              setNote(body.note ?? null);
            });
          }}
        >
          Run
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {note ? (
        <Alert variant="info">
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      ) : null}
      {elapsedMs != null ? (
        <p className="text-xs text-muted-foreground">{elapsedMs} ms</p>
      ) : null}

      {columns.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col} className="font-mono text-xs">
                    {String(row[col] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
