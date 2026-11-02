"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  cn,
  useReducedMotion,
} from "@altr/apolyx";

import type { SchemaTable } from "@/lib/schema";
import {
  applyGuidesToDelta,
  buildErdGraph,
  clampZoom,
  computeAlignmentGuides,
  edgeLabelPoint,
  ERD_DEFAULT_ZOOM,
  ERD_GRID_SIZE,
  ERD_MAX_VISIBLE_COLS,
  fitViewport,
  hitTestNode,
  moveNodes,
  nodesBounds,
  nodesInRect,
  orthogonalPath,
  panBy,
  qualifyTable,
  screenToWorld,
  type AlignmentGuide,
  type ErdEdge,
  type ErdNode,
  type ErdViewport,
  zoomAtScreenPoint,
} from "@/lib/studio-erd-canvas";

type Props = {
  tables: SchemaTable[];
  /** Currently highlighted table name (optional). */
  selectedTable?: string | null;
  onSelectTable?: (table: string, schema: string) => void;
};

type DragMode =
  | { kind: "pan"; lastX: number; lastY: number }
  | {
      kind: "nodes";
      ids: Set<string>;
      originX: number;
      originY: number;
      startNodes: ErdNode[];
    }
  | {
      kind: "marquee";
      startX: number;
      startY: number;
      curX: number;
      curY: number;
      additive: boolean;
    };

const ZOOM_STEP = 1.15;
const KEY_PAN = 40;

function GridBackground({
  viewport,
  snap,
}: {
  viewport: ErdViewport;
  snap: boolean;
}) {
  const size = ERD_GRID_SIZE * viewport.zoom;
  const ox = ((viewport.x % size) + size) % size;
  const oy = ((viewport.y % size) + size) % size;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        snap ? "opacity-70" : "opacity-40",
      )}
      style={{
        backgroundImage: `
          linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    />
  );
}

function TableCard({
  node,
  selected,
  hovered,
  reduced,
  onPointerDown,
}: {
  node: ErdNode;
  selected: boolean;
  hovered: boolean;
  reduced: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
}) {
  const visible = node.columns.slice(0, ERD_MAX_VISIBLE_COLS);
  const overflow = node.columns.length - visible.length;
  return (
    <article
      role="button"
      tabIndex={-1}
      data-erd-node={node.id}
      onPointerDown={onPointerDown}
      className={cn(
        "absolute select-none overflow-hidden rounded-lg border bg-card text-left shadow-sm outline-none",
        selected
          ? "border-ring ring-2 ring-ring/40"
          : hovered
            ? "border-foreground/30"
            : "border-border",
        !reduced && "transition-[box-shadow,border-color] duration-150",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      aria-label={`Table ${qualifyTable(node.schema, node.table)}`}
      aria-pressed={selected}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-2.5 py-2">
        <h3 className="truncate font-display text-sm font-semibold text-foreground">
          {qualifyTable(node.schema, node.table)}
        </h3>
        <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
          {node.columns.length}
        </Badge>
      </header>
      <ul className="px-2 py-1 font-mono text-[11px]">
        {visible.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-2 border-t border-border/50 py-1 first:border-t-0"
          >
            <span className="flex min-w-0 items-center gap-1 truncate text-foreground">
              {c.kind === "pk" || c.kind === "both" ? (
                <Badge variant="secondary" className="px-1 text-[9px]">
                  pk
                </Badge>
              ) : null}
              {c.kind === "fk" || c.kind === "both" ? (
                <Badge variant="outline" className="px-1 text-[9px]">
                  fk
                </Badge>
              ) : null}
              <span className="truncate">{c.name}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{c.type}</span>
          </li>
        ))}
        {overflow > 0 ? (
          <li className="border-t border-border/50 py-1 text-muted-foreground">
            +{overflow} more
          </li>
        ) : null}
      </ul>
    </article>
  );
}

function EdgesLayer({
  nodes,
  edges,
  selectedIds,
}: {
  nodes: ErdNode[];
  edges: ErdEdge[];
  selectedIds: ReadonlySet<string>;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const bounds = nodesBounds(nodes, 200) ?? {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 1000,
  };
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);

  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: bounds.minX, top: bounds.minY, width: w, height: h }}
      viewBox={`${bounds.minX} ${bounds.minY} ${w} ${h}`}
      aria-hidden
    >
      {edges.map((edge) => {
        const from = byId.get(edge.fromId);
        const to = byId.get(edge.toId);
        if (!from || !to) return null;
        const active =
          selectedIds.has(edge.fromId) || selectedIds.has(edge.toId);
        const d = orthogonalPath(from, to);
        const label = edgeLabelPoint(from, to);
        return (
          <g key={edge.id}>
            <path
              d={d}
              fill="none"
              stroke={
                active
                  ? "var(--ring)"
                  : edge.crossSchema
                    ? "color-mix(in oklab, var(--muted-foreground) 80%, transparent)"
                    : "var(--muted-foreground)"
              }
              strokeWidth={active ? 2.25 : 1.5}
              strokeDasharray={edge.crossSchema ? "6 4" : undefined}
              opacity={active ? 1 : 0.75}
            />
            <rect
              x={label.x - 18}
              y={label.y - 9}
              width={36}
              height={16}
              rx={4}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y + 3}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }}
            >
              {edge.cardinality}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GuidesLayer({ guides, bounds }: { guides: AlignmentGuide[]; bounds: ReturnType<typeof nodesBounds> }) {
  if (!bounds || guides.length === 0) return null;
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: bounds.minX, top: bounds.minY, width: w, height: h }}
      viewBox={`${bounds.minX} ${bounds.minY} ${w} ${h}`}
      aria-hidden
    >
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <line
            key={`gx-${i}-${g.value}`}
            x1={g.value}
            y1={bounds.minY}
            x2={g.value}
            y2={bounds.maxY}
            stroke="var(--ring)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ) : (
          <line
            key={`gy-${i}-${g.value}`}
            x1={bounds.minX}
            y1={g.value}
            x2={bounds.maxX}
            y2={g.value}
            stroke="var(--ring)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ),
      )}
    </svg>
  );
}

export function ErdCanvas({ tables, selectedTable, onSelectTable }: Props) {
  const reduced = useReducedMotion();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ErdViewport>({
    x: 40,
    y: 40,
    zoom: ERD_DEFAULT_ZOOM,
  });
  const [nodes, setNodes] = useState<ErdNode[]>([]);
  const [edges, setEdges] = useState<ErdEdge[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const fittedOnce = useRef(false);

  useEffect(() => {
    const graph = buildErdGraph(tables);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedIds(new Set());
    setGuides([]);
    fittedOnce.current = false;
  }, [tables]);

  const fit = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setViewport(fitViewport(nodes, width, height, 56));
  }, [nodes]);

  useEffect(() => {
    if (fittedOnce.current || nodes.length === 0) return;
    const el = surfaceRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width < 40 || height < 40) return;
    setViewport(fitViewport(nodes, width, height, 56));
    fittedOnce.current = true;
  }, [nodes]);

  useEffect(() => {
    if (!selectedTable || nodes.length === 0) return;
    const match = nodes.find((n) => n.table === selectedTable);
    if (!match) return;
    setSelectedIds(new Set([match.id]));
  }, [selectedTable, nodes]);

  const zoomBy = useCallback((factor: number) => {
    const el = surfaceRef.current;
    if (!el) {
      setViewport((v) => ({ ...v, zoom: clampZoom(v.zoom * factor) }));
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setViewport((v) => zoomAtScreenPoint(v, cx, cy, v.zoom * factor));
  }, []);

  const jumpTo = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      const el = surfaceRef.current;
      if (!node || !el) return;
      const { width, height } = el.getBoundingClientRect();
      setSelectedIds(new Set([nodeId]));
      setViewport((v) => ({
        ...v,
        x: width / 2 - (node.x + node.width / 2) * v.zoom,
        y: height / 2 - (node.y + node.height / 2) * v.zoom,
      }));
      onSelectTable?.(node.table, node.schema);
    },
    [nodes, onSelectTable],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        setSpaceDown(true);
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setDrag(null);
        setGuides([]);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(1 / ZOOM_STEP);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fit();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setViewport((v) => panBy(v, KEY_PAN, 0));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setViewport((v) => panBy(v, -KEY_PAN, 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setViewport((v) => panBy(v, 0, KEY_PAN));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setViewport((v) => panBy(v, 0, -KEY_PAN));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fit, zoomBy]);

  const clientToLocal = useCallback((clientX: number, clientY: number) => {
    const el = surfaceRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const local = clientToLocal(e.clientX, e.clientY);
    // Shift+wheel or dominant deltaX → pan; otherwise wheel zooms toward cursor.
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setViewport((v) => panBy(v, -e.deltaX - (e.shiftKey ? e.deltaY : 0), -e.deltaY));
      return;
    }
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    setViewport((v) =>
      zoomAtScreenPoint(v, local.x, local.y, v.zoom * factor),
    );
  }, [clientToLocal]);

  const onSurfacePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button === 1 || spaceDown || e.button === 2) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ kind: "pan", lastX: e.clientX, lastY: e.clientY });
        return;
      }
      if (e.button !== 0) return;
      // Empty canvas → marquee or clear.
      if ((e.target as HTMLElement).dataset.erdNode) return;
      const local = clientToLocal(e.clientX, e.clientY);
      const world = screenToWorld(local.x, local.y, viewport);
      const hit = hitTestNode(nodes, world.x, world.y);
      if (hit) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        kind: "marquee",
        startX: world.x,
        startY: world.y,
        curX: world.x,
        curY: world.y,
        additive: e.shiftKey,
      });
      if (!e.shiftKey) setSelectedIds(new Set());
    },
    [clientToLocal, nodes, spaceDown, viewport],
  );

  const onNodePointerDown = useCallback(
    (node: ErdNode) => (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || spaceDown) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const local = clientToLocal(e.clientX, e.clientY);
      let nextSelected: Set<string>;
      if (e.shiftKey) {
        nextSelected = new Set(selectedIds);
        if (nextSelected.has(node.id)) nextSelected.delete(node.id);
        else nextSelected.add(node.id);
      } else if (selectedIds.has(node.id) && selectedIds.size > 1) {
        nextSelected = selectedIds;
      } else {
        nextSelected = new Set([node.id]);
      }
      setSelectedIds(nextSelected);
      onSelectTable?.(node.table, node.schema);
      setDrag({
        kind: "nodes",
        ids: nextSelected.has(node.id)
          ? nextSelected
          : new Set([node.id]),
        originX: local.x,
        originY: local.y,
        startNodes: nodes,
      });
    },
    [clientToLocal, nodes, onSelectTable, selectedIds, spaceDown],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag) {
        const local = clientToLocal(e.clientX, e.clientY);
        const world = screenToWorld(local.x, local.y, viewport);
        const hit = hitTestNode(nodes, world.x, world.y);
        setHoveredId(hit?.id ?? null);
        return;
      }
      if (drag.kind === "pan") {
        setViewport((v) =>
          panBy(v, e.clientX - drag.lastX, e.clientY - drag.lastY),
        );
        setDrag({ kind: "pan", lastX: e.clientX, lastY: e.clientY });
        return;
      }
      if (drag.kind === "marquee") {
        const local = clientToLocal(e.clientX, e.clientY);
        const world = screenToWorld(local.x, local.y, viewport);
        setDrag({ ...drag, curX: world.x, curY: world.y });
        return;
      }
      if (drag.kind === "nodes") {
        const local = clientToLocal(e.clientX, e.clientY);
        let dx = (local.x - drag.originX) / viewport.zoom;
        let dy = (local.y - drag.originY) / viewport.zoom;
        const movingStart = drag.startNodes.filter((n) => drag.ids.has(n.id));
        const others = drag.startNodes.filter((n) => !drag.ids.has(n.id));
        const proposed = movingStart.map((n) => ({
          ...n,
          x: n.x + dx,
          y: n.y + dy,
        }));
        const nextGuides = computeAlignmentGuides(proposed, others);
        const adjusted = applyGuidesToDelta(dx, dy, movingStart, nextGuides);
        dx = adjusted.dx;
        dy = adjusted.dy;
        setGuides(nextGuides);
        setNodes(moveNodes(drag.startNodes, drag.ids, dx, dy, false));
      }
    },
    [clientToLocal, drag, nodes, viewport],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      if (drag.kind === "marquee") {
        const hits = nodesInRect(
          nodes,
          drag.startX,
          drag.startY,
          drag.curX,
          drag.curY,
        );
        setSelectedIds((prev) => {
          const next = drag.additive ? new Set(prev) : new Set<string>();
          for (const n of hits) next.add(n.id);
          return next;
        });
      }
      if (drag.kind === "nodes" && snap) {
        setNodes((curr) => moveNodes(curr, drag.ids, 0, 0, true));
      }
      setGuides([]);
      setDrag(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    [drag, nodes, snap],
  );

  if (tables.length === 0) {
    return (
      <Alert variant="info">
        <AlertTitle>No tables in this schema</AlertTitle>
        <AlertDescription>
          Create a table in the Browser view, then open the ERD canvas again.
        </AlertDescription>
      </Alert>
    );
  }

  const marquee =
    drag?.kind === "marquee"
      ? {
          x: Math.min(drag.startX, drag.curX),
          y: Math.min(drag.startY, drag.curY),
          w: Math.abs(drag.curX - drag.startX),
          h: Math.abs(drag.curY - drag.startY),
        }
      : null;

  const worldBounds = nodesBounds(nodes, 80);

  return (
    <div className="flex min-h-[min(70vh,720px)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          −
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(ZOOM_STEP)}>
          +
        </Button>
        <Badge variant="secondary" className="font-mono tabular-nums">
          {Math.round(viewport.zoom * 100)}%
        </Badge>
        <Button type="button" size="sm" variant="outline" onClick={fit}>
          Fit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={snap ? "default" : "outline"}
          onClick={() => setSnap((s) => !s)}
          aria-pressed={snap}
        >
          Snap
        </Button>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Jump
          <select
            className="h-8 max-w-[14rem] rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) jumpTo(e.target.value);
              e.target.value = "";
            }}
            aria-label="Jump to table"
          >
            <option value="">Select table…</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {qualifyTable(n.schema, n.table)}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[11px] text-muted-foreground">
          {nodes.length} tables · {edges.length} relations · arrows pan · +/− zoom · F fit
        </span>
      </div>

      <div
        ref={surfaceRef}
        role="application"
        aria-label="Schema ERD canvas"
        tabIndex={0}
        className={cn(
          "relative min-h-[min(64vh,640px)] flex-1 overflow-hidden rounded-xl border border-border bg-muted/15 outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          spaceDown || drag?.kind === "pan" ? "cursor-grab" : "cursor-default",
          drag?.kind === "pan" && "cursor-grabbing",
        )}
        onWheel={onWheel}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <GridBackground viewport={viewport} snap={snap} />
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transition:
              reduced || drag ? undefined : "transform 120ms ease-out",
          }}
        >
          <EdgesLayer nodes={nodes} edges={edges} selectedIds={selectedIds} />
          <GuidesLayer guides={guides} bounds={worldBounds} />
          {nodes.map((node) => (
            <TableCard
              key={node.id}
              node={node}
              selected={selectedIds.has(node.id)}
              hovered={hoveredId === node.id}
              reduced={Boolean(reduced)}
              onPointerDown={onNodePointerDown(node)}
            />
          ))}
          {marquee ? (
            <div
              className="pointer-events-none absolute border border-ring/70 bg-ring/10"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.w,
                height: marquee.h,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
