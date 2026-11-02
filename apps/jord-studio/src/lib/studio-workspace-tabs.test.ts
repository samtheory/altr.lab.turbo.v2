import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  closeTabInSnapshot,
  emptyTabState,
  isTabKey,
  makeTabKey,
  mergeTabsSnapshot,
  moveTab,
  parseTabKey,
  parseTabsParam,
  pathKeyFromRoute,
  reorderTabs,
  resolveActive,
  serializeTabsParam,
  tabLabel,
} from "./studio-workspace-tabs";

describe("studio-workspace-tabs", () => {
  it("makes and parses schema.table keys", () => {
    assert.equal(makeTabKey("public", "users"), "public.users");
    assert.deepEqual(parseTabKey("auth.users"), {
      schema: "auth",
      table: "users",
    });
    assert.equal(isTabKey("public.users"), true);
    assert.equal(isTabKey("users"), false);
    assert.equal(isTabKey("a.b.c"), false);
  });

  it("labels hide default schema badge", () => {
    assert.deepEqual(tabLabel("public.users", "public"), {
      title: "users",
      schemaBadge: null,
    });
    assert.deepEqual(tabLabel("auth.users", "public"), {
      title: "users",
      schemaBadge: "auth",
    });
  });

  it("parses and serializes tabs query", () => {
    assert.deepEqual(parseTabsParam("public.users,auth.users,bogus"), [
      "public.users",
      "auth.users",
    ]);
    assert.equal(
      serializeTabsParam(["public.users", "auth.users"]),
      "public.users,auth.users",
    );
  });

  it("resolves active with fallback", () => {
    assert.equal(resolveActive(["a.b", "c.d"], "c.d"), "c.d");
    assert.equal(resolveActive(["a.b", "c.d"], "gone"), "a.b");
    assert.equal(resolveActive([], "a.b"), null);
  });

  it("merges URL over stored and ensures path deep-link", () => {
    const merged = mergeTabsSnapshot({
      urlTabs: ["public.a"],
      urlActive: "public.a",
      stored: {
        order: ["public.old"],
        active: "public.old",
        states: { "public.old": emptyTabState() },
      },
      pathKey: "auth.users",
    });
    assert.deepEqual(merged.order, ["public.a", "auth.users"]);
    assert.equal(merged.active, "public.a");
    assert.ok(merged.states["auth.users"]);
  });

  it("closes active tab and activates neighbor", () => {
    const snap = {
      order: ["public.a", "public.b", "public.c"],
      active: "public.b" as const,
      states: {
        "public.a": emptyTabState(),
        "public.b": emptyTabState(),
        "public.c": emptyTabState(),
      },
    };
    const next = closeTabInSnapshot(snap, "public.b");
    assert.deepEqual(next.order, ["public.a", "public.c"]);
    assert.equal(next.active, "public.c");
    assert.equal(next.states["public.b"], undefined);
  });

  it("reorders and moves with Alt arrows", () => {
    assert.deepEqual(reorderTabs(["a.a", "b.b", "c.c"], 0, 2), [
      "b.b",
      "c.c",
      "a.a",
    ]);
    assert.deepEqual(moveTab(["a.a", "b.b", "c.c"], "b.b", -1), [
      "b.b",
      "a.a",
      "c.c",
    ]);
  });

  it("builds path keys from route + schema", () => {
    assert.equal(
      pathKeyFromRoute({
        tableName: "users",
        schemaParam: "auth",
        defaultSchema: "public",
      }),
      "auth.users",
    );
    assert.equal(
      pathKeyFromRoute({
        tableName: "users",
        schemaParam: null,
        defaultSchema: "public",
      }),
      "public.users",
    );
  });
});
