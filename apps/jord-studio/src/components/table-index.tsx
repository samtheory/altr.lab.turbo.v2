"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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

import { useProjectHref } from "@/hooks/use-project-path";

type ApiError = { message?: string };

export function TableIndex() {
  const hrefFor = useProjectHref();
  const [tables, setTables] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/schema/tables", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiError;
          throw new Error(body.message ?? `Failed to list tables (${res.status}).`);
        }
        const data = (await res.json()) as { tables: string[] };
        setTables(data.tables);
        setError(null);
      } catch (err) {
        setTables(null);
        setError(err instanceof Error ? err.message : "Load failed.");
      }
    });
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Data
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Tables</h1>
        <p className="text-sm text-muted-foreground">
          Open a catalog table. <code className="font-mono">records</code> uses the scratchpad
          editor. Create tables from Schema.
        </p>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href={hrefFor("/schema")}>Create table</Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Tables unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!error && tables === null ? (
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading tables…" : "Loading tables…"}
        </p>
      ) : null}

      {tables && tables.length === 0 ? (
        <Alert variant="info">
          <AlertTitle>No tables</AlertTitle>
          <AlertDescription>The catalog has no user tables yet.</AlertDescription>
        </Alert>
      ) : null}

      {tables && tables.length > 0 ? (
        <Table striped>
          <TableHeader>
            <TableRow>
              <TableHead>name</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((name) => {
              const href =
                name === "records"
                  ? hrefFor("/records")
                  : hrefFor(`/tables/${encodeURIComponent(name)}`);
              return (
                <TableRow key={name}>
                  <TableCell className="font-mono text-xs">{name}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={href}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
