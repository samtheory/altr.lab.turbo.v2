import type {
  DataGridColumnDef,
  DataGridColumnType,
  DataGridFilter,
  DataGridSort,
} from "./data-grid-types";

function cellValue<T>(row: T, column: DataGridColumnDef<T>): unknown {
  if (column.accessor) return column.accessor(row);
  const record = row as Record<string, unknown>;
  return record[column.id];
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDateMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

function matchFilter(
  value: unknown,
  filter: DataGridFilter,
  type: DataGridColumnType | undefined,
): boolean {
  switch (filter.operator) {
    case "is_null":
      return value == null || value === "";
    case "is_not_null":
      return value != null && value !== "";
    case "is_true":
      return value === true || value === 1 || value === "true" || value === "1";
    case "is_false":
      return value === false || value === 0 || value === "false" || value === "0";
    case "contains": {
      const hay = asString(value).toLowerCase();
      const needle = asString(filter.value).toLowerCase();
      if (!needle) return true;
      return hay.includes(needle);
    }
    case "equals": {
      if (type === "number" || type === "date") {
        const left =
          type === "date" ? asDateMs(value) : asNumber(value);
        const right =
          type === "date" ? asDateMs(filter.value) : asNumber(filter.value);
        if (left == null && right == null) return true;
        return left != null && right != null && left === right;
      }
      return asString(value) === asString(filter.value);
    }
    case "not_equals": {
      if (type === "number" || type === "date") {
        const left =
          type === "date" ? asDateMs(value) : asNumber(value);
        const right =
          type === "date" ? asDateMs(filter.value) : asNumber(filter.value);
        if (left == null && right == null) return false;
        return left !== right;
      }
      return asString(value) !== asString(filter.value);
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const left =
        type === "date" ? asDateMs(value) : asNumber(value);
      const right =
        type === "date" ? asDateMs(filter.value) : asNumber(filter.value);
      if (left == null || right == null) return false;
      if (filter.operator === "gt") return left > right;
      if (filter.operator === "gte") return left >= right;
      if (filter.operator === "lt") return left < right;
      return left <= right;
    }
    case "between": {
      const left =
        type === "date" ? asDateMs(value) : asNumber(value);
      const from =
        type === "date" ? asDateMs(filter.value) : asNumber(filter.value);
      const to =
        type === "date" ? asDateMs(filter.valueTo) : asNumber(filter.valueTo);
      if (left == null) return false;
      if (from != null && left < from) return false;
      if (to != null && left > to) return false;
      return true;
    }
    default:
      return true;
  }
}

/** Client-side AND of all filters. Empty filters → identity. */
export function applyDataGridFilters<T>(
  rows: T[],
  columns: DataGridColumnDef<T>[],
  filters: DataGridFilter[],
): T[] {
  if (filters.length === 0) return rows;
  const byId = new Map(columns.map((c) => [c.id, c]));
  return rows.filter((row) =>
    filters.every((filter) => {
      const column = byId.get(filter.columnId);
      if (!column) return true;
      return matchFilter(cellValue(row, column), filter, column.type);
    }),
  );
}

/** Quick search across filterable text-like columns (OR within columns, AND with filters). */
export function applyDataGridQuickSearch<T>(
  rows: T[],
  columns: DataGridColumnDef<T>[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const searchable = columns.filter(
    (c) =>
      c.filterable !== false &&
      (c.type === undefined ||
        c.type === "text" ||
        c.type === "json" ||
        c.type === "fk" ||
        c.type === "unknown"),
  );
  if (searchable.length === 0) return rows;
  return rows.filter((row) =>
    searchable.some((column) =>
      asString(cellValue(row, column)).toLowerCase().includes(q),
    ),
  );
}

export function applyDataGridSort<T>(
  rows: T[],
  columns: DataGridColumnDef<T>[],
  sort: DataGridSort,
): T[] {
  if (!sort) return rows;
  const column = columns.find((c) => c.id === sort.columnId);
  if (!column) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  const next = [...rows];
  next.sort((a, b) => {
    const av = cellValue(a, column);
    const bv = cellValue(b, column);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (column.type === "number" || column.type === "date") {
      const an =
        column.type === "date" ? asDateMs(av) : asNumber(av);
      const bn =
        column.type === "date" ? asDateMs(bv) : asNumber(bv);
      if (an == null && bn == null) return 0;
      if (an == null) return 1;
      if (bn == null) return -1;
      return (an - bn) * dir;
    }
    if (typeof av === "boolean" && typeof bv === "boolean") {
      return (Number(av) - Number(bv)) * dir;
    }
    return asString(av).localeCompare(asString(bv)) * dir;
  });
  return next;
}

export function processDataGridRows<T>(
  rows: T[],
  columns: DataGridColumnDef<T>[],
  options: {
    filters?: DataGridFilter[];
    quickSearch?: string;
    sort?: DataGridSort;
  },
): T[] {
  let next = rows;
  next = applyDataGridFilters(next, columns, options.filters ?? []);
  next = applyDataGridQuickSearch(next, columns, options.quickSearch ?? "");
  next = applyDataGridSort(next, columns, options.sort ?? null);
  return next;
}

export function getCellValue<T>(
  row: T,
  column: DataGridColumnDef<T>,
): unknown {
  return cellValue(row, column);
}

export function formatCellDisplay(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
