import type { DataGridColumnType } from "./data-grid-types";

export type DataGridCellCoord = {
  rowId: string;
  columnId: string;
};

export type DataGridCellCommitArgs = {
  rowId: string;
  columnId: string;
  /** Value before the edit. */
  oldValue: unknown;
  /** Parsed value to write. */
  nextValue: unknown;
};

export type DataGridCellState = "idle" | "pending" | "error";

export type DataGridExternalPatch<T> =
  | { op: "upsert"; rowId: string; row: T }
  | { op: "delete"; rowId: string }
  | { op: "replace"; rows: T[] };

export function dataGridCellKey(rowId: string, columnId: string): string {
  return `${rowId}\0${columnId}`;
}

export function parseDataGridCellKey(key: string): DataGridCellCoord | null {
  const i = key.indexOf("\0");
  if (i < 0) return null;
  return { rowId: key.slice(0, i), columnId: key.slice(i + 1) };
}

/** Normalize a draft string into a typed cell value (or throw). */
export function parseTypedCellDraft(
  type: DataGridColumnType | undefined,
  raw: string,
): unknown {
  const kind = type ?? "unknown";
  if (raw === "") return null;
  if (kind === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error("Enter a valid number");
    return n;
  }
  if (kind === "boolean") {
    const lower = raw.trim().toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
    throw new Error("Enter true or false");
  }
  if (kind === "json") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new Error("Invalid JSON");
    }
  }
  return raw;
}

export function draftFromCellValue(
  type: DataGridColumnType | undefined,
  value: unknown,
): string {
  if (value == null) return "";
  if (type === "json") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/**
 * Merge an external patch into rows without clobbering the cell currently
 * being edited (and without resurrecting a deleted row the caller opts out of).
 */
export function applyDataGridExternalPatch<T>(
  rows: T[],
  getRowId: (row: T) => string,
  patch: DataGridExternalPatch<T>,
  opts?: {
    editing?: DataGridCellCoord | null;
    /** When deleting the row under edit, keep it and set this flag instead. */
    keepEditingRowOnDelete?: boolean;
  },
): { rows: T[]; skippedEditingCell: boolean; blockedDeleteWhileEditing: boolean } {
  const editing = opts?.editing ?? null;
  if (patch.op === "replace") {
    if (!editing) {
      return {
        rows: patch.rows,
        skippedEditingCell: false,
        blockedDeleteWhileEditing: false,
      };
    }
    const editingRow = rows.find((r) => getRowId(r) === editing.rowId);
    if (!editingRow) {
      return {
        rows: patch.rows,
        skippedEditingCell: false,
        blockedDeleteWhileEditing: false,
      };
    }
    const next = patch.rows.map((row) => {
      if (getRowId(row) !== editing.rowId) return row;
      return {
        ...row,
        [editing.columnId]: (editingRow as Record<string, unknown>)[
          editing.columnId
        ],
      } as T;
    });
    if (!next.some((r) => getRowId(r) === editing.rowId)) {
      next.push(editingRow);
    }
    return {
      rows: next,
      skippedEditingCell: true,
      blockedDeleteWhileEditing: false,
    };
  }

  if (patch.op === "delete") {
    if (
      editing &&
      editing.rowId === patch.rowId &&
      opts?.keepEditingRowOnDelete
    ) {
      return {
        rows,
        skippedEditingCell: false,
        blockedDeleteWhileEditing: true,
      };
    }
    return {
      rows: rows.filter((r) => getRowId(r) !== patch.rowId),
      skippedEditingCell: false,
      blockedDeleteWhileEditing: false,
    };
  }

  // upsert
  const idx = rows.findIndex((r) => getRowId(r) === patch.rowId);
  if (idx < 0) {
    return {
      rows: [...rows, patch.row],
      skippedEditingCell: false,
      blockedDeleteWhileEditing: false,
    };
  }
  const current = rows[idx]!;
  let nextRow = patch.row;
  let skipped = false;
  if (editing && editing.rowId === patch.rowId) {
    nextRow = {
      ...patch.row,
      [editing.columnId]: (current as Record<string, unknown>)[editing.columnId],
    } as T;
    skipped = true;
  }
  const next = rows.slice();
  next[idx] = nextRow;
  return {
    rows: next,
    skippedEditingCell: skipped,
    blockedDeleteWhileEditing: false,
  };
}
