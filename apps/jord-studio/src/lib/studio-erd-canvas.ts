/**
 * ERD canvas helpers (S0061 / jord-F0027) — viewport math, graph build,
 * grid layout, orthogonal edges. No layout persistence (that is S0062).
 */

import type { SchemaColumn, SchemaForeignKey, SchemaTable } from "@/lib/schema";

export const ERD_VIEW = "visualizer" as const;
export const ERD_MIN_ZOOM = 0.1;
export const ERD_MAX_ZOOM = 4;
export const ERD_DEFAULT_ZOOM = 1;
export const ERD_GRID_SIZE = 16;
export const ERD_CARD_WIDTH = 220;
export const ERD_CARD_HEADER = 36;
export const ERD_CARD_ROW = 22;
export const ERD_CARD_PAD = 8;
export const ERD_MAX_VISIBLE_COLS = 8;
export const ERD_ALIGN_THRESHOLD = 6;

export type ErdViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type ErdColumnKind = "pk" | "fk" | "both" | "plain";

export type ErdColumn = {
  name: string;
  type: string;
  kind: ErdColumnKind;
};

export type ErdNode = {
  id: string;
  schema: string;
  table: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: ErdColumn[];
};

export type ErdEdge = {
  id: string;
  fromId: string;
  toId: string;
  cardinality: string;
  ownerColumns: string[];
  targetColumns: string[];
  /** True when either endpoint sits in a different schema than the other. */
  crossSchema: boolean;
};

export type ErdGraph = {
  nodes: ErdNode[];
  edges: ErdEdge[];
};

export type AlignmentGuide = {
  axis: "x" | "y";
  /** World coordinate of the guide line. */
  value: number;
};

function defaultSchema(table: SchemaTable): string {
  return table.schema ?? "main";
}

export function qualifyTable(schema: string, table: string): string {
  if (!schema || schema === "public" || schema === "main") return table;
  return `${schema}.${table}`;
}

export function makeErdNodeId(schema: string, table: string): string {
  return `${schema}::${table}`;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ERD_DEFAULT_ZOOM;
  return Math.min(ERD_MAX_ZOOM, Math.max(ERD_MIN_ZOOM, zoom));
}

export function cardHeightForColumns(columnCount: number): number {
  const visible = Math.min(Math.max(columnCount, 1), ERD_MAX_VISIBLE_COLS);
  const extra = columnCount > ERD_MAX_VISIBLE_COLS ? ERD_CARD_ROW : 0;
  return ERD_CARD_HEADER + ERD_CARD_PAD + visible * ERD_CARD_ROW + extra + ERD_CARD_PAD;
}

function columnKind(
  col: SchemaColumn,
  fkCols: Set<string>,
): ErdColumnKind {
  const isPk = Boolean(col.pk);
  const isFk = fkCols.has(col.name);
  if (isPk && isFk) return "both";
  if (isPk) return "pk";
  if (isFk) return "fk";
  return "plain";
}

function columnsForCard(table: SchemaTable): ErdColumn[] {
  const fkCols = new Set<string>();
  for (const fk of table.foreignKeys ?? []) {
    for (const c of fk.columns) fkCols.add(c);
  }
  const ranked = [...table.columns].sort((a, b) => {
    const score = (c: SchemaColumn) =>
      (c.pk ? 2 : 0) + (fkCols.has(c.name) ? 1 : 0);
    return score(b) - score(a);
  });
  return ranked.map((c) => ({
    name: c.name,
    type: c.type || "?",
    kind: columnKind(c, fkCols),
  }));
}

/** Initial grid placement — deterministic, no DB writes. */
export function layoutNodesGrid(
  nodes: Omit<ErdNode, "x" | "y">[],
  opts?: { gapX?: number; gapY?: number; cols?: number },
): ErdNode[] {
  const gapX = opts?.gapX ?? 64;
  const gapY = opts?.gapY ?? 48;
  const cols =
    opts?.cols ??
    Math.max(1, Math.ceil(Math.sqrt(Math.max(nodes.length, 1))));
  return nodes.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...node,
      x: col * (ERD_CARD_WIDTH + gapX),
      y: row * (node.height + gapY),
    };
  });
}

export function buildErdGraph(tables: SchemaTable[]): ErdGraph {
  const nodeMeta = tables.map((t) => {
    const schema = defaultSchema(t);
    const columns = columnsForCard(t);
    return {
      id: makeErdNodeId(schema, t.name),
      schema,
      table: t.name,
      width: ERD_CARD_WIDTH,
      height: cardHeightForColumns(columns.length),
      columns,
    };
  });
  const byId = new Map(nodeMeta.map((n) => [n.id, n]));
  const nodes = layoutNodesGrid(nodeMeta);

  const edges: ErdEdge[] = [];
  const seen = new Set<string>();
  for (const table of tables) {
    const ownerSchema = defaultSchema(table);
    const fromId = makeErdNodeId(ownerSchema, table.name);
    if (!byId.has(fromId)) continue;
    for (const fk of table.foreignKeys ?? []) {
      const edge = edgeFromFk(fromId, ownerSchema, table.name, fk);
      if (!byId.has(edge.toId)) {
        // Cross-schema / missing target: still draw if we invent a stub? Skip —
        // caller should pass a catalog that includes referenced tables when possible.
        // Keep the edge only when both ends exist.
        continue;
      }
      if (seen.has(edge.id)) continue;
      seen.add(edge.id);
      edges.push(edge);
    }
  }

  return { nodes, edges };
}

function edgeFromFk(
  fromId: string,
  ownerSchema: string,
  ownerTable: string,
  fk: SchemaForeignKey,
): ErdEdge {
  const targetSchema = fk.references.schema || "main";
  const toId = makeErdNodeId(targetSchema, fk.references.table);
  return {
    id: [
      ownerSchema,
      ownerTable,
      fk.columns.join(","),
      targetSchema,
      fk.references.table,
      fk.references.columns.join(","),
    ].join("|"),
    fromId,
    toId,
    cardinality: formatCardinalityLabel(fk.cardinality ?? "1:N"),
    ownerColumns: [...fk.columns],
    targetColumns: [...fk.references.columns],
    crossSchema: ownerSchema !== targetSchema,
  };
}

/** Normalize introspected labels to canvas chips (1—1, 1—N, N—M). */
export function formatCardinalityLabel(raw: string): string {
  const n = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (n === "1:1" || n === "1-1" || n === "1—1") return "1—1";
  if (n === "M:N" || n === "N:M" || n === "M-N" || n === "N-M") return "N—M";
  if (n === "1:N" || n === "1-N" || n === "1—N") return "1—N";
  return raw;
}

export function snapToGrid(
  x: number,
  y: number,
  gridSize: number = ERD_GRID_SIZE,
): { x: number; y: number } {
  const g = Math.max(1, gridSize);
  return {
    x: Math.round(x / g) * g,
    y: Math.round(y / g) * g,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ErdViewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ErdViewport,
): { x: number; y: number } {
  return {
    x: worldX * viewport.zoom + viewport.x,
    y: worldY * viewport.zoom + viewport.y,
  };
}

/** Zoom toward a screen point (keeps that world point under the cursor). */
export function zoomAtScreenPoint(
  viewport: ErdViewport,
  screenX: number,
  screenY: number,
  nextZoom: number,
): ErdViewport {
  const zoom = clampZoom(nextZoom);
  const world = screenToWorld(screenX, screenY, viewport);
  return {
    zoom,
    x: screenX - world.x * zoom,
    y: screenY - world.y * zoom,
  };
}

export function panBy(
  viewport: ErdViewport,
  dx: number,
  dy: number,
): ErdViewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function nodesBounds(nodes: ErdNode[], padding = 0): Bounds | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

/** Fit all nodes into the viewport with padding (screen px). */
export function fitViewport(
  nodes: ErdNode[],
  viewW: number,
  viewH: number,
  padding = 48,
): ErdViewport {
  const bounds = nodesBounds(nodes);
  if (!bounds || viewW <= 0 || viewH <= 0) {
    return { x: 0, y: 0, zoom: ERD_DEFAULT_ZOOM };
  }
  const bw = Math.max(1, bounds.maxX - bounds.minX);
  const bh = Math.max(1, bounds.maxY - bounds.minY);
  const zoom = clampZoom(
    Math.min((viewW - padding * 2) / bw, (viewH - padding * 2) / bh),
  );
  const contentW = bw * zoom;
  const contentH = bh * zoom;
  return {
    zoom,
    x: (viewW - contentW) / 2 - bounds.minX * zoom,
    y: (viewH - contentH) / 2 - bounds.minY * zoom,
  };
}

type Anchor = { x: number; y: number; side: "left" | "right" | "top" | "bottom" };

function nodeCenter(n: ErdNode): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

function pickAnchors(from: ErdNode, to: ErdNode): { a: Anchor; b: Anchor } {
  const fc = nodeCenter(from);
  const tc = nodeCenter(to);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return {
        a: { x: from.x + from.width, y: fc.y, side: "right" },
        b: { x: to.x, y: tc.y, side: "left" },
      };
    }
    return {
      a: { x: from.x, y: fc.y, side: "left" },
      b: { x: to.x + to.width, y: tc.y, side: "right" },
    };
  }
  if (dy >= 0) {
    return {
      a: { x: fc.x, y: from.y + from.height, side: "bottom" },
      b: { x: tc.x, y: to.y, side: "top" },
    };
  }
  return {
    a: { x: fc.x, y: from.y, side: "top" },
    b: { x: tc.x, y: to.y + to.height, side: "bottom" },
  };
}

/**
 * Orthogonal (elbow) path between two nodes. Routes mid-way so lines
 * clear card bodies for the common left/right and top/bottom cases.
 */
export function orthogonalPath(from: ErdNode, to: ErdNode): string {
  const { a, b } = pickAnchors(from, to);
  if (a.side === "right" || a.side === "left") {
    const midX = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
  }
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}

export function edgeLabelPoint(from: ErdNode, to: ErdNode): { x: number; y: number } {
  const { a, b } = pickAnchors(from, to);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Alignment guides for the moving selection against other nodes. */
export function computeAlignmentGuides(
  moving: ErdNode[],
  others: ErdNode[],
  threshold: number = ERD_ALIGN_THRESHOLD,
): AlignmentGuide[] {
  if (moving.length === 0 || others.length === 0) return [];
  const guides: AlignmentGuide[] = [];
  const seenX = new Set<number>();
  const seenY = new Set<number>();

  const movingEdges = moving.flatMap((n) => [
    { axis: "x" as const, value: n.x },
    { axis: "x" as const, value: n.x + n.width / 2 },
    { axis: "x" as const, value: n.x + n.width },
    { axis: "y" as const, value: n.y },
    { axis: "y" as const, value: n.y + n.height / 2 },
    { axis: "y" as const, value: n.y + n.height },
  ]);

  for (const o of others) {
    const otherEdges = [
      { axis: "x" as const, value: o.x },
      { axis: "x" as const, value: o.x + o.width / 2 },
      { axis: "x" as const, value: o.x + o.width },
      { axis: "y" as const, value: o.y },
      { axis: "y" as const, value: o.y + o.height / 2 },
      { axis: "y" as const, value: o.y + o.height },
    ];
    for (const m of movingEdges) {
      for (const t of otherEdges) {
        if (m.axis !== t.axis) continue;
        if (Math.abs(m.value - t.value) > threshold) continue;
        if (t.axis === "x" && !seenX.has(t.value)) {
          seenX.add(t.value);
          guides.push({ axis: "x", value: t.value });
        }
        if (t.axis === "y" && !seenY.has(t.value)) {
          seenY.add(t.value);
          guides.push({ axis: "y", value: t.value });
        }
      }
    }
  }
  return guides;
}

/** Snap a proposed position using the strongest nearby guide. */
export function applyGuidesToDelta(
  dx: number,
  dy: number,
  moving: ErdNode[],
  guides: AlignmentGuide[],
  threshold: number = ERD_ALIGN_THRESHOLD,
): { dx: number; dy: number } {
  let outDx = dx;
  let outDy = dy;
  for (const g of guides) {
    for (const n of moving) {
      if (g.axis === "x") {
        const candidates = [n.x + dx, n.x + n.width / 2 + dx, n.x + n.width + dx];
        for (const c of candidates) {
          const diff = g.value - c;
          if (Math.abs(diff) <= threshold) {
            outDx = dx + diff;
            break;
          }
        }
      } else {
        const candidates = [
          n.y + dy,
          n.y + n.height / 2 + dy,
          n.y + n.height + dy,
        ];
        for (const c of candidates) {
          const diff = g.value - c;
          if (Math.abs(diff) <= threshold) {
            outDy = dy + diff;
            break;
          }
        }
      }
    }
  }
  return { dx: outDx, dy: outDy };
}

export function moveNodes(
  nodes: ErdNode[],
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
  snap: boolean,
): ErdNode[] {
  return nodes.map((n) => {
    if (!ids.has(n.id)) return n;
    let x = n.x + dx;
    let y = n.y + dy;
    if (snap) {
      const s = snapToGrid(x, y);
      x = s.x;
      y = s.y;
    }
    return { ...n, x, y };
  });
}

export function hitTestNode(
  nodes: ErdNode[],
  worldX: number,
  worldY: number,
): ErdNode | null {
  // Top-most last in list wins.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!;
    if (
      worldX >= n.x &&
      worldX <= n.x + n.width &&
      worldY >= n.y &&
      worldY <= n.y + n.height
    ) {
      return n;
    }
  }
  return null;
}

export function nodesInRect(
  nodes: ErdNode[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): ErdNode[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  return nodes.filter((n) => {
    const nx1 = n.x + n.width;
    const ny1 = n.y + n.height;
    return n.x < maxX && nx1 > minX && n.y < maxY && ny1 > minY;
  });
}

/**
 * Deterministic seed for perf gates: `tableCount` tables and up to
 * `relationCount` FK edges (capped by what a chain + fan-out can produce).
 */
export function seedErdTables(
  tableCount: number,
  relationCount: number,
): SchemaTable[] {
  const tables: SchemaTable[] = [];
  for (let i = 0; i < tableCount; i++) {
    const schema = i % 17 === 0 ? "app" : "public";
    const cols: SchemaColumn[] = [
      { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
      {
        name: "name",
        type: "TEXT",
        notnull: false,
        pk: false,
        dflt_value: null,
      },
      {
        name: "created_at",
        type: "INTEGER",
        notnull: true,
        pk: false,
        dflt_value: null,
      },
    ];
    const fks: SchemaForeignKey[] = [];
    tables.push({
      name: `t_${i}`,
      schema,
      columns: cols,
      foreignKeys: fks,
    });
  }

  let made = 0;
  for (let i = 1; i < tableCount && made < relationCount; i++) {
    const parent = tables[i - 1]!;
    const child = tables[i]!;
    child.columns.push({
      name: "parent_id",
      type: "TEXT",
      notnull: false,
      pk: false,
      dflt_value: null,
    });
    child.foreignKeys = child.foreignKeys ?? [];
    child.foreignKeys.push({
      columns: ["parent_id"],
      references: {
        schema: parent.schema ?? "main",
        table: parent.name,
        columns: ["id"],
      },
      cardinality: "1:N",
    });
    made++;
  }

  // Extra fan-out edges from early tables to later ones for denser graphs.
  for (let i = 0; i < tableCount && made < relationCount; i++) {
    for (let j = i + 2; j < tableCount && made < relationCount; j += 3) {
      const parent = tables[i]!;
      const child = tables[j]!;
      const col = `ref_${i}_id`;
      if (!child.columns.some((c) => c.name === col)) {
        child.columns.push({
          name: col,
          type: "TEXT",
          notnull: false,
          pk: false,
          dflt_value: null,
        });
      }
      child.foreignKeys = child.foreignKeys ?? [];
      child.foreignKeys.push({
        columns: [col],
        references: {
          schema: parent.schema ?? "main",
          table: parent.name,
          columns: ["id"],
        },
        cardinality: j % 11 === 0 ? "1:1" : "1:N",
      });
      made++;
    }
  }

  return tables;
}

/** Wall-clock cost of build + layout + path generation (perf proof helper). */
export function measureErdBuildMs(
  tables: SchemaTable[],
): { ms: number; nodes: number; edges: number } {
  const t0 = performance.now();
  const graph = buildErdGraph(tables);
  for (const e of graph.edges) {
    const from = graph.nodes.find((n) => n.id === e.fromId);
    const to = graph.nodes.find((n) => n.id === e.toId);
    if (from && to) {
      void orthogonalPath(from, to);
      void edgeLabelPoint(from, to);
    }
  }
  const ms = performance.now() - t0;
  return { ms, nodes: graph.nodes.length, edges: graph.edges.length };
}
