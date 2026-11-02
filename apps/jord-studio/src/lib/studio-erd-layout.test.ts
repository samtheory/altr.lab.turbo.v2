import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchemaTable } from "./schema";
import {
  applyStoredLayout,
  autoLayoutForce,
  autoLayoutGrid,
  buildErdSvgMarkup,
  syncLayoutWithTables,
  validateCanvasFkDrag,
} from "./studio-erd-layout";
import { makeErdNodeId } from "./studio-erd-canvas";

const users: SchemaTable = {
  name: "users",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
    { name: "org_id", type: "TEXT", notnull: false, pk: false, dflt_value: null },
  ],
};

const orgs: SchemaTable = {
  name: "orgs",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
  ],
};

const posts: SchemaTable = {
  name: "posts",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
  ],
};

describe("studio-erd-layout", () => {
  it("keeps stored positions and places new tables near center", () => {
    const stored = [
      { schema: "public", table: "users", x: 10, y: 20, collapsed: false },
      { schema: "public", table: "orgs", x: 300, y: 20, collapsed: false },
    ];
    const nodes = applyStoredLayout([users, orgs, posts], stored, {
      viewportCenter: { x: 100, y: 100 },
    });
    const usersNode = nodes.find((n) => n.table === "users")!;
    const postsNode = nodes.find((n) => n.table === "posts")!;
    assert.equal(usersNode.x, 10);
    assert.equal(usersNode.y, 20);
    assert.ok(Math.abs(postsNode.x - 100) < 200);
  });

  it("sync drops removed tables without moving kept ones", () => {
    const initial = applyStoredLayout([users, orgs, posts], [
      { schema: "public", table: "users", x: 5, y: 5, collapsed: false },
      { schema: "public", table: "orgs", x: 50, y: 5, collapsed: false },
      { schema: "public", table: "posts", x: 100, y: 5, collapsed: false },
    ]);
    const synced = syncLayoutWithTables([users, orgs], initial, {
      x: 0,
      y: 0,
    });
    assert.deepEqual(synced.removed, [makeErdNodeId("public", "posts")]);
    assert.equal(synced.nodes.length, 2);
    assert.equal(
      synced.nodes.find((n) => n.table === "users")?.x,
      5,
    );
  });

  it("auto-layout grid and force move nodes", () => {
    const base = applyStoredLayout([users, orgs], [
      { schema: "public", table: "users", x: 17, y: 23, collapsed: false },
      { schema: "public", table: "orgs", x: 91, y: 45, collapsed: false },
    ]);
    const grid = autoLayoutGrid(base);
    assert.equal(grid[0]!.x, 0);
    assert.equal(grid[0]!.y, 0);
    assert.notEqual(grid[0]!.x, base[0]!.x);
    const force = autoLayoutForce(base, [
      {
        fromId: makeErdNodeId("public", "users"),
        toId: makeErdNodeId("public", "orgs"),
      },
    ]);
    assert.equal(force.length, 2);
  });

  it("validates FK drag against PK targets", () => {
    const ok = validateCanvasFkDrag([users, orgs], {
      fromSchema: "public",
      fromTable: "users",
      fromColumn: "org_id",
      toSchema: "public",
      toTable: "orgs",
      toColumn: "id",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.match(ok.sql, /FOREIGN KEY/);

    const bad = validateCanvasFkDrag([users, orgs], {
      fromSchema: "public",
      fromTable: "users",
      fromColumn: "org_id",
      toSchema: "public",
      toTable: "orgs",
      toColumn: "missing",
    });
    assert.equal(bad.ok, false);
  });

  it("builds SVG markup for export", () => {
    const nodes = applyStoredLayout([users, orgs], []);
    const svg = buildErdSvgMarkup(nodes, []);
    assert.match(svg, /^<svg /);
    assert.match(svg, /users/);
  });
});
