"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

import { useWorkspaceTabsOptional } from "@/components/workspace-tabs";
import { useProjectHref } from "@/hooks/use-project-path";
import { SCHEMA_ALL, fallbackDefaultSchema } from "@/lib/studio-schema-prefs";

type ApiError = { message?: string };

export function TableIndex() {
  const hrefFor = useProjectHref();
  const searchParams = useSearchParams();
  const workspaceTabs = useWorkspaceTabsOptional();
  const schemaParam = searchParams.get("schema");
  const [tables, setTables] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openTable = (name: string) => {
    if (name === "records") return;
    const schema =
      schemaParam && schemaParam !== SCHEMA_ALL
        ? schemaParam
        : (workspaceTabs?.defaultSchema ??
          fallbackDefaultSchema(["public", "main"]));
    if (workspaceTabs?.enabled) {
      workspaceTabs.openTab({ schema, table: name });
      return;
    }
  };

  useEffect(() => {
    startTransition(async () => {
      try {
        const qs =
          schemaParam && schemaParam !== SCHEMA_ALL
            ? `?schema=${encodeURIComponent(schemaParam)}`
            : "";
        const res = await fetch(`/api/schema/tables${qs}`, {
          cache: "no-store",
        });
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
  }, [schemaParam]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Data
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Tables
          {schemaParam &&
          schemaParam !== SCHEMA_ALL &&
          schemaParam !== "public" &&
          schemaParam !== "main" ? (
            <Badge
              variant="secondary"
              className="ml-3 align-middle font-mono text-xs font-normal"
            >
              {schemaParam}
            </Badge>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Open a catalog table. <code className="font-mono">records</code> uses the scratchpad
          editor. Use + Add new table in the sidebar, or Schema.
        </p>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href={hrefFor("/schema")}>Schema visualizer</Link>
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
                    {name === "records" || !workspaceTabs?.enabled ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>Open</Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openTable(name)}
                      >
                        Open
                      </Button>
                    )}
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
