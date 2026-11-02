/** Pure helpers for S0058 inline edit + live merge. */

import {
  applyDataGridExternalPatch,
  type DataGridCellCoord,
} from "@altr/apolyx";

import type { Cell } from "@/lib/studio-row-ops";

export type LiveChangeEvent = {
  type?: string;
  table?: string;
  op?: "insert" | "update" | "delete" | "resync" | string;
  id?: string;
};

export function parseLiveChangeEvent(raw: string): LiveChangeEvent | null {
  try {
    const parsed = JSON.parse(raw) as LiveChangeEvent;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cellsEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  return Object.is(a, b);
}

/** Build PATCH body with optional compare-and-swap `old`. */
export function buildCellPatchBody(input: {
  columnId: string;
  nextValue: unknown;
  oldValue: unknown;
}): { values: Record<string, unknown>; old: Record<string, unknown> } {
  return {
    values: { [input.columnId]: input.nextValue },
    old: { [input.columnId]: input.oldValue ?? null },
  };
}

/**
 * Apply a jord.change event to the loaded page.
 * Without a row payload, update/insert/resync require a refetch (`needsRefetch`).
 * Deletes remove by primary key unless the row is under edit (warn instead).
 */
export function mergeLiveChangeIntoRows(input: {
  rows: Array<Record<string, Cell>>;
  getRowId: (row: Record<string, Cell>) => string;
  event: LiveChangeEvent;
  editing: DataGridCellCoord | null;
}): {
  rows: Array<Record<string, Cell>>;
  needsRefetch: boolean;
  blockedDeleteWhileEditing: boolean;
  skippedEditingCell: boolean;
} {
  const op = input.event.op;
  if (op === "delete" && input.event.id) {
    const merged = applyDataGridExternalPatch(
      input.rows,
      input.getRowId,
      { op: "delete", rowId: String(input.event.id) },
      { editing: input.editing, keepEditingRowOnDelete: true },
    );
    return {
      rows: merged.rows,
      needsRefetch: false,
      blockedDeleteWhileEditing: merged.blockedDeleteWhileEditing,
      skippedEditingCell: merged.skippedEditingCell,
    };
  }
  if (op === "resync" || op === "insert" || op === "update" || !op) {
    return {
      rows: input.rows,
      needsRefetch: true,
      blockedDeleteWhileEditing: false,
      skippedEditingCell: false,
    };
  }
  return {
    rows: input.rows,
    needsRefetch: true,
    blockedDeleteWhileEditing: false,
    skippedEditingCell: false,
  };
}

/** Preserve the editing cell when replacing the page from a refetch. */
export function mergeRefetchPreservingEdit(input: {
  previous: Array<Record<string, Cell>>;
  next: Array<Record<string, Cell>>;
  getRowId: (row: Record<string, Cell>) => string;
  editing: DataGridCellCoord | null;
}): Array<Record<string, Cell>> {
  return applyDataGridExternalPatch(
    input.previous,
    input.getRowId,
    { op: "replace", rows: input.next },
    { editing: input.editing },
  ).rows;
}
