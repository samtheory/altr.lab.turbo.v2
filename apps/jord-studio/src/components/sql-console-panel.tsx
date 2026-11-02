"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  SqlEditor,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";
import type { SqlCompletionModel, SqlDialect } from "@altr/apolyx";

import {
  SqlQueryTabsStrip,
  useSqlWorkspaceOptional,
} from "@/components/sql-workspace";
import { useProjectSlug } from "@/hooks/use-project-path";
import type { SchemaTable } from "@/lib/schema";
import {
  buildStudioSqlModel,
  inferSqlDialect,
  mapWithConcurrency,
  sqlDialectForEngine,
  sqlDialectLabel,
  studioSqlModelCache,
  tableDetailPath,
} from "@/lib/studio-sql-editor";

type Props = {
  role: string;
  /** Registry engine for this project; `env` means the primary server DB. */
  engine?: string | null;
};

/** Table details fetched per introspection refresh. */
const DETAIL_CONCURRENCY = 6;
/** Refetch the completion model when the window regains focus after this long. */
const SCHEMA_STALE_MS = 60_000;

export function SqlConsolePanel({ role, engine }: Props) {
  const projectSlug = useProjectSlug();
  const workspace = useSqlWorkspaceOptional();

  const sql = workspace?.activeTab?.sql ?? "SELECT 1 AS n;";
  const [readOnly, setReadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const [dialect, setDialect] = useState<SqlDialect>(() =>
    sqlDialectForEngine(engine),
  );
  const [model, setModel] = useState<SqlCompletionModel | null>(() =>
    studioSqlModelCache.get(projectSlug),
  );
  const [schemaState, setSchemaState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const loadedAtRef = useRef(0);

  const loadSchema = useCallback(
    async (silent = false) => {
      if (!silent) setSchemaState("loading");
      setSchemaError(null);
      try {
        const schemasRes = await fetch("/api/schema/schemas", {
          cache: "no-store",
        });
        if (!schemasRes.ok) {
          throw new Error(`Schema listing failed (${schemasRes.status}).`);
        }
        const schemasBody = (await schemasRes.json()) as {
          schemas?: Array<{ name?: string }>;
        };
        const schemaNames = (schemasBody.schemas ?? [])
          .map((entry) => entry.name)
          .filter((name): name is string => Boolean(name));

        const nextDialect = inferSqlDialect(engine, schemaNames);
        setDialect(nextDialect);

        const listings = await Promise.all(
          schemaNames.map(async (schema) => {
            const res = await fetch(
              `/api/schema/tables?schema=${encodeURIComponent(schema)}`,
              { cache: "no-store" },
            );
            if (!res.ok) return [] as Array<{ schema: string; table: string }>;
            const body = (await res.json()) as { tables?: string[] };
            return (body.tables ?? []).map((table) => ({ schema, table }));
          }),
        );
        const targets = listings.flat();

        const described = await mapWithConcurrency(
          targets,
          DETAIL_CONCURRENCY,
          async ({ schema, table }): Promise<SchemaTable | null> => {
            const res = await fetch(tableDetailPath(table, schema), {
              cache: "no-store",
            });
            if (!res.ok) return null;
            const info = (await res.json()) as SchemaTable;
            return { ...info, name: table, schema: info.schema ?? schema };
          },
        );
        const tables = described.filter(
          (table): table is SchemaTable => table !== null,
        );

        const nextModel = buildStudioSqlModel({
          dialect: nextDialect,
          schemas: schemaNames,
          tables,
        });
        studioSqlModelCache.set(projectSlug, nextModel);
        setModel(nextModel);
        setSchemaState("ready");
        loadedAtRef.current = Date.now();
      } catch (err) {
        setSchemaError(
          err instanceof Error ? err.message : "Schema introspection failed",
        );
        setSchemaState("error");
      }
    },
    [engine, projectSlug],
  );

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - loadedAtRef.current < SCHEMA_STALE_MS) return;
      void loadSchema(true);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSchema]);

  // Clear result pane when switching tabs so stale rows do not mislead.
  useEffect(() => {
    setError(null);
    setNote(null);
    setColumns([]);
    setRows([]);
    setElapsedMs(null);
  }, [workspace?.active]);

  const onSqlChange = useCallback(
    (next: string) => {
      workspace?.updateSql(next);
    },
    [workspace],
  );

  const run = useCallback(() => {
    const statement = sql.trim();
    if (!statement) return;
    startTransition(async () => {
      setError(null);
      setNote(null);
      const res = await fetch("/api/sql/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sql: statement, readOnly }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        columns?: string[];
        rows?: Array<Record<string, unknown>>;
        elapsedMs?: number;
        note?: string;
        truncated?: boolean;
      };
      if (!res.ok) {
        setError(body.message ?? `SQL failed (${res.status})`);
        setRows([]);
        setColumns([]);
        setElapsedMs(null);
        workspace?.bumpRevision();
        return;
      }
      setColumns(body.columns ?? []);
      setRows(body.rows ?? []);
      setElapsedMs(body.elapsedMs ?? null);
      setNote(
        body.truncated
          ? `${body.note ?? ""} (result truncated by the row cap)`.trim()
          : (body.note ?? null),
      );
      // Executed snapshot clears dirty; history list refreshes from audit.
      workspace?.markExecuted();
      workspace?.bumpRevision();
    });
  }, [sql, readOnly, workspace]);

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
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Database
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            SQL editor
          </h1>
          <Badge variant="outline">{sqlDialectLabel(dialect)}</Badge>
          <span className="text-xs text-muted-foreground" role="status">
            {schemaState === "loading"
              ? "Loading schema…"
              : schemaState === "error"
                ? (schemaError ?? "Schema unavailable")
                : `${model?.tables.length ?? 0} tables · ${
                    model?.schemas.length ?? 0
                  } schemas in completion`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Reads use a dedicated connection with engine-enforced query_only /
          READ ONLY. Writes go through the write queue. Tabs, saved queries, and
          history live in the Queries sidebar — opening a saved/history item
          creates a new tab.
        </p>
      </div>

      <SqlQueryTabsStrip />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={readOnly} onCheckedChange={setReadOnly} id="ro" />
          <label htmlFor="ro" className="text-sm">
            Read-only
          </label>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => workspace?.requestSave()}
            aria-keyshortcuts="Control+S Meta+S"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadSchema()}
            disabled={schemaState === "loading"}
          >
            Refresh schema
          </Button>
          <Button
            type="button"
            disabled={isPending || !sql.trim()}
            onClick={run}
            aria-keyshortcuts="Control+Enter Meta+Enter"
          >
            Run
          </Button>
        </div>
      </div>

      <SqlEditor
        value={sql}
        onChange={onSqlChange}
        onRun={run}
        dialect={dialect}
        model={model}
        ariaLabel="SQL statement"
        placeholder="SELECT * FROM …"
      />

      <p className="text-xs text-muted-foreground">
        <kbd className="font-mono">Ctrl/⌘+Enter</kbd> runs ·{" "}
        <kbd className="font-mono">Ctrl/⌘+T</kbd> new tab ·{" "}
        <kbd className="font-mono">Ctrl/⌘+W</kbd> close ·{" "}
        <kbd className="font-mono">Ctrl/⌘+S</kbd> save ·{" "}
        <kbd className="font-mono">Shift+Alt+F</kbd> formats.
      </p>

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
        <p className="text-xs text-muted-foreground">
          {elapsedMs} ms · {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
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
