import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SQL_TAB_SQL,
  addSqlTab,
  closeSqlTab,
  emptyWorkspace,
  filterSqlItems,
  isTabDirty,
  loadWorkspaceSnapshot,
  markTabExecuted,
  parseWorkspaceSnapshot,
  patchSqlTab,
  reorderSqlTabs,
  saveWorkspaceSnapshot,
  truncateTitle,
} from "./studio-sql-workspace";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } as Storage;
}

describe("studio-sql-workspace (S0064)", () => {
  it("starts with one clean default tab", () => {
    const snap = emptyWorkspace();
    assert.equal(snap.order.length, 1);
    const tab = snap.tabs[snap.active!];
    assert.ok(tab);
    assert.equal(tab.sql, DEFAULT_SQL_TAB_SQL);
    assert.equal(isTabDirty(tab), false);
  });

  it("marks dirty when text diverges from baseline", () => {
    const snap = emptyWorkspace();
    const id = snap.active!;
    const dirty = patchSqlTab(snap, id, { sql: "SELECT 2;" });
    assert.equal(isTabDirty(dirty.tabs[id]!), true);
    const afterRun = markTabExecuted(dirty, id);
    assert.equal(isTabDirty(afterRun.tabs[id]!), false);
  });

  it("guards close when dirty unless forced", () => {
    let snap = emptyWorkspace();
    const id = snap.active!;
    snap = patchSqlTab(snap, id, { sql: "SELECT dirty;" });
    const blocked = closeSqlTab(snap, id);
    assert.equal(blocked.ok, false);
    if (blocked.ok) throw new Error("expected confirm");
    assert.equal(blocked.needsConfirm, true);

    const forced = closeSqlTab(snap, id, { force: true });
    assert.equal(forced.ok, true);
    if (!forced.ok) throw new Error("expected ok");
    assert.equal(forced.snapshot.order.length, 1);
    assert.notEqual(forced.snapshot.active, id);
  });

  it("persists and restores tabs per project", () => {
    const storage = memoryStorage();
    let snap = emptyWorkspace();
    snap = addSqlTab(snap, {
      title: "Customers",
      sql: "SELECT * FROM customers;",
      baseline: "SELECT * FROM customers;",
    });
    saveWorkspaceSnapshot(storage, "demo", snap);
    const loaded = loadWorkspaceSnapshot(storage, "demo");
    assert.equal(loaded.order.length, 2);
    assert.equal(
      Object.values(loaded.tabs).some((t) => t.title === "Customers"),
      true,
    );
    assert.equal(loadWorkspaceSnapshot(storage, "other").order.length, 1);
  });

  it("reorders tabs and truncates titles", () => {
    assert.deepEqual(reorderSqlTabs(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.equal(
      truncateTitle("SELECT * FROM very_long_table_name"),
      "SELECT * FROM very_long_tab…",
    );
  });

  it("rejects malformed snapshots", () => {
    assert.equal(parseWorkspaceSnapshot(null), null);
    assert.equal(parseWorkspaceSnapshot({ order: [], tabs: {} }), null);
  });

  it("filters sidebar items by haystack", () => {
    const items = [
      { id: "1", label: "Alpha" },
      { id: "2", label: "Beta query" },
    ];
    assert.deepEqual(
      filterSqlItems(items, "beta", (i) => i.label).map((i) => i.id),
      ["2"],
    );
  });
});
