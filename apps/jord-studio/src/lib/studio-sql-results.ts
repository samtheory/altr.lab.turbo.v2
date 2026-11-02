import type { DataGridColumnDef, DataGridFilter, DataGridSort } from "@altr/apolyx";
import { formatCellDisplay, processDataGridRows } from "@altr/apolyx";

export type SqlResultRow = Record<string, unknown> & { __jordRowId: string };

export type ExplainPlanNode = {
  node: string;
  detail?: string;
  rows?: number | null;
  cost?: number | null;
  children: ExplainPlanNode[];
};

export function attachSqlRowIds(
  rows: Array<Record<string, unknown>>,
): SqlResultRow[] {
  return rows.map((row, index) => ({
    ...row,
    __jordRowId: `r${index}`,
  }));
}

export function sqlResultColumns(
  columns: string[],
): DataGridColumnDef<SqlResultRow>[] {
  return columns.map((name) => ({
    id: name,
    header: name,
    type: "text" as const,
    accessor: (row) => row[name],
  }));
}

export function visibleSqlRows(
  rows: SqlResultRow[],
  columns: DataGridColumnDef<SqlResultRow>[],
  options: {
    filters?: DataGridFilter[];
    quickSearch?: string;
    sort?: DataGridSort;
  },
): SqlResultRow[] {
  return processDataGridRows(rows, columns, options);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Export the visible set only (post filter/sort/search). */
export function exportSqlRowsCsv(
  rows: SqlResultRow[],
  columnIds: string[],
): string {
  const header = columnIds.map(csvEscape).join(",");
  const lines = rows.map((row) =>
    columnIds
      .map((id) => csvEscape(formatCellDisplay(row[id])))
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function exportSqlRowsJson(
  rows: SqlResultRow[],
  columnIds: string[],
): string {
  const cleaned = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const id of columnIds) out[id] = row[id] ?? null;
    return out;
  });
  return JSON.stringify(cleaned, null, 2);
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mime: string,
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("clipboard unavailable"));
}

export function cellDetailKind(
  value: unknown,
): "json" | "blob" | "text" {
  if (value != null && typeof value === "object") return "json";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch {
        // fall through
      }
    }
    if (trimmed.startsWith("\\x") || /^[A-Za-z0-9+/=]{40,}$/.test(trimmed)) {
      return "blob";
    }
  }
  return "text";
}
