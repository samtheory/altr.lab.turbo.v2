import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCellPatchBody,
  mergeLiveChangeIntoRows,
  mergeRefetchPreservingEdit,
  parseLiveChangeEvent,
} from "./studio-inline-edit";
import type { Cell } from "./studio-row-ops";

describe("studio-inline-edit", () => {
  it("builds conditional PATCH bodies", () => {
    assert.deepEqual(
      buildCellPatchBody({
        columnId: "title",
        nextValue: "b",
        oldValue: "a",
      }),
      {
        values: { title: "b" },
        old: { title: "a" },
      },
    );
  });

  it("parses live events and deletes by id", () => {
    assert.deepEqual(parseLiveChangeEvent(`{"op":"delete","id":"1"}`), {
      op: "delete",
      id: "1",
    });
    const rows: Array<Record<string, Cell>> = [
      { id: "1", title: "a" },
      { id: "2", title: "b" },
    ];
    const merged = mergeLiveChangeIntoRows({
      rows,
      getRowId: (row) => String(row.id),
      event: { op: "delete", id: "2" },
      editing: null,
    });
    assert.equal(merged.needsRefetch, false);
    assert.deepEqual(
      merged.rows.map((r) => r.id),
      ["1"],
    );
  });

  it("warns instead of deleting the row under edit", () => {
    const rows: Array<Record<string, Cell>> = [{ id: "1", title: "a" }];
    const merged = mergeLiveChangeIntoRows({
      rows,
      getRowId: (row) => String(row.id),
      event: { op: "delete", id: "1" },
      editing: { rowId: "1", columnId: "title" },
    });
    assert.equal(merged.blockedDeleteWhileEditing, true);
    assert.equal(merged.rows.length, 1);
  });

  it("preserves the editing cell across refetch", () => {
    const previous: Array<Record<string, Cell>> = [
      { id: "1", title: "editing" },
    ];
    const next: Array<Record<string, Cell>> = [
      { id: "1", title: "remote" },
      { id: "2", title: "new" },
    ];
    const merged = mergeRefetchPreservingEdit({
      previous,
      next,
      getRowId: (row) => String(row.id),
      editing: { rowId: "1", columnId: "title" },
    });
    assert.equal(merged.find((r) => r.id === "1")?.title, "editing");
    assert.equal(merged.find((r) => r.id === "2")?.title, "new");
  });
});
