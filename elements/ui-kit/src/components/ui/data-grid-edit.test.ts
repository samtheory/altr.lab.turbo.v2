import { describe, expect, it } from "vitest";

import {
  applyDataGridExternalPatch,
  dataGridCellKey,
  parseTypedCellDraft,
} from "./data-grid-edit";

type Row = { id: string; name: string; score: number };

describe("data-grid-edit helpers", () => {
  it("parses typed drafts", () => {
    expect(parseTypedCellDraft("number", "12")).toBe(12);
    expect(parseTypedCellDraft("boolean", "true")).toBe(true);
    expect(parseTypedCellDraft("json", '{"a":1}')).toEqual({ a: 1 });
    expect(parseTypedCellDraft("text", "")).toBeNull();
  });

  it("skips the editing cell on upsert", () => {
    const rows: Row[] = [
      { id: "1", name: "Ada", score: 1 },
      { id: "2", name: "Grace", score: 2 },
    ];
    const merged = applyDataGridExternalPatch(
      rows,
      (r) => r.id,
      { op: "upsert", rowId: "1", row: { id: "1", name: "REMOTE", score: 9 } },
      { editing: { rowId: "1", columnId: "name" } },
    );
    expect(merged.skippedEditingCell).toBe(true);
    expect(merged.rows[0]).toEqual({ id: "1", name: "Ada", score: 9 });
  });

  it("blocks delete while editing when asked", () => {
    const rows: Row[] = [{ id: "1", name: "Ada", score: 1 }];
    const merged = applyDataGridExternalPatch(
      rows,
      (r) => r.id,
      { op: "delete", rowId: "1" },
      {
        editing: { rowId: "1", columnId: "name" },
        keepEditingRowOnDelete: true,
      },
    );
    expect(merged.blockedDeleteWhileEditing).toBe(true);
    expect(merged.rows).toHaveLength(1);
  });

  it("builds stable cell keys", () => {
    expect(dataGridCellKey("a", "b")).toBe("a\0b");
  });
});
