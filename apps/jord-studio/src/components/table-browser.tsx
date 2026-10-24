"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

type ApiError = { message?: string };

type RowPage = {
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  limit: number;
  offset: number;
};

type Props = {
  table: string;
};

const PAGE = 50;

export function TableBrowser({ table }: Props) {
  const [page, setPage] = useState<RowPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    (nextOffset: number) => {
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/schema/tables/${encodeURIComponent(table)}/rows?limit=${PAGE}&offset=${nextOffset}`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as ApiError;
            throw new Error(body.message ?? `Failed to load rows (${res.status}).`);
          }
          const data = (await res.json()) as RowPage;
          setPage(data);
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

  const columns = page?.columns ?? [];
  const rows = page?.rows ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Data
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{table}</h1>
          <p className="text-sm text-muted-foreground">
            Read-only browse. Writes for user tables are not in this sprint.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tables">All tables</Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Rows unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!error && page === null ? (
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading rows…" : "Loading rows…"}
        </p>
      ) : null}

      {page && rows.length === 0 ? (
        <Alert variant="info">
          <AlertTitle>Empty table</AlertTitle>
          <AlertDescription>
            <code className="font-mono">{table}</code> has no rows in this page.
          </AlertDescription>
        </Alert>
      ) : null}

      {page && columns.length > 0 && rows.length > 0 ? (
        <Table striped>
          <TableHeader>
            <TableRow>
              {columns.map((name) => (
                <TableHead key={name} className="font-mono text-xs">
                  {name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${offset}-${index}`}>
                {columns.map((name) => (
                  <TableCell key={name} className="font-mono text-xs">
                    {row[name] == null ? "null" : String(row[name])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
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
