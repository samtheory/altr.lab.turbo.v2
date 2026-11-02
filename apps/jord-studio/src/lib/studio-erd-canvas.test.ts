import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchemaTable } from "./schema";
import {
  buildErdGraph,
  clampZoom,
  computeAlignmentGuides,
  fitViewport,
  formatCardinalityLabel,
  hitTestNode,
  makeErdNodeId,
  measureErdBuildMs,
  moveNodes,
  nodesInRect,
  orthogonalPath,
  panBy,
  screenToWorld,
  seedErdTables,
  snapToGrid,
  zoomAtScreenPoint,
} from "./studio-erd-canvas";

const users: SchemaTable = {
  name: "users",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
    {
      name: "org_id",
      type: "TEXT",
      notnull: true,
      pk: false,
      dflt_value: null,
    },
  ],
  foreignKeys: [
    {
      columns: ["org_id"],
      references: { schema: "app", table: "orgs", columns: ["id"] },
      cardinality: "1:N",
    },
  ],
};

const orgs: SchemaTable = {
  name: "orgs",
  schema: "app",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
  ],
};

describe("studio-erd-canvas", () => {
  it("builds nodes and cross-schema edges", () => {
    const graph = buildErdGraph([users, orgs]);
    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges.length, 1);
    const edge = graph.edges[0]!;
    assert.equal(edge.fromId, makeErdNodeId("public", "users"));
    assert.equal(edge.toId, makeErdNodeId("app", "orgs"));
    assert.equal(edge.crossSchema, true);
    assert.equal(edge.cardinality, "1—N");
    const usersNode = graph.nodes.find((n) => n.table === "users")!;
    const orgCol = usersNode.columns.find((c) => c.name === "org_id");
    assert.equal(orgCol?.kind, "fk");
  });

  it("clamps zoom and zooms toward a screen point", () => {
    assert.equal(clampZoom(0.01), 0.1);
    assert.equal(clampZoom(9), 4);
    const vp = { x: 0, y: 0, zoom: 1 };
    const next = zoomAtScreenPoint(vp, 100, 50, 2);
    assert.equal(next.zoom, 2);
    const world = screenToWorld(100, 50, next);
    assert.ok(Math.abs(world.x - 100) < 1e-6);
    assert.ok(Math.abs(world.y - 50) < 1e-6);
  });

  it("fits viewport and pans", () => {
    const graph = buildErdGraph([users, orgs]);
    const fitted = fitViewport(graph.nodes, 800, 600, 40);
    assert.ok(fitted.zoom > 0 && fitted.zoom <= 4);
    const panned = panBy(fitted, 10, -5);
    assert.equal(panned.x, fitted.x + 10);
    assert.equal(panned.y, fitted.y - 5);
  });

  it("produces orthogonal paths and snaps to grid", () => {
    const graph = buildErdGraph([users, orgs]);
    const a = graph.nodes[0]!;
    const b = graph.nodes[1]!;
    const path = orthogonalPath(a, b);
    assert.match(path, /^M /);
    assert.ok(path.includes(" L "));
    const snapped = snapToGrid(17, 31, 16);
    assert.equal(snapped.x, 16);
    assert.equal(snapped.y, 32);
  });

  it("hit-tests, marquee-selects, and moves with guides", () => {
    const graph = buildErdGraph([users, orgs]);
    const n0 = graph.nodes[0]!;
    const hit = hitTestNode(graph.nodes, n0.x + 4, n0.y + 4);
    assert.equal(hit?.id, n0.id);
    const boxed = nodesInRect(
      graph.nodes,
      n0.x - 1,
      n0.y - 1,
      n0.x + n0.width + 1,
      n0.y + n0.height + 1,
    );
    assert.ok(boxed.some((n) => n.id === n0.id));
    const moved = moveNodes(graph.nodes, new Set([n0.id]), 16, 0, true);
    assert.equal(moved.find((n) => n.id === n0.id)?.x, n0.x + 16);
    const guides = computeAlignmentGuides(
      [{ ...n0, x: n0.x + 2 }],
      graph.nodes.filter((n) => n.id !== n0.id),
      8,
    );
    assert.ok(Array.isArray(guides));
  });

  it("formats cardinality labels", () => {
    assert.equal(formatCardinalityLabel("1:1"), "1—1");
    assert.equal(formatCardinalityLabel("M:N"), "N—M");
    assert.equal(formatCardinalityLabel("1:N"), "1—N");
  });

  it("builds 100 tables / ≥500 relations interactively (<250ms)", () => {
    const tables = seedErdTables(100, 500);
    const result = measureErdBuildMs(tables);
    assert.equal(result.nodes, 100);
    assert.ok(
      result.edges >= 500,
      `expected ≥500 edges, got ${result.edges}`,
    );
    assert.ok(
      result.ms < 250,
      `erd build too slow: ${result.ms.toFixed(1)}ms for ${result.nodes} nodes / ${result.edges} edges`,
    );
  });
});
