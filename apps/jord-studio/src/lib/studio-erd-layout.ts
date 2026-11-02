/**
 * ERD layout sync, auto-layout, FK drag helpers, export (S0062 / jord-F0027).
 */

import type { SchemaTable } from "@/lib/schema";
import {
  ERD_CARD_WIDTH,
  buildErdGraph,
  edgeLabelPoint,
  layoutNodesGrid,
  makeErdNodeId,
  orthogonalPath,
  type ErdNode,
  type ErdViewport,
} from "@/lib/studio-erd-canvas";

export type LayoutNodePersist = {
  schema: string;
  table: string;
  x: number;
  y: number;
  collapsed: boolean;
};

export type LayoutSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function nodesToPersist(nodes: ErdNode[]): LayoutNodePersist[] {
  return nodes.map((n) => ({
    schema: n.schema,
    table: n.table,
    x: n.x,
    y: n.y,
    collapsed: false,
  }));
}

export function applyStoredLayout(
  tables: SchemaTable[],
  stored: LayoutNodePersist[],
  opts?: { viewportCenter?: { x: number; y: number } },
): ErdNode[] {
  const graph = buildErdGraph(tables);
  const byKey = new Map<string, LayoutNodePersist>(
    stored.map((n) => [`${n.schema}::${n.table}`, n]),
  );
  const placed: ErdNode[] = [];
  const missing: ErdNode[] = [];
  for (const node of graph.nodes) {
    const hit = byKey.get(node.id) ?? byKey.get(`${node.schema}::${node.table}`);
    if (hit) {
      placed.push({ ...node, x: hit.x, y: hit.y });
    } else {
      missing.push(node);
    }
  }

  if (missing.length === 0) return placed;

  const center = opts?.viewportCenter ?? estimateCenter(placed);
  const gap = 48;
  const cols = Math.max(1, Math.ceil(Math.sqrt(missing.length)));
  return [
    ...placed,
    ...missing.map((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...node,
        x: center.x + col * (ERD_CARD_WIDTH + gap) - ((cols - 1) * (ERD_CARD_WIDTH + gap)) / 2,
        y: center.y + row * (node.height + gap),
      };
    }),
  ];
}

function estimateCenter(nodes: ErdNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 80, y: 80 };
  let sx = 0;
  let sy = 0;
  for (const n of nodes) {
    sx += n.x + n.width / 2;
    sy += n.y + n.height / 2;
  }
  return { x: sx / nodes.length - ERD_CARD_WIDTH / 2, y: sy / nodes.length };
}

/**
 * Diff introspection vs stored layout: keep existing positions, place newcomers
 * near viewport center, drop removed tables (no confirm here — caller confirms).
 */
export function syncLayoutWithTables(
  tables: SchemaTable[],
  current: ErdNode[],
  viewportCenter: { x: number; y: number },
): { nodes: ErdNode[]; removed: string[]; added: string[] } {
  const graph = buildErdGraph(tables);
  const prev = new Map(current.map((n) => [n.id, n]));
  const nextIds = new Set(graph.nodes.map((n) => n.id));
  const removed = [...prev.keys()].filter((id) => !nextIds.has(id));
  const added: string[] = [];
  const kept: ErdNode[] = [];
  const newcomers: ErdNode[] = [];

  for (const meta of graph.nodes) {
    const old = prev.get(meta.id);
    if (old) {
      kept.push({ ...meta, x: old.x, y: old.y });
    } else {
      added.push(meta.id);
      newcomers.push(meta);
    }
  }

  const placedNew = newcomers.map((node, i) => ({
    ...node,
    x: viewportCenter.x + (i % 3) * (ERD_CARD_WIDTH + 40),
    y: viewportCenter.y + Math.floor(i / 3) * (node.height + 40),
  }));

  return {
    nodes: [...kept, ...placedNew],
    removed,
    added,
  };
}

export function autoLayoutGrid(nodes: ErdNode[]): ErdNode[] {
  const meta = nodes.map(({ x: _x, y: _y, ...rest }) => rest);
  return layoutNodesGrid(meta);
}

/** Simple force-directed layout (deterministic iterations, no RNG). */
export function autoLayoutForce(
  nodes: ErdNode[],
  edges: { fromId: string; toId: string }[],
  iterations = 80,
): ErdNode[] {
  if (nodes.length === 0) return [];
  const pos = nodes.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    w: n.width,
    h: n.height,
  }));
  const byId = new Map(pos.map((p) => [p.id, p]));
  const area = Math.max(1, nodes.length) * 180 * 140;
  const k = Math.sqrt(area / Math.max(1, nodes.length));

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;
    const disp = new Map(pos.map((p) => [p.id, { dx: 0, dy: 0 }]));

    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i]!;
        const b = pos[j]!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const force = (k * k) / dist;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        const da = disp.get(a.id)!;
        const db = disp.get(b.id)!;
        da.dx += dx;
        da.dy += dy;
        db.dx -= dx;
        db.dy -= dy;
      }
    }

    for (const e of edges) {
      const a = byId.get(e.fromId);
      const b = byId.get(e.toId);
      if (!a || !b) continue;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k;
      dx = (dx / dist) * force * 0.05;
      dy = (dy / dist) * force * 0.05;
      const da = disp.get(a.id)!;
      const db = disp.get(b.id)!;
      da.dx -= dx;
      da.dy -= dy;
      db.dx += dx;
      db.dy += dy;
    }

    for (const p of pos) {
      const d = disp.get(p.id)!;
      const len = Math.hypot(d.dx, d.dy) || 0.01;
      const capped = Math.min(len, 40 * temp);
      p.x += (d.dx / len) * capped;
      p.y += (d.dy / len) * capped;
    }
  }

  const posMap = new Map(pos.map((p) => [p.id, p]));
  return nodes.map((n) => {
    const p = posMap.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
}

export type FkDragProposal = {
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
};

export type FkDragValidation =
  | { ok: true; proposal: FkDragProposal; sql: string }
  | { ok: false; reason: string };

export function validateCanvasFkDrag(
  tables: SchemaTable[],
  proposal: FkDragProposal,
): FkDragValidation {
  const owner = tables.find(
    (t) =>
      t.name === proposal.fromTable &&
      (t.schema ?? "main") === proposal.fromSchema,
  );
  const target = tables.find(
    (t) =>
      t.name === proposal.toTable &&
      (t.schema ?? "main") === proposal.toSchema,
  );
  if (!owner) {
    return { ok: false, reason: `Source table ${proposal.fromTable} not found` };
  }
  if (!target) {
    return {
      ok: false,
      reason: `Target table ${proposal.toSchema}.${proposal.toTable} not found`,
    };
  }
  if (
    proposal.fromSchema === proposal.toSchema &&
    proposal.fromTable === proposal.toTable
  ) {
    return { ok: false, reason: "Cannot create a foreign key to the same table via canvas drag" };
  }
  const fromCol = owner.columns.find((c) => c.name === proposal.fromColumn);
  if (!fromCol) {
    return { ok: false, reason: `Column ${proposal.fromColumn} not found on source` };
  }
  const toCol = target.columns.find((c) => c.name === proposal.toColumn);
  if (!toCol) {
    return {
      ok: false,
      reason: `Referenced column ${proposal.toColumn} not found on ${proposal.toTable}`,
    };
  }
  if (!toCol.pk) {
    return {
      ok: false,
      reason: `Referenced column ${proposal.toColumn} must be PRIMARY KEY`,
    };
  }
  const existing = (owner.foreignKeys ?? []).some(
    (fk) =>
      fk.columns.includes(proposal.fromColumn) &&
      fk.references.table === proposal.toTable &&
      (fk.references.schema || "main") === proposal.toSchema,
  );
  if (existing) {
    return { ok: false, reason: "This foreign key already exists" };
  }
  const sql = [
    `ALTER TABLE "${proposal.fromSchema}"."${proposal.fromTable}"`,
    `  ADD CONSTRAINT fk_${proposal.fromTable}_${proposal.fromColumn}`,
    `  FOREIGN KEY ("${proposal.fromColumn}")`,
    `  REFERENCES "${proposal.toSchema}"."${proposal.toTable}"("${proposal.toColumn}")`,
    `  ON DELETE NO ACTION ON UPDATE NO ACTION;`,
  ].join("\n");
  return { ok: true, proposal, sql };
}

export function previewFkSettingsPayload(proposal: FkDragProposal): Record<string, unknown> {
  return {
    foreignKey: {
      schema: proposal.toSchema,
      table: proposal.toTable,
      column: proposal.toColumn,
      onDelete: "no action",
      onUpdate: "no action",
    },
  };
}

export function localLayoutKey(projectSlug: string, schema: string): string {
  return `jord-erd-layout:v1:${projectSlug}:${schema}`;
}

export function readLocalLayout(
  projectSlug: string,
  schema: string,
): LayoutNodePersist[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localLayoutKey(projectSlug, schema));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as LayoutNodePersist[];
  } catch {
    return null;
  }
}

export function writeLocalLayout(
  projectSlug: string,
  schema: string,
  nodes: LayoutNodePersist[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      localLayoutKey(projectSlug, schema),
      JSON.stringify(nodes),
    );
  } catch {
    /* quota / private mode */
  }
}

export function buildErdSvgMarkup(
  nodes: ErdNode[],
  edges: { id: string; fromId: string; toId: string; cardinality: string; crossSchema: boolean }[],
  opts?: { padding?: number },
): string {
  const pad = opts?.padding ?? 32;
  if (nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"></svg>`;
  }
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
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edgeEls = edges
    .map((e) => {
      const from = byId.get(e.fromId);
      const to = byId.get(e.toId);
      if (!from || !to) return "";
      const d = orthogonalPath(from, to);
      const label = edgeLabelPoint(from, to);
      const dash = e.crossSchema ? ` stroke-dasharray="6 4"` : "";
      return [
        `<path d="${d}" fill="none" stroke="#64748b" stroke-width="1.5"${dash} />`,
        `<rect x="${label.x - 18}" y="${label.y - 9}" width="36" height="16" rx="4" fill="#fff" stroke="#cbd5e1" />`,
        `<text x="${label.x}" y="${label.y + 3}" text-anchor="middle" font-size="10" font-family="monospace" fill="#64748b">${escapeXml(e.cardinality)}</text>`,
      ].join("");
    })
    .join("");

  const nodeEls = nodes
    .map((n) => {
      const title = escapeXml(
        n.schema === "public" || n.schema === "main"
          ? n.table
          : `${n.schema}.${n.table}`,
      );
      const rows = n.columns
        .slice(0, 8)
        .map(
          (c, i) =>
            `<text x="${n.x + 10}" y="${n.y + 52 + i * 22}" font-size="11" font-family="monospace" fill="#0f172a">${escapeXml(c.name)} <tspan fill="#94a3b8">${escapeXml(c.type)}</tspan></text>`,
        )
        .join("");
      return [
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="8" fill="#fff" stroke="#cbd5e1" />`,
        `<rect x="${n.x}" y="${n.y}" width="${n.width}" height="36" rx="8" fill="#f1f5f9" stroke="#cbd5e1" />`,
        `<text x="${n.x + 10}" y="${n.y + 23}" font-size="13" font-family="system-ui,sans-serif" font-weight="600" fill="#0f172a">${title}</text>`,
        rows,
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`,
    `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#f8fafc" />`,
    edgeEls,
    nodeEls,
    `</svg>`,
  ].join("");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadSvgAsPng(
  svgMarkup: string,
  filename: string,
  scale = 2,
): Promise<void> {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(img.width * scale));
    canvas.height = Math.max(1, Math.floor(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unsupported");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to decode svg"));
    img.src = url;
  });
}

export function viewportWorldCenter(
  viewport: ErdViewport,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  return {
    x: (viewW / 2 - viewport.x) / viewport.zoom,
    y: (viewH / 2 - viewport.y) / viewport.zoom,
  };
}

export function makeErdNodeIdFromParts(schema: string, table: string): string {
  return makeErdNodeId(schema, table);
}
