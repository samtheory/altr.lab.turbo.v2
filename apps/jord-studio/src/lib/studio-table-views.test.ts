import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emptyColumnLayout } from "@altr/apolyx";

import {
  deleteTableView,
  emptyViewsBucket,
  getTableViewsBucket,
  renameTableView,
  setDefaultTableView,
  snapshotFromState,
  upsertTableView,
} from "./studio-table-views";
import { sqlTypeToGridType } from "./studio-grid-columns";

describe("studio-grid-columns", () => {
  it("maps SQL types to grid kinds", () => {
    assert.equal(sqlTypeToGridType("INTEGER"), "number");
    assert.equal(sqlTypeToGridType("BOOLEAN"), "boolean");
    assert.equal(sqlTypeToGridType("TIMESTAMPTZ"), "date");
    assert.equal(sqlTypeToGridType("JSONB"), "json");
    assert.equal(sqlTypeToGridType("TEXT"), "text");
  });
});

describe("studio-table-views", () => {
  it("upserts, defaults, renames, and deletes views", () => {
    let store = {};
    const view = snapshotFromState({
      name: "Active only",
      columnLayout: emptyColumnLayout(["id", "name"]),
      filters: [
        {
          id: "f1",
          columnId: "name",
          operator: "contains",
          value: "a",
        },
      ],
      sort: { columnId: "name", direction: "asc" },
      quickSearch: "",
    });

    store = upsertTableView(store, "public.users", view, true);
    let bucket = getTableViewsBucket(store, "public.users");
    assert.equal(bucket.views.length, 1);
    assert.equal(bucket.defaultViewId, view.id);

    store = renameTableView(store, "public.users", view.id, "Renamed");
    bucket = getTableViewsBucket(store, "public.users");
    assert.equal(bucket.views[0]?.name, "Renamed");

    store = setDefaultTableView(store, "public.users", null);
    assert.equal(getTableViewsBucket(store, "public.users").defaultViewId, null);

    store = deleteTableView(store, "public.users", view.id);
    assert.deepEqual(getTableViewsBucket(store, "public.users"), emptyViewsBucket());
  });
});
