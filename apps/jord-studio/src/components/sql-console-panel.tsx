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
} from "@altr/apolyx";
import type { SqlCompletionModel, SqlDialect } from "@altr/apolyx";

import { SqlResultsPanel } from "@/components/sql-results-panel";
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
import type { ExplainPlanNode } from "@/lib/studio-sql-results";

type Props = {
  role: string;
  /** Registry engine for this project; `env` means the primary server DB. */
  engine?: string | null;
};

/** Table details fetched per introspection refresh. */
const DETAIL_CONCURRENCY = 6;
/** Refetch the completion model when the window regains focus after this long. */
const SCHEMA_STALE_MS = 60_000;
const DEFAULT_ROW_CAP = 200;
const DEFAULT_TIMEOUT_MS = 30_000;

function newQueryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SqlConsolePanel({ role, engine }: Props) {
  const projectSlug = useProjectSlug();
  const workspace = useSqlWorkspaceOptional();

  const sql = workspace?.activeTab?.sql ?? "SELECT 1 AS n;";
  const [readOnly, setReadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [rowCount, setRowCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [plan, setPlan] = useState<ExplainPlanNode | null>(null);
  const [rowCap, setRowCap] = useState(DEFAULT_ROW_CAP);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [isPending, startTransition] = useTransition();
  const runningIdRef = useRef<string | null>(null);

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
    setRowCount(0);
    setTruncated(false);
    setElapsedMs(null);
    setPlan(null);
    setRowCap(DEFAULT_ROW_CAP);
  }, [workspace?.active]);

  const onSqlChange = useCallback(
    (next: string) => {
      workspace?.updateSql(next);
    },
    [workspace],
  );

  const clearResults = () => {
    setColumns([]);
    setRows([]);
    setRowCount(0);
    setTruncated(false);
    setElapsedMs(null);
    setPlan(null);
  };

  const runWithCap = useCallback(
    (cap: number) => {
      const statement = sql.trim();
      if (!statement) return;
      const queryId = newQueryId();
      runningIdRef.current = queryId;
      setRunningId(queryId);
      setCancelling(false);
      startTransition(async () => {
        setError(null);
        setNote(null);
        try {
          const res = await fetch("/api/sql/execute", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sql: statement,
              readOnly,
              id: queryId,
              rowCap: cap,
              timeoutMs: DEFAULT_TIMEOUT_MS,
            }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
            columns?: string[];
            rows?: Array<Record<string, unknown>>;
            rowCount?: number;
            elapsedMs?: number;
            note?: string;
            truncated?: boolean;
            cancelled?: boolean;
            error?: string;
            position?: { line: number; column: number };
            plan?: ExplainPlanNode;
            code?: string;
          };
          if (!res.ok) {
            const pos = body.position
              ? ` (line ${body.position.line}, column ${body.position.column})`
              : "";
            setError(
              `${body.message ?? `SQL failed (${res.status})`}${pos}${
                body.cancelled || body.error === "sql_cancelled"
                  ? " — cancelled"
                  : ""
              }`,
            );
            clearResults();
            workspace?.bumpRevision();
            return;
          }
          setColumns(body.columns ?? []);
          setRows(body.rows ?? []);
          setRowCount(body.rowCount ?? body.rows?.length ?? 0);
          setTruncated(Boolean(body.truncated));
          setElapsedMs(body.elapsedMs ?? null);
          setPlan(body.plan ?? null);
          setRowCap(cap);
          setNote(
            body.truncated
              ? `${body.note ?? ""} (result truncated by the row cap — use Fetch more)`.trim()
              : (body.note ?? null),
          );
          workspace?.markExecuted();
          workspace?.bumpRevision();
        } finally {
          if (runningIdRef.current === queryId) {
            runningIdRef.current = null;
            setRunningId(null);
            setCancelling(false);
          }
        }
      });
    },
    [sql, readOnly, workspace],
  );

  const run = useCallback(() => {
    runWithCap(DEFAULT_ROW_CAP);
  }, [runWithCap]);

  const cancel = useCallback(async () => {
    const id = runningIdRef.current;
    if (!id) return;
    setCancelling(true);
    try {
      await fetch("/api/sql/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      setCancelling(false);
    }
  }, []);

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

  const busy = isPending || runningId != null;

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
          <Badge variant="outline">Auto-commit</Badge>
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
          READ ONLY. Writes go through the write queue. Each statement
          auto-commits — BEGIN / COMMIT / ROLLBACK are rejected. Ending the
          session never leaves an open transaction dirty.
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
          {busy ? (
            <Button
              type="button"
              variant="destructive"
              disabled={cancelling}
              onClick={() => void cancel()}
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!sql.trim()}
              onClick={run}
              aria-keyshortcuts="Control+Enter Meta+Enter"
            >
              Run
            </Button>
          )}
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
        <kbd className="font-mono">Shift+Alt+F</kbd> formats. Default timeout{" "}
        {DEFAULT_TIMEOUT_MS / 1000}s · row cap {DEFAULT_ROW_CAP}.
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

      <SqlResultsPanel
        columns={columns}
        rows={rows}
        rowCount={rowCount}
        truncated={truncated}
        elapsedMs={elapsedMs}
        plan={plan}
        fetchMoreDisabled={busy}
        onFetchMore={() =>
          runWithCap(Math.min(1_000, Math.max(rowCap * 2, rowCap + 200)))
        }
      />
    </div>
  );
}
