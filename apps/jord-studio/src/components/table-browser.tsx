"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DataGrid,
  emptyColumnLayout,
  Field,
  FieldInput,
  Input,
  mergeColumnLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  type DataGridColumnDef,
  type DataGridColumnLayout,
  type DataGridFilter,
  type DataGridSort,
} from "@altr/apolyx";

import { useWorkspaceTabsOptional } from "@/components/workspace-tabs";
import { useProjectHref, useProjectSlug } from "@/hooks/use-project-path";
import { canWriteTableRows, type JordRole } from "@/lib/auth/roles";
import { sqlTypeToGridType } from "@/lib/studio-grid-columns";
import { SCHEMA_ALL } from "@/lib/studio-schema-prefs";
import {
  deleteTableView,
  getTableViewsBucket,
  loadTableViewsStore,
  renameTableView,
  saveTableViewsStore,
  setDefaultTableView,
  snapshotFromState,
  upsertTableView,
  type TableViewSnapshot,
  type TableViewsStore,
} from "@/lib/studio-table-views";
import { makeTabKey, parseTabKey } from "@/lib/studio-workspace-tabs";

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

function schemaQuery(schema: string | null): string {
  if (!schema || schema === SCHEMA_ALL) return "";
  return `schema=${encodeURIComponent(schema)}`;
}

function layoutFromTab(input: {
  columnIds: string[];
  columnOrder: string[] | null;
  columnWidths: Record<string, number> | null;
  hiddenColumns: string[] | null;
  pinnedColumns: Record<string, "left" | "right"> | null;
}): DataGridColumnLayout {
  const base = emptyColumnLayout(input.columnIds);
  return mergeColumnLayout(
    {
      order: input.columnOrder ?? base.order,
      hidden: input.hiddenColumns ?? [],
      widths: input.columnWidths ?? {},
      pins: input.pinnedColumns ?? {},
    },
    input.columnIds,
  );
}

export function TableBrowser({ table, role }: Props) {
  const hrefFor = useProjectHref();
  const projectSlug = useProjectSlug();
  const searchParams = useSearchParams();
  const workspaceTabs = useWorkspaceTabsOptional();
  const canWrite = canWriteTableRows(role);

  const schema = useMemo(() => {
    const active = workspaceTabs?.active
      ? parseTabKey(workspaceTabs.active)
      : null;
    if (active && active.table === table) return active.schema;
    const fromUrl = searchParams.get("schema");
    if (fromUrl && fromUrl !== SCHEMA_ALL) return fromUrl;
    return workspaceTabs?.defaultSchema ?? "public";
  }, [workspaceTabs?.active, workspaceTabs?.defaultSchema, searchParams, table]);

  const tabKey = useMemo(() => {
    try {
      return makeTabKey(schema, table);
    } catch {
      return null;
    }
  }, [schema, table]);

  const [page, setPage] = useState<RowPage | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [offset, setOffset] = useState(() =>
    tabKey && workspaceTabs
      ? workspaceTabs.getTabState(tabKey).offset
      : 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingPk, setEditingPk] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveState, setLiveState] = useState<
    "off" | "connecting" | "live" | "reconnecting"
  >("off");
  const [isPending, startTransition] = useTransition();

  const [columnLayout, setColumnLayout] = useState<DataGridColumnLayout>(() =>
    emptyColumnLayout([]),
  );
  const [filters, setFilters] = useState<DataGridFilter[]>([]);
  const [sort, setSort] = useState<DataGridSort>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [viewsStore, setViewsStore] = useState<TableViewsStore>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewNameDraft, setViewNameDraft] = useState("");

  // Restore per-tab grid state when the active tab key changes.
  useEffect(() => {
    if (!tabKey || !workspaceTabs) return;
    const state = workspaceTabs.getTabState(tabKey);
    setOffset(state.offset);
    setFilters((state.filters as DataGridFilter[]) ?? []);
    setSort(state.sort);
    setQuickSearch(state.quickSearch ?? "");
    setActiveViewId(state.activeViewId);
    setPage(null);
    setError(null);
    setMissing(false);
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  useEffect(() => {
    if (!projectSlug) return;
    const store = loadTableViewsStore(projectSlug);
    setViewsStore(store);
  }, [projectSlug]);

  // Apply default named view once when tab opens (if no persisted layout yet).
  useEffect(() => {
    if (!tabKey || !projectSlug || !workspaceTabs) return;
    const state = workspaceTabs.getTabState(tabKey);
    if (state.columnOrder || state.activeViewId) return;
    const bucket = getTableViewsBucket(loadTableViewsStore(projectSlug), tabKey);
    const def = bucket.views.find((v) => v.id === bucket.defaultViewId);
    if (!def) return;
    applyView(def, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey, projectSlug]);

  const setOffsetPersisted = useCallback(
    (next: number | ((cur: number) => number)) => {
      setOffset((cur) => {
        const value = typeof next === "function" ? next(cur) : next;
        if (tabKey && workspaceTabs) {
          workspaceTabs.patchTabState(tabKey, { offset: value });
        }
        return value;
      });
    },
    [tabKey, workspaceTabs],
  );

  const persistGridState = useCallback(
    (patch: {
      columnLayout?: DataGridColumnLayout;
      filters?: DataGridFilter[];
      sort?: DataGridSort;
      quickSearch?: string;
      activeViewId?: string | null;
    }) => {
      if (!tabKey || !workspaceTabs) return;
      const layout = patch.columnLayout;
      workspaceTabs.patchTabState(tabKey, {
        filters: patch.filters as never,
        sort: patch.sort === undefined ? undefined : patch.sort,
        quickSearch: patch.quickSearch,
        activeViewId:
          patch.activeViewId === undefined ? undefined : patch.activeViewId,
        columnOrder: layout?.order ?? undefined,
        columnWidths: layout?.widths ?? undefined,
        hiddenColumns: layout?.hidden ?? undefined,
        pinnedColumns: layout?.pins ?? undefined,
      });
    },
    [tabKey, workspaceTabs],
  );

  function applyView(view: TableViewSnapshot, persistActive: boolean) {
    setColumnLayout(view.columnLayout);
    setFilters(view.filters);
    setSort(view.sort);
    setQuickSearch(view.quickSearch);
    setActiveViewId(view.id);
    if (persistActive) {
      persistGridState({
        columnLayout: view.columnLayout,
        filters: view.filters,
        sort: view.sort,
        quickSearch: view.quickSearch,
        activeViewId: view.id,
      });
    }
  }

  const load = useCallback(
    (nextOffset: number) => {
      startTransition(async () => {
        try {
          const sq = schemaQuery(schema);
          const rowQs = `limit=${PAGE}&offset=${nextOffset}${sq ? `&${sq}` : ""}`;
          const infoQs = sq ? `?${sq}` : "";
          const [rowRes, infoRes] = await Promise.all([
            fetch(
              `/api/schema/tables/${encodeURIComponent(table)}/rows?${rowQs}`,
              { cache: "no-store" },
            ),
            fetch(`/api/schema/tables/${encodeURIComponent(table)}${infoQs}`, {
              cache: "no-store",
            }),
          ]);
          if (infoRes.status === 404 || rowRes.status === 404) {
            setMissing(true);
            setPage(null);
            setColumns([]);
            setError(null);
            return;
          }
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
          setMissing(false);
          setError(null);
        } catch (err) {
          setPage(null);
          setError(err instanceof Error ? err.message : "Load failed.");
        }
      });
    },
    [table, schema],
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
  const displayName =
    schema && schema !== "public" && schema !== "main"
      ? `${schema}.${table}`
      : table;

  const columnIds = useMemo(() => gridColumns, [gridColumns]);

  // Merge layout when the column set changes (new column from DDL).
  useEffect(() => {
    if (columnIds.length === 0) return;
    setColumnLayout((prev) => {
      if (prev.order.length === 0 && tabKey && workspaceTabs) {
        const state = workspaceTabs.getTabState(tabKey);
        return layoutFromTab({
          columnIds,
          columnOrder: state.columnOrder,
          columnWidths: state.columnWidths,
          hiddenColumns: state.hiddenColumns,
          pinnedColumns: state.pinnedColumns,
        });
      }
      return mergeColumnLayout(prev, columnIds);
    });
  }, [columnIds.join("\0"), tabKey, workspaceTabs]);

  const gridColumnDefs = useMemo<DataGridColumnDef<Record<string, Cell>>[]>(
    () =>
      columnIds.map((name) => {
        const info = columns.find((c) => c.name === name);
        return {
          id: name,
          header: info?.pk ? `${name} (pk)` : name,
          type: sqlTypeToGridType(info?.type ?? "TEXT"),
          accessor: (row) => row[name],
        };
      }),
    [columnIds, columns],
  );

  const viewsBucket = tabKey
    ? getTableViewsBucket(viewsStore, tabKey)
    : { views: [], defaultViewId: null };

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
        const sq = schemaQuery(schema);
        const qs = sq ? `?${sq}` : "";
        const path = editingPk
          ? `/api/schema/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(editingPk)}${qs}`
          : `/api/schema/tables/${encodeURIComponent(table)}/rows${qs}`;
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
        const sq = schemaQuery(schema);
        const qs = sq ? `?${sq}` : "";
        const res = await fetch(
          `/api/schema/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(pk)}${qs}`,
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

  function saveCurrentView(asNew: boolean) {
    if (!tabKey || !projectSlug) return;
    const name =
      viewNameDraft.trim() ||
      (asNew
        ? `View ${viewsBucket.views.length + 1}`
        : viewsBucket.views.find((v) => v.id === activeViewId)?.name) ||
      "View";
    const snap = snapshotFromState({
      id: asNew ? undefined : activeViewId ?? undefined,
      name,
      columnLayout,
      filters,
      sort,
      quickSearch,
    });
    const next = upsertTableView(viewsStore, tabKey, snap, !viewsBucket.defaultViewId);
    setViewsStore(next);
    saveTableViewsStore(projectSlug, next);
    setActiveViewId(snap.id);
    setViewNameDraft("");
    persistGridState({ activeViewId: snap.id });
  }

  if (missing) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Table missing</AlertTitle>
          <AlertDescription>
            <code className="font-mono">{displayName}</code> is no longer in the
            catalog. It may have been dropped. Close this tab to continue.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {tabKey && workspaceTabs ? (
            <Button type="button" onClick={() => workspaceTabs.closeTab(tabKey)}>
              Close tab
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={hrefFor("/tables")}>All tables</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Data
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {table}
            {schema && schema !== "public" && schema !== "main" ? (
              <Badge
                variant="secondary"
                className="ml-3 align-middle font-mono text-xs font-normal"
              >
                {schema}
              </Badge>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            Apolyx DataGrid · column ops and saved views persist per table.
            {canWrite ? " Insert/edit form stays below until inline edit lands." : " Read-only for this role."}
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

      {tabKey ? (
        <section className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
          <Field label="Saved view" className="min-w-[12rem]">
            <Select
              value={activeViewId ?? "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") {
                  setActiveViewId(null);
                  persistGridState({ activeViewId: null });
                  return;
                }
                const view = viewsBucket.views.find((v) => v.id === value);
                if (view) applyView(view, true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No saved view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No saved view</SelectItem>
                {viewsBucket.views.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {view.name}
                    {viewsBucket.defaultViewId === view.id ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name" className="min-w-[10rem]">
            <Input
              value={viewNameDraft}
              onChange={(e) => setViewNameDraft(e.target.value)}
              placeholder="New view name"
              size="sm"
            />
          </Field>
          <Button type="button" size="sm" onClick={() => saveCurrentView(true)}>
            Save as new
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!activeViewId}
            onClick={() => saveCurrentView(false)}
          >
            Update
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!activeViewId || !projectSlug}
            onClick={() => {
              if (!activeViewId || !projectSlug || !tabKey) return;
              const next = setDefaultTableView(viewsStore, tabKey, activeViewId);
              setViewsStore(next);
              saveTableViewsStore(projectSlug, next);
            }}
          >
            Set default
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!activeViewId || !projectSlug}
            onClick={() => {
              if (!activeViewId || !projectSlug || !tabKey) return;
              const name = window.prompt("Rename view", viewNameDraft || "View");
              if (!name) return;
              const next = renameTableView(viewsStore, tabKey, activeViewId, name);
              setViewsStore(next);
              saveTableViewsStore(projectSlug, next);
            }}
          >
            Rename
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!activeViewId || !projectSlug}
            onClick={() => {
              if (!activeViewId || !projectSlug || !tabKey) return;
              const next = deleteTableView(viewsStore, tabKey, activeViewId);
              setViewsStore(next);
              saveTableViewsStore(projectSlug, next);
              setActiveViewId(null);
              persistGridState({ activeViewId: null });
            }}
          >
            Delete
          </Button>
        </section>
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

      {page || isPending || error ? (
        <DataGrid
          columns={gridColumnDefs}
          rows={rows}
          getRowId={(row) => {
            const pk = row[pkName];
            if (pk != null) return String(pk);
            return `row:${JSON.stringify(row)}`;
          }}
          columnLayout={columnLayout}
          onColumnLayoutChange={(next) => {
            setColumnLayout(next);
            persistGridState({ columnLayout: next });
          }}
          filters={filters}
          onFiltersChange={(next) => {
            setFilters(next);
            persistGridState({ filters: next });
          }}
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            persistGridState({ sort: next });
          }}
          quickSearch={quickSearch}
          onQuickSearchChange={(next) => {
            setQuickSearch(next);
            persistGridState({ quickSearch: next });
          }}
          loading={isPending && page === null}
          error={null}
          height={420}
          emptyMessage={
            page && rows.length === 0
              ? "No rows on this page."
              : "Loading…"
          }
          renderRowActions={
            canWrite
              ? (row) => {
                  const pk = row[pkName] == null ? "" : String(row[pkName]);
                  return (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isPending}
                        onClick={() => beginEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isPending || pk === ""}
                        onClick={() => removeRow(pk)}
                      >
                        Delete
                      </Button>
                    </>
                  );
                }
              : undefined
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading rows…</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending || offset === 0}
          onClick={() =>
            setOffsetPersisted((current) => Math.max(0, current - PAGE))
          }
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || rows.length < PAGE}
          onClick={() => setOffsetPersisted((current) => current + PAGE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
