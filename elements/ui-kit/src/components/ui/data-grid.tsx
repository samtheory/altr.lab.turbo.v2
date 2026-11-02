"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useControllableState } from "../../primitives/use-controllable-state";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import {
  formatCellDisplay,
  getCellValue,
  processDataGridRows,
} from "./data-grid-filters";
import { DataGridFilterBuilder } from "./data-grid-filter-builder";
import {
  emptyColumnLayout,
  mergeColumnLayout,
  type DataGridColumnDef,
  type DataGridColumnLayout,
  type DataGridFilter,
  type DataGridPin,
  type DataGridSort,
} from "./data-grid-types";
import { Checkbox } from "./checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Skeleton } from "./skeleton";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_HEADER_HEIGHT = 40;
const OVERSCAN = 8;
const DEFAULT_COL_WIDTH = 140;
const MIN_COL_WIDTH = 72;
const SELECTION_COL_WIDTH = 40;

export type DataGridSelectionMode = "none" | "multi";

export type DataGridProps<T> = {
  columns: DataGridColumnDef<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Controlled column layout (order / hidden / widths / pins). */
  columnLayout?: DataGridColumnLayout;
  defaultColumnLayout?: DataGridColumnLayout;
  onColumnLayoutChange?: (layout: DataGridColumnLayout) => void;
  sort?: DataGridSort;
  defaultSort?: DataGridSort;
  onSortChange?: (sort: DataGridSort) => void;
  filters?: DataGridFilter[];
  defaultFilters?: DataGridFilter[];
  onFiltersChange?: (filters: DataGridFilter[]) => void;
  quickSearch?: string;
  defaultQuickSearch?: string;
  onQuickSearchChange?: (value: string) => void;
  /** When true (default), filter/sort/search run client-side. */
  clientProcess?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  density?: "compact" | "default";
  rowHeight?: number;
  /** Viewport height for virtualization. */
  height?: number | string;
  className?: string;
  toolbarClassName?: string;
  showFilterBuilder?: boolean;
  showColumnVisibility?: boolean;
  footer?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Extra cells rendered after data columns (e.g. row actions). */
  renderRowActions?: (row: T) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  /** Width of the actions column when `renderRowActions` is set. */
  actionsWidth?: number;
  /** Row multi-select via a leading checkbox column. */
  selectionMode?: DataGridSelectionMode;
  selectedRowIds?: readonly string[];
  defaultSelectedRowIds?: readonly string[];
  onSelectedRowIdsChange?: (ids: string[]) => void;
};

function resolveWidth(
  column: DataGridColumnDef<unknown>,
  widths: Record<string, number>,
): number {
  const raw = widths[column.id] ?? column.width ?? DEFAULT_COL_WIDTH;
  const min = column.minWidth ?? MIN_COL_WIDTH;
  const max = column.maxWidth ?? 640;
  return Math.min(max, Math.max(min, raw));
}

function visibleOrderedColumns<T>(
  columns: DataGridColumnDef<T>[],
  layout: DataGridColumnLayout,
): DataGridColumnDef<T>[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const hidden = new Set(layout.hidden);
  const ordered: DataGridColumnDef<T>[] = [];
  for (const id of layout.order) {
    const col = byId.get(id);
    if (col && !hidden.has(id)) ordered.push(col);
  }
  return ordered;
}

function pinSortedColumns<T>(
  columns: DataGridColumnDef<T>[],
  pins: Record<string, DataGridPin>,
): DataGridColumnDef<T>[] {
  const left: DataGridColumnDef<T>[] = [];
  const mid: DataGridColumnDef<T>[] = [];
  const right: DataGridColumnDef<T>[] = [];
  for (const col of columns) {
    const pin = pins[col.id];
    if (pin === "left") left.push(col);
    else if (pin === "right") right.push(col);
    else mid.push(col);
  }
  return [...left, ...mid, ...right];
}

function stickyLeftOffsets(
  columns: DataGridColumnDef<unknown>[],
  pins: Record<string, DataGridPin>,
  widths: Record<string, number>,
): Record<string, number> {
  let left = 0;
  const out: Record<string, number> = {};
  for (const col of columns) {
    if (pins[col.id] !== "left") continue;
    out[col.id] = left;
    left += resolveWidth(col, widths);
  }
  return out;
}

function normalizeSelectedIds(
  ids: readonly string[] | undefined,
): string[] {
  return ids ? [...ids] : [];
}

type DataGridBodyRowProps<T> = {
  id: string;
  index: number;
  rowHeight: number;
  density: "compact" | "default";
  striped: boolean;
  clickable: boolean;
  selected: boolean;
  selectionEnabled: boolean;
  onToggleSelected?: (next: boolean) => void;
  onRowClick?: () => void;
  visible: DataGridColumnDef<T>[];
  layoutWidths: Record<string, number>;
  layoutPins: Record<string, DataGridPin>;
  leftOffsets: Record<string, number>;
  row: T;
  renderRowActions?: (row: T) => React.ReactNode;
  actionsWidth: number;
};

const DataGridBodyRow = React.memo(function DataGridBodyRow<T>({
  id,
  index,
  rowHeight,
  density,
  striped,
  clickable,
  selected,
  selectionEnabled,
  onToggleSelected,
  onRowClick,
  visible,
  layoutWidths,
  layoutPins,
  leftOffsets,
  row,
  renderRowActions,
  actionsWidth,
}: DataGridBodyRowProps<T>) {
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selectionEnabled ? selected : undefined}
      data-row-id={id}
      data-selected={selected ? "" : undefined}
      className={cn(
        "flex border-b border-border",
        striped && "bg-muted/30",
        selected && "bg-accent/35",
        clickable && "cursor-pointer hover:bg-accent/40",
      )}
      style={{ height: rowHeight }}
      onClick={onRowClick}
    >
      {selectionEnabled ? (
        <div
          role="gridcell"
          aria-colindex={1}
          className="flex shrink-0 items-center justify-center border-r border-border px-1"
          style={{ width: SELECTION_COL_WIDTH }}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(value) =>
              onToggleSelected?.(value === true)
            }
            aria-label={`Select row ${id}`}
          />
        </div>
      ) : null}
      {visible.map((col, colIndex) => {
        const width = resolveWidth(
          col as DataGridColumnDef<unknown>,
          layoutWidths,
        );
        const pin = layoutPins[col.id];
        const value = getCellValue(row, col);
        return (
          <div
            key={col.id}
            role="gridcell"
            aria-colindex={colIndex + 1 + (selectionEnabled ? 1 : 0)}
            className={cn(
              "flex shrink-0 items-center truncate border-r border-border px-2 font-mono text-xs",
              pin === "left" && "z-10 bg-background",
              pin === "right" && "z-10 bg-background",
              density === "compact" && "text-[11px]",
            )}
            style={{
              width,
              left: pin === "left" ? leftOffsets[col.id] : undefined,
              position: pin ? "sticky" : undefined,
              right: pin === "right" ? 0 : undefined,
            }}
            title={formatCellDisplay(value)}
          >
            {col.render
              ? col.render(value, row, index)
              : formatCellDisplay(value)}
          </div>
        );
      })}
      {renderRowActions ? (
        <div
          role="gridcell"
          className="flex shrink-0 items-center gap-1 px-2"
          style={{ width: actionsWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderRowActions(row)}
        </div>
      ) : null}
    </div>
  );
}) as <T>(props: DataGridBodyRowProps<T>) => React.ReactElement;

export function DataGrid<T>({
  columns,
  rows,
  getRowId,
  columnLayout: columnLayoutProp,
  defaultColumnLayout,
  onColumnLayoutChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  filters: filtersProp,
  defaultFilters = [],
  onFiltersChange,
  quickSearch: quickSearchProp,
  defaultQuickSearch = "",
  onQuickSearchChange,
  clientProcess = true,
  loading = false,
  error = null,
  emptyMessage = "No rows",
  density = "default",
  rowHeight: rowHeightProp,
  height = 420,
  className,
  toolbarClassName,
  showFilterBuilder = true,
  showColumnVisibility = true,
  footer,
  onRowClick,
  renderRowActions,
  actionsHeader = "Actions",
  actionsWidth = 120,
  selectionMode = "none",
  selectedRowIds: selectedRowIdsProp,
  defaultSelectedRowIds = [],
  onSelectedRowIdsChange,
}: DataGridProps<T>) {
  const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);
  const [layout, setLayout] = useControllableState<DataGridColumnLayout>({
    value: columnLayoutProp,
    defaultValue:
      defaultColumnLayout ?? emptyColumnLayout(columnIds),
    onChange: onColumnLayoutChange,
  });

  React.useEffect(() => {
    setLayout((prev) => mergeColumnLayout(prev, columnIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge when column set changes
  }, [columnIds.join("\0")]);

  const [sort, setSort] = useControllableState<DataGridSort>({
    value: sortProp,
    defaultValue: defaultSort,
    onChange: onSortChange,
  });
  const [filters, setFilters] = useControllableState<DataGridFilter[]>({
    value: filtersProp,
    defaultValue: defaultFilters,
    onChange: onFiltersChange,
  });
  const [quickSearch, setQuickSearch] = useControllableState<string>({
    value: quickSearchProp,
    defaultValue: defaultQuickSearch,
    onChange: onQuickSearchChange,
  });
  const [selectedRowIds, setSelectedRowIds] = useControllableState<string[]>({
    value:
      selectedRowIdsProp === undefined
        ? undefined
        : normalizeSelectedIds(selectedRowIdsProp),
    defaultValue: normalizeSelectedIds(defaultSelectedRowIds),
    onChange: onSelectedRowIdsChange,
  });

  const selectionEnabled = selectionMode === "multi";
  const selectedSet = React.useMemo(
    () => new Set(selectedRowIds),
    [selectedRowIds],
  );

  const processed = React.useMemo(() => {
    if (!clientProcess) return rows;
    return processDataGridRows(rows, columns, {
      filters,
      quickSearch,
      sort,
    });
  }, [clientProcess, rows, columns, filters, quickSearch, sort]);

  const processedIds = React.useMemo(
    () => processed.map((row) => getRowId(row)),
    [processed, getRowId],
  );

  const pageSelectionState = React.useMemo(() => {
    if (!selectionEnabled || processedIds.length === 0) {
      return false as boolean | "indeterminate";
    }
    let selectedCount = 0;
    for (const id of processedIds) {
      if (selectedSet.has(id)) selectedCount += 1;
    }
    if (selectedCount === 0) return false;
    if (selectedCount === processedIds.length) return true;
    return "indeterminate";
  }, [selectionEnabled, processedIds, selectedSet]);

  const toggleRowSelected = React.useCallback(
    (id: string, next: boolean) => {
      setSelectedRowIds((prev) => {
        const set = new Set(prev);
        if (next) set.add(id);
        else set.delete(id);
        return [...set];
      });
    },
    [setSelectedRowIds],
  );

  const toggleSelectAllProcessed = React.useCallback(
    (next: boolean | "indeterminate") => {
      const checked = next === true;
      setSelectedRowIds((prev) => {
        const set = new Set(prev);
        if (checked) {
          for (const id of processedIds) set.add(id);
        } else {
          for (const id of processedIds) set.delete(id);
        }
        return [...set];
      });
    },
    [processedIds, setSelectedRowIds],
  );

  const visible = React.useMemo(
    () =>
      pinSortedColumns(visibleOrderedColumns(columns, layout), layout.pins),
    [columns, layout],
  );

  const leftOffsets = React.useMemo(
    () =>
      stickyLeftOffsets(
        visible as DataGridColumnDef<unknown>[],
        layout.pins,
        layout.widths,
      ),
    [visible, layout.pins, layout.widths],
  );

  const rowHeight =
    rowHeightProp ?? (density === "compact" ? 32 : DEFAULT_ROW_HEIGHT);
  const headerHeight = density === "compact" ? 36 : DEFAULT_HEADER_HEIGHT;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportH, setViewportH] = React.useState(420);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight || 420);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  const bodyH = processed.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleCount =
    Math.ceil(viewportH / rowHeight) + OVERSCAN * 2;
  const end = Math.min(processed.length, start + visibleCount);
  const slice = processed.slice(start, end);
  const padTop = start * rowHeight;
  const padBottom = Math.max(0, bodyH - end * rowHeight);

  const dragCol = React.useRef<string | null>(null);

  function cycleSort(columnId: string) {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  }

  function setPin(columnId: string, pin: DataGridPin | null) {
    setLayout((prev) => {
      const pins = { ...prev.pins };
      if (!pin) delete pins[columnId];
      else pins[columnId] = pin;
      return { ...prev, pins };
    });
  }

  function toggleHidden(columnId: string, hidden: boolean) {
    setLayout((prev) => {
      const next = new Set(prev.hidden);
      if (hidden) next.add(columnId);
      else next.delete(columnId);
      return { ...prev, hidden: [...next] };
    });
  }

  function moveColumn(fromId: string, toId: string) {
    if (fromId === toId) return;
    setLayout((prev) => {
      const order = [...prev.order];
      const from = order.indexOf(fromId);
      const to = order.indexOf(toId);
      if (from < 0 || to < 0) return prev;
      order.splice(from, 1);
      order.splice(to, 0, fromId);
      return { ...prev, order };
    });
  }

  function startResize(columnId: string, startX: number, startW: number) {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.resizable === false) return;
    const min = column.minWidth ?? MIN_COL_WIDTH;
    const max = column.maxWidth ?? 640;

    function onMove(event: MouseEvent) {
      const next = Math.min(max, Math.max(min, startW + (event.clientX - startX)));
      setLayout((prev) => ({
        ...prev,
        widths: { ...prev.widths, [columnId]: next },
      }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function resetView() {
    setLayout(emptyColumnLayout(columnIds));
    setSort(null);
    setFilters([]);
    setQuickSearch("");
  }

  const totalWidth =
    visible.reduce(
      (sum, col) => sum + resolveWidth(col as DataGridColumnDef<unknown>, layout.widths),
      0,
    ) +
    (selectionEnabled ? SELECTION_COL_WIDTH : 0) +
    (renderRowActions ? actionsWidth : 0);

  const colCount =
    visible.length +
    (selectionEnabled ? 1 : 0) +
    (renderRowActions ? 1 : 0);

  return (
    <div data-slot="data-grid" className={cn("flex flex-col gap-3", className)}>
      {(showFilterBuilder || showColumnVisibility) && (
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-3",
            toolbarClassName,
          )}
        >
          {showFilterBuilder ? (
            <DataGridFilterBuilder
              columns={columns}
              filters={filters}
              onFiltersChange={setFilters}
              quickSearch={quickSearch}
              onQuickSearchChange={setQuickSearch}
              className="min-w-0 flex-1"
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {showColumnVisibility ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={!layout.hidden.includes(col.id)}
                      disabled={col.hideable === false}
                      onCheckedChange={(checked) =>
                        toggleHidden(col.id, !checked)
                      }
                    >
                      {typeof col.header === "string" ? col.header : col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={resetView}>
              <RotateCcw className="size-3.5" aria-hidden />
              Reset view
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Grid error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div
        ref={scrollRef}
        role="grid"
        aria-rowcount={processed.length}
        aria-colcount={colCount}
        aria-busy={loading || undefined}
        data-density={density}
        className={cn(
          "relative w-full overflow-auto rounded-lg border border-border bg-background",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        )}
        style={{ height, maxHeight: height }}
        onScroll={onScroll}
        tabIndex={0}
      >
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          <div
            role="row"
            className="sticky top-0 z-20 flex border-b border-border bg-muted/80 backdrop-blur-sm"
            style={{ height: headerHeight }}
            aria-rowindex={1}
          >
            {selectionEnabled ? (
              <div
                role="columnheader"
                aria-colindex={1}
                className="flex shrink-0 items-center justify-center border-r border-border px-1"
                style={{ width: SELECTION_COL_WIDTH }}
              >
                <Checkbox
                  checked={pageSelectionState}
                  onCheckedChange={toggleSelectAllProcessed}
                  aria-label="Select all rows on this page"
                  disabled={processedIds.length === 0}
                />
              </div>
            ) : null}
            {visible.map((col, colIndex) => {
              const width = resolveWidth(
                col as DataGridColumnDef<unknown>,
                layout.widths,
              );
              const pin = layout.pins[col.id];
              const sorted =
                sort?.columnId === col.id ? sort.direction : null;
              return (
                <div
                  key={col.id}
                  role="columnheader"
                  aria-colindex={colIndex + 1 + (selectionEnabled ? 1 : 0)}
                  aria-sort={
                    sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : "none"
                  }
                  draggable
                  onDragStart={() => {
                    dragCol.current = col.id;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragCol.current) moveColumn(dragCol.current, col.id);
                    dragCol.current = null;
                  }}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-1 border-r border-border px-2 text-xs font-medium",
                    pin === "left" && "z-30 bg-muted",
                    pin === "right" && "z-30 bg-muted",
                  )}
                  style={{
                    width,
                    left: pin === "left" ? leftOffsets[col.id] : undefined,
                    position: pin ? "sticky" : undefined,
                    right: pin === "right" ? 0 : undefined,
                  }}
                >
                  <GripVertical
                    className="size-3.5 shrink-0 text-muted-foreground opacity-50"
                    aria-hidden
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:text-foreground"
                    onClick={() => cycleSort(col.id)}
                    disabled={col.sortable === false}
                  >
                    {col.header}
                  </button>
                  {sorted === "asc" ? (
                    <ArrowUp className="size-3.5 shrink-0" aria-hidden />
                  ) : sorted === "desc" ? (
                    <ArrowDown className="size-3.5 shrink-0" aria-hidden />
                  ) : col.sortable !== false ? (
                    <ArrowUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden />
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`${typeof col.header === "string" ? col.header : col.id} column menu`}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => cycleSort(col.id)}>
                        Sort
                      </DropdownMenuItem>
                      {col.pinnable !== false ? (
                        <>
                          <DropdownMenuItem
                            onSelect={() => setPin(col.id, "left")}
                          >
                            <Pin className="size-3.5" aria-hidden />
                            Pin left
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setPin(col.id, "right")}
                          >
                            <Pin className="size-3.5" aria-hidden />
                            Pin right
                          </DropdownMenuItem>
                          {pin ? (
                            <DropdownMenuItem
                              onSelect={() => setPin(col.id, null)}
                            >
                              <PinOff className="size-3.5" aria-hidden />
                              Unpin
                            </DropdownMenuItem>
                          ) : null}
                        </>
                      ) : null}
                      {col.hideable !== false ? (
                        <DropdownMenuItem
                          onSelect={() => toggleHidden(col.id, true)}
                        >
                          <EyeOff className="size-3.5" aria-hidden />
                          Hide
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {col.resizable !== false ? (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${typeof col.header === "string" ? col.header : col.id}`}
                      className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-ring/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        startResize(col.id, e.clientX, width);
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
            {renderRowActions ? (
              <div
                role="columnheader"
                aria-colindex={colCount}
                className="flex shrink-0 items-center px-2 text-xs font-medium"
                style={{ width: actionsWidth }}
              >
                {actionsHeader}
              </div>
            ) : null}
          </div>

          {loading && processed.length === 0 ? (
            <div className="space-y-2 p-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : null}

          {!loading && processed.length === 0 && !error ? (
            <div
              role="status"
              className="flex h-32 items-center justify-center text-sm text-muted-foreground"
            >
              {emptyMessage}
            </div>
          ) : null}

          {processed.length > 0 ? (
            <>
              <div style={{ height: padTop }} aria-hidden />
              {slice.map((row, i) => {
                const index = start + i;
                const id = getRowId(row);
                const isSelected = selectionEnabled && selectedSet.has(id);
                return (
                  <DataGridBodyRow
                    key={id}
                    id={id}
                    index={index}
                    rowHeight={rowHeight}
                    density={density}
                    striped={index % 2 === 1}
                    clickable={Boolean(onRowClick)}
                    selected={isSelected}
                    selectionEnabled={selectionEnabled}
                    onToggleSelected={
                      selectionEnabled
                        ? (next) => toggleRowSelected(id, next)
                        : undefined
                    }
                    onRowClick={onRowClick ? () => onRowClick(row) : undefined}
                    visible={visible}
                    layoutWidths={layout.widths}
                    layoutPins={layout.pins}
                    leftOffsets={leftOffsets}
                    row={row}
                    renderRowActions={renderRowActions}
                    actionsWidth={actionsWidth}
                  />
                );
              })}
              <div style={{ height: padBottom }} aria-hidden />
            </>
          ) : null}
        </div>
      </div>

      {footer ?? (
        <p className="text-xs text-muted-foreground" role="status">
          {loading ? "Loading…" : `${processed.length.toLocaleString()} row${processed.length === 1 ? "" : "s"}`}
          {filters.length > 0 || quickSearch
            ? ` · filtered from ${rows.length.toLocaleString()}`
            : null}
        </p>
      )}
    </div>
  );
}

export {
  DataGridFilterBuilder,
  type DataGridFilterBuilderProps,
} from "./data-grid-filter-builder";
export {
  applyDataGridFilters,
  applyDataGridQuickSearch,
  applyDataGridSort,
  processDataGridRows,
  formatCellDisplay,
  getCellValue,
} from "./data-grid-filters";
export type {
  DataGridColumnDef,
  DataGridColumnLayout,
  DataGridColumnType,
  DataGridFilter,
  DataGridFilterOperator,
  DataGridPin,
  DataGridSort,
  DataGridSortDirection,
} from "./data-grid-types";
export {
  FILTER_OPERATORS_BY_TYPE,
  FILTER_OPERATOR_LABELS,
  defaultOperatorsForType,
  emptyColumnLayout,
  mergeColumnLayout,
} from "./data-grid-types";
