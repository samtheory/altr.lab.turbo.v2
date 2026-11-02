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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

import { useInspectorOptional } from "@/components/inspector-host";
import { useWorkspaceTabsOptional } from "@/components/workspace-tabs";
import { useProjectHref, useProjectSlug } from "@/hooks/use-project-path";
import { canWriteTableRows, type JordRole } from "@/lib/auth/roles";
import { sqlTypeToGridType } from "@/lib/studio-grid-columns";
import {
  bulkDeleteRows,
  clampPageSize,
  confirmDeleteLabel,
  DEFAULT_PAGE_SIZE,
  hasMoreRows,
  jumpToEndOffset,
  PAGE_SIZE_OPTIONS,
  parseCell,
  type BulkDeleteFailure,
  type Cell,
  type PageSize,
  type RowColumnMeta,
} from "@/lib/studio-row-ops";
import { putRowSeed } from "@/lib/studio-row-seed";
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

type RowPage = {
  columns: string[];
  rows: Array<Record<string, Cell>>;
  limit: number;
  offset: number;
  total?: number;
};

type Props = {
  table: string;
  role: JordRole;
};

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
  const inspector = useInspectorOptional();
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

  const [columns, setColumns] = useState<RowColumnMeta[]>([]);
  const [gridColumns, setGridColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, Cell>>>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [lastFetchCount, setLastFetchCount] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingPk, setEditingPk] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [liveState, setLiveState] = useState<
    "off" | "connecting" | "live" | "reconnecting"
  >("off");
  const [isPending, startTransition] = useTransition();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "single"; pk: string }
    | { kind: "bulk"; ids: string[] }
  >(null);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkFailures, setBulkFailures] = useState<BulkDeleteFailure[]>([]);

  const [columnLayout, setColumnLayout] = useState<DataGridColumnLayout>(() =>
    emptyColumnLayout([]),
  );
  const [filters, setFilters] = useState<DataGridFilter[]>([]);
  const [sort, setSort] = useState<DataGridSort>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [viewsStore, setViewsStore] = useState<TableViewsStore>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewNameDraft, setViewNameDraft] = useState("");

  useEffect(() => {
    if (!tabKey || !workspaceTabs) return;
    const state = workspaceTabs.getTabState(tabKey);
    setFilters((state.filters as DataGridFilter[]) ?? []);
    setSort(state.sort);
    setQuickSearch(state.quickSearch ?? "");
    setActiveViewId(state.activeViewId);
    setRows([]);
    setNextOffset(0);
    setLastFetchCount(0);
    setTotal(null);
    setSelectedRowIds([]);
    setError(null);
    setMissing(false);
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  useEffect(() => {
    if (!projectSlug) return;
    setViewsStore(loadTableViewsStore(projectSlug));
  }, [projectSlug]);

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

  const loadWindow = useCallback(
    (opts: { offset: number; mode: "replace" | "append"; size?: PageSize }) => {
      const size = opts.size ?? pageSize;
      startTransition(async () => {
        try {
          const sq = schemaQuery(schema);
          const rowQs = `limit=${size}&offset=${opts.offset}&total=1${sq ? `&${sq}` : ""}`;
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
            setRows([]);
            setColumns([]);
            setGridColumns([]);
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
          const info = (await infoRes.json()) as { columns?: RowColumnMeta[] };
          setColumns(info.columns ?? []);
          setGridColumns(data.columns);
          setTotal(typeof data.total === "number" ? data.total : null);
          setLastFetchCount(data.rows.length);
          setNextOffset(opts.offset + data.rows.length);
          setRows((prev) =>
            opts.mode === "append" ? [...prev, ...data.rows] : data.rows,
          );
          if (opts.mode === "replace") setSelectedRowIds([]);
          setMissing(false);
          setError(null);
          if (tabKey && workspaceTabs) {
            workspaceTabs.patchTabState(tabKey, { offset: opts.offset });
          }
        } catch (err) {
          if (opts.mode === "replace") setRows([]);
          setError(err instanceof Error ? err.message : "Load failed.");
        }
      });
    },
    [table, schema, pageSize, tabKey, workspaceTabs],
  );

  useEffect(() => {
    loadWindow({ offset: 0, mode: "replace" });
  }, [loadWindow]);

  useEffect(() => {
    function onRowsChanged(event: Event) {
      const detail = (event as CustomEvent<{ table?: string; schema?: string }>)
        .detail;
      if (detail?.table && detail.table !== table) return;
      if (detail?.schema && detail.schema !== schema) return;
      loadWindow({ offset: 0, mode: "replace" });
    }
    window.addEventListener("jord-table-rows-changed", onRowsChanged);
    return () =>
      window.removeEventListener("jord-table-rows-changed", onRowsChanged);
  }, [loadWindow, table, schema]);

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
      loadWindow({ offset: 0, mode: "replace" });
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
  }, [live, table, loadWindow]);

  const pkName = columns.find((col) => col.pk)?.name ?? "id";
  const displayName =
    schema && schema !== "public" && schema !== "main"
      ? `${schema}.${table}`
      : table;

  const columnIds = useMemo(() => gridColumns, [gridColumns]);

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

  const canFetchMore = hasMoreRows({
    loaded: rows.length,
    total,
    lastFetchCount,
    pageSize,
  });

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

  function openInsert(seed?: { pk: string; row: Record<string, Cell> }) {
    if (!inspector) return;
    if (seed) putRowSeed(seed.pk, seed.row);
    inspector.open("insert-table-row", {
      table,
      schema,
      ...(seed ? { seedPk: seed.pk } : {}),
    });
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
        loadWindow({ offset: 0, mode: "replace" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  async function deleteOne(pk: string) {
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
  }

  function runConfirmedDelete() {
    if (!confirm) return;
    const pending = confirm;
    setConfirm(null);
    startTransition(async () => {
      try {
        if (pending.kind === "single") {
          await deleteOne(pending.pk);
          if (editingPk === pending.pk) resetDraft();
          setSelectedRowIds((ids) => ids.filter((id) => id !== pending.pk));
          setBulkFailures([]);
          loadWindow({ offset: 0, mode: "replace" });
          return;
        }
        setBulkProgress({ done: 0, total: pending.ids.length });
        const report = await bulkDeleteRows({
          ids: pending.ids,
          deleteOne,
          onProgress: (done, totalCount) =>
            setBulkProgress({ done, total: totalCount }),
        });
        setBulkFailures(report.failed);
        setSelectedRowIds(report.failed.map((f) => f.pk));
        setBulkProgress(null);
        if (editingPk && report.deleted.includes(editingPk)) resetDraft();
        loadWindow({ offset: 0, mode: "replace" });
        if (report.failed.length > 0) {
          setError(
            `Deleted ${report.deleted.length}; ${report.failed.length} failed.`,
          );
        }
      } catch (err) {
        setBulkProgress(null);
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

  const emptyTable = !isPending && rows.length === 0 && total === 0 && !error;

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
            Row ops · fetch-more paging · virtualized grid
            {canWrite ? "." : " · read-only for this role."}
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
          {canWrite ? (
            <Button
              type="button"
              onClick={() => openInsert()}
              disabled={isPending || columns.length === 0}
            >
              Insert row
            </Button>
          ) : null}
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

      {bulkProgress ? (
        <Alert>
          <AlertTitle>Bulk delete</AlertTitle>
          <AlertDescription>
            {bulkProgress.done} / {bulkProgress.total} processed…
          </AlertDescription>
        </Alert>
      ) : null}

      {bulkFailures.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Some deletes failed</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 font-mono text-xs">
              {bulkFailures.map((f) => (
                <li key={f.pk}>
                  {f.pk}: {f.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
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

      {canWrite && selectedRowIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedRowIds.length} selected</Badge>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirm({ kind: "bulk", ids: selectedRowIds })}
          >
            Delete selected
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRowIds([])}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      {canWrite && editingPk ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">
            Edit {pkName} {editingPk}
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
                  disabled={Boolean(col.pk)}
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
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={resetDraft}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {emptyTable ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-12">
          <p className="text-sm text-muted-foreground">
            This table has no rows yet.
          </p>
          {canWrite ? (
            <Button type="button" onClick={() => openInsert()}>
              Insert row
            </Button>
          ) : null}
        </div>
      ) : (
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
          selectionMode={canWrite ? "multi" : "none"}
          selectedRowIds={selectedRowIds}
          onSelectedRowIdsChange={setSelectedRowIds}
          loading={isPending && rows.length === 0}
          error={null}
          height={480}
          emptyMessage="No rows match the current filters."
          actionsWidth={220}
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
                        onClick={() => openInsert({ pk, row })}
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isPending || pk === ""}
                        onClick={() => setConfirm({ kind: "single", pk })}
                      >
                        Delete
                      </Button>
                    </>
                  );
                }
              : undefined
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <p role="status">
                Loaded {rows.length.toLocaleString()}
                {total != null ? ` of ${total.toLocaleString()}` : ""} row
                {rows.length === 1 ? "" : "s"}
                {filters.length > 0 || quickSearch ? " · filters apply client-side" : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Field label="Page size" className="min-w-[7rem]">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      const next = clampPageSize(Number(value));
                      setPageSize(next);
                      loadWindow({ offset: 0, mode: "replace", size: next });
                    }}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending || !canFetchMore}
                  onClick={() =>
                    loadWindow({ offset: nextOffset, mode: "append" })
                  }
                >
                  Load more
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    isPending || total == null || total === 0 || rows.length >= total
                  }
                  onClick={() =>
                    loadWindow({
                      offset: jumpToEndOffset(total ?? 0, pageSize),
                      mode: "replace",
                    })
                  }
                >
                  Jump to end
                </Button>
              </div>
            </div>
          }
        />
      )}

      <AlertDialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm delete</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "single"
                ? confirmDeleteLabel(1, confirm.pk)
                : confirm?.kind === "bulk"
                  ? confirmDeleteLabel(confirm.ids.length)
                  : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmedDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
