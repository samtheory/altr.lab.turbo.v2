import type * as React from "react";

/** Column value kinds used for filter operators and default cell formatting. */
export type DataGridColumnType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "fk"
  | "unknown";

export type DataGridFilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_true"
  | "is_false"
  | "is_null"
  | "is_not_null";

export type DataGridSortDirection = "asc" | "desc";

export type DataGridSort = {
  columnId: string;
  direction: DataGridSortDirection;
} | null;

export type DataGridFilter = {
  id: string;
  columnId: string;
  operator: DataGridFilterOperator;
  value?: string | number | boolean | null;
  /** Upper bound for `between`. */
  valueTo?: string | number | null;
};

export type DataGridPin = "left" | "right";

export type DataGridEditorKind =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "json"
  | "fk";

export type DataGridEditorOption = {
  value: string;
  label: string;
};

export type DataGridColumnDef<T> = {
  id: string;
  header: React.ReactNode;
  type?: DataGridColumnType;
  accessor?: (row: T) => unknown;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  pinnable?: boolean;
  hideable?: boolean;
  resizable?: boolean;
  /** When true (and parent passes `onCellCommit`), double-click / Enter edits. */
  editable?: boolean;
  /** Override editor widget; defaults from `type`. */
  editor?: DataGridEditorKind;
  /** Options for `select` / enum-like editors. */
  editorOptions?: DataGridEditorOption[];
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
};

export type DataGridColumnLayout = {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
  pins: Record<string, DataGridPin>;
};

export const FILTER_OPERATORS_BY_TYPE: Record<
  DataGridColumnType,
  DataGridFilterOperator[]
> = {
  text: ["contains", "equals", "not_equals", "is_null", "is_not_null"],
  number: ["equals", "not_equals", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  boolean: ["is_true", "is_false", "is_null", "is_not_null"],
  date: ["equals", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  json: ["contains", "is_null", "is_not_null"],
  fk: ["equals", "not_equals", "is_null", "is_not_null"],
  unknown: ["contains", "equals", "is_null", "is_not_null"],
};

export const FILTER_OPERATOR_LABELS: Record<DataGridFilterOperator, string> = {
  contains: "contains",
  equals: "equals",
  not_equals: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "between",
  is_true: "is true",
  is_false: "is false",
  is_null: "is null",
  is_not_null: "is not null",
};

export function defaultOperatorsForType(
  type: DataGridColumnType | undefined,
): DataGridFilterOperator[] {
  return FILTER_OPERATORS_BY_TYPE[type ?? "unknown"];
}

export function emptyColumnLayout(columnIds: string[]): DataGridColumnLayout {
  return {
    order: [...columnIds],
    hidden: [],
    widths: {},
    pins: {},
  };
}

export function mergeColumnLayout(
  layout: DataGridColumnLayout,
  columnIds: string[],
): DataGridColumnLayout {
  const known = new Set(columnIds);
  const order = layout.order.filter((id) => known.has(id));
  for (const id of columnIds) {
    if (!order.includes(id)) order.push(id);
  }
  const hidden = layout.hidden.filter((id) => known.has(id));
  const widths: Record<string, number> = {};
  const pins: Record<string, DataGridPin> = {};
  for (const id of columnIds) {
    if (typeof layout.widths[id] === "number") widths[id] = layout.widths[id]!;
    if (layout.pins[id] === "left" || layout.pins[id] === "right") {
      pins[id] = layout.pins[id]!;
    }
  }
  return { order, hidden, widths, pins };
}
