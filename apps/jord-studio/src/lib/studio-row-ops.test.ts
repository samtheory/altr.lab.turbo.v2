import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildInsertValues,
  bulkDeleteRows,
  chunkIds,
  clampPageSize,
  confirmDeleteLabel,
  draftFromRow,
  hasMoreRows,
  jumpToEndOffset,
  parseCell,
} from "./studio-row-ops";

describe("studio-row-ops", () => {
  it("clamps page size to allowed set", () => {
    assert.equal(clampPageSize(50), 50);
    assert.equal(clampPageSize(99), 50);
    assert.equal(clampPageSize(100), 100);
  });

  it("parses typed cells", () => {
    assert.equal(parseCell("INTEGER", "3"), 3);
    assert.equal(parseCell("REAL", "1.5"), 1.5);
    assert.equal(parseCell("TEXT", "hi"), "hi");
    assert.equal(parseCell("TEXT", ""), null);
  });

  it("builds insert values and skips generated pk blanks", () => {
    const values = buildInsertValues(
      [
        {
          name: "id",
          type: "TEXT",
          pk: true,
          settings: { idStrategy: { kind: "uuid_v4" } },
        },
        { name: "title", type: "TEXT", pk: false },
      ],
      { id: "", title: "hello" },
    );
    assert.deepEqual(values, { title: "hello" });
  });

  it("clears pk when drafting a duplicate", () => {
    const draft = draftFromRow(
      [
        { name: "id", type: "TEXT", pk: true },
        { name: "title", type: "TEXT", pk: false },
      ],
      { id: "a1", title: "note" },
    );
    assert.deepEqual(draft, { id: "", title: "note" });
  });

  it("chunks ids and reports partial bulk delete failures", async () => {
    assert.deepEqual(chunkIds(["a", "b", "c", "d"], 2), [
      ["a", "b"],
      ["c", "d"],
    ]);
    const report = await bulkDeleteRows({
      ids: ["1", "2", "3"],
      chunkSize: 2,
      deleteOne: async (pk) => {
        if (pk === "2") throw new Error("boom");
      },
    });
    assert.deepEqual(report.deleted, ["1", "3"]);
    assert.deepEqual(report.failed, [{ pk: "2", message: "boom" }]);
  });

  it("names the count in confirm copy", () => {
    assert.match(confirmDeleteLabel(1, "row-9"), /row-9/);
    assert.match(confirmDeleteLabel(12), /12 selected/);
  });

  it("computes has-more and jump-to-end offset", () => {
    assert.equal(
      hasMoreRows({ loaded: 50, total: 120, lastFetchCount: 50, pageSize: 50 }),
      true,
    );
    assert.equal(
      hasMoreRows({ loaded: 120, total: 120, lastFetchCount: 20, pageSize: 50 }),
      false,
    );
    assert.equal(
      hasMoreRows({
        loaded: 50,
        total: null,
        lastFetchCount: 50,
        pageSize: 50,
      }),
      true,
    );
    assert.equal(jumpToEndOffset(120, 50), 70);
    assert.equal(jumpToEndOffset(10, 50), 0);
  });
});
