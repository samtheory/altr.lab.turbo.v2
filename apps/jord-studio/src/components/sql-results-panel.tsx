"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataGrid,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  emptyColumnLayout,
  formatCellDisplay,
  type DataGridFilter,
  type DataGridSort,
} from "@altr/apolyx";

import {
  attachSqlRowIds,
  cellDetailKind,
  copyText,
  downloadTextFile,
  exportSqlRowsCsv,
  exportSqlRowsJson,
  sqlResultColumns,
  visibleSqlRows,
  type ExplainPlanNode,
  type SqlResultRow,
} from "@/lib/studio-sql-results";

type Props = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  elapsedMs: number | null;
  plan: ExplainPlanNode | null;
  onFetchMore?: () => void;
  fetchMoreDisabled?: boolean;
};

function PlanTree({ node, depth = 0 }: { node: ExplainPlanNode; depth?: number }) {
  return (
    <li className="list-none">
      <div
        className="rounded-md px-2 py-1 font-mono text-xs"
        style={{ marginLeft: depth * 12 }}
      >
        <span className="font-medium">{node.node}</span>
        {node.rows != null ? (
          <span className="ml-2 text-muted-foreground">rows={node.rows}</span>
        ) : null}
        {node.cost != null ? (
          <span className="ml-2 text-muted-foreground">cost={node.cost}</span>
        ) : null}
        {node.detail ? (
          <p className="text-[11px] text-muted-foreground">{node.detail}</p>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="m-0 p-0">
          {node.children.map((child, index) => (
            <PlanTree key={`${child.node}-${index}`} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function SqlResultsPanel({
  columns,
  rows,
  rowCount,
  truncated,
  elapsedMs,
  plan,
  onFetchMore,
  fetchMoreDisabled,
}: Props) {
  const [filters, setFilters] = useState<DataGridFilter[]>([]);
  const [sort, setSort] = useState<DataGridSort>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [detail, setDetail] = useState<{
    title: string;
    body: string;
    kind: string;
  } | null>(null);

  const gridRows = useMemo(() => attachSqlRowIds(rows), [rows]);
  const gridColumns = useMemo(() => sqlResultColumns(columns), [columns]);
  const columnLayout = useMemo(
    () => emptyColumnLayout(columns),
    [columns],
  );
  const visible = useMemo(
    () => visibleSqlRows(gridRows, gridColumns, { filters, quickSearch, sort }),
    [gridRows, gridColumns, filters, quickSearch, sort],
  );

  if (columns.length === 0 && !plan) return null;

  const openDetail = (row: SqlResultRow, columnId: string) => {
    const value = row[columnId];
    const kind = cellDetailKind(value);
    const body =
      kind === "json"
        ? (() => {
            try {
              const parsed =
                typeof value === "string" ? JSON.parse(value) : value;
              return JSON.stringify(parsed, null, 2);
            } catch {
              return formatCellDisplay(value);
            }
          })()
        : formatCellDisplay(value);
    setDetail({ title: columnId, body, kind });
  };

  const copyRow = async (row: SqlResultRow) => {
    const payload: Record<string, unknown> = {};
    for (const col of columns) payload[col] = row[col] ?? null;
    await copyText(JSON.stringify(payload));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {elapsedMs != null ? (
          <Badge variant="outline">
            {elapsedMs} ms · {rowCount} row{rowCount === 1 ? "" : "s"}
            {truncated ? " · truncated" : ""}
            {visible.length !== gridRows.length
              ? ` · ${visible.length} visible`
              : ""}
          </Badge>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={visible.length === 0}
            onClick={() =>
              downloadTextFile(
                "query-results.csv",
                exportSqlRowsCsv(visible, columns),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={visible.length === 0}
            onClick={() =>
              downloadTextFile(
                "query-results.json",
                exportSqlRowsJson(visible, columns),
                "application/json",
              )
            }
          >
            Export JSON
          </Button>
          {truncated && onFetchMore ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={fetchMoreDisabled}
              onClick={onFetchMore}
            >
              Fetch more
            </Button>
          ) : null}
        </div>
      </div>

      {plan ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Explain plan
          </p>
          <ul className="m-0 max-h-64 overflow-auto p-0">
            <PlanTree node={plan} />
          </ul>
        </div>
      ) : null}

      {columns.length > 0 ? (
        <>
          <DataGrid
            columns={gridColumns}
            rows={gridRows}
            getRowId={(row) => row.__jordRowId}
            columnLayout={columnLayout}
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            quickSearch={quickSearch}
            onQuickSearchChange={setQuickSearch}
            clientProcess
            showFilterBuilder
            height={360}
            actionsHeader="Actions"
            actionsWidth={168}
            renderRowActions={(row) => (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void copyRow(row)}
                >
                  Copy
                </Button>
                {columns[0] ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openDetail(row, columns[0]!)}
                  >
                    Detail
                  </Button>
                ) : null}
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Sort/filter/search apply client-side. CSV/JSON export matches the
            visible set. Use Detail for JSON/blob cells.
          </p>
        </>
      ) : null}

      <Dialog open={detail != null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.title ?? "Cell"}</DialogTitle>
            <DialogDescription>
              {detail?.kind === "json"
                ? "JSON value"
                : detail?.kind === "blob"
                  ? "Blob-like value"
                  : "Cell value"}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs">
            {detail?.body}
          </pre>
          <Button
            type="button"
            size="sm"
            onClick={() => detail && void copyText(detail.body)}
          >
            Copy
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
