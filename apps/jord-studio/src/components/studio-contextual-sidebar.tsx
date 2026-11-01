"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Skeleton, cn } from "@altr/apolyx";
import {
  GripHorizontal,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

import { StudioSidebar, useStudioPanes } from "@/components/studio-panes";
import {
  CONTEXTUAL_LABELS,
  type StudioContextual,
} from "@/lib/studio-nav";

type Props = {
  contextual: StudioContextual;
  className?: string;
  /** Persisted width in px; null → default desktop width. */
  width: number | null;
  /** Current collapsed state (shell owns persistence). */
  collapsed: boolean;
  /** Called when the drag handle changes the width. */
  onWidthChange: (width: number | null) => void;
  /** Called by the collapse toggle button. */
  onToggleCollapse: () => void;
};

export function StudioContextualSidebar({
  contextual,
  className,
  width,
  collapsed,
  onWidthChange,
  onToggleCollapse,
}: Props) {
  const { sidebarStatus, sidebarSlot, setSidebarStatus } = useStudioPanes();
  const label = CONTEXTUAL_LABELS[contextual];
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; width: number } | null>(null);

  const handleDragStart = useCallback(
    (clientX: number) => {
      const current = typeof window === "undefined" ? null : window.innerWidth;
      if (current == null) return;
      const container = document.getElementById("jord-sidebar");
      const layout = container?.getBoundingClientRect();
      const fallbackPx = width ?? parseFloat("20rem") * 16;
      const widthPx =
        layout && layout.width > 0 && layout.width < current
          ? layout.width
          : fallbackPx;
      startRef.current = { x: clientX, width: widthPx };
      setDragging(true);
      document.body.style.userSelect = "none";
    },
    [width],
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!startRef.current) return;
      const delta = startRef.current.x - clientX;
      const MIN_PX = parseFloat("12rem") * 16;
      const MAX_PX = parseFloat("30rem") * 16;
      const next = Math.max(
        MIN_PX,
        Math.min(startRef.current.width + delta, MAX_PX),
      );
      onWidthChange(next);
    },
    [onWidthChange],
  );

  const handleDragEnd = useCallback(() => {
    startRef.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onUp = () => handleDragEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleDragMove, handleDragEnd]);

  const show = !collapsed && sidebarStatus !== "loading" && sidebarStatus !== "empty";

  return (
    <StudioSidebar className={className}>
      <div className="flex h-full min-h-[12rem] flex-col gap-3 p-3">
        {/* Header + collapse + resize */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {collapsed ? (
              <PanelLeft className="shrink-0 size-4 text-muted-foreground" aria-hidden />
            ) : (
              <PanelLeftClose className="shrink-0 size-4 text-muted-foreground" aria-hidden />
            )}
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {show ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 -mr-1"
                aria-label="Collapse contextual sidebar"
                onClick={onToggleCollapse}
              >
                <PanelLeft className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0"
                aria-label="Expand contextual sidebar"
                onClick={onToggleCollapse}
              >
                <PanelLeftClose className="size-4" />
              </Button>
            )}
            {show && (
              <button
                type="button"
                className="shrink-0 cursor-ew-resize rounded border border-border bg-muted/40 hover:bg-muted p-0.5 transition-colors"
                aria-label="Resize contextual sidebar"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDragStart(e.clientX);
                }}
              >
                <GripHorizontal className="size-3 text-muted-foreground" aria-hidden />
              </button>
            )}
            {sidebarStatus === "error" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSidebarStatus("ready")}
              >
                Retry
              </Button>
            ) : null}
          </div>
        </div>

        {sidebarSlot ? (
          sidebarSlot
        ) : sidebarStatus === "loading" ? (
          <SidebarLoading />
        ) : sidebarStatus === "empty" ? (
          <SidebarEmpty label={label} />
        ) : sidebarStatus === "error" ? (
          <SidebarError label={label} />
        ) : collapsed ? (
          <CollapsedBlurb contextual={contextual} />
        ) : (
          <SidebarPlaceholder contextual={contextual} />
        )}
      </div>
    </StudioSidebar>
  );
}

function CollapsedBlurb({ contextual }: { contextual: StudioContextual }) {
  const blurb =
    contextual === "tables"
      ? "Schema picker, search, and table list"
      : contextual === "jobs"
        ? "Job list with status filters"
        : contextual === "endpoints"
          ? "Endpoints grouped by table and custom"
          : contextual === "queries"
            ? "Saved queries and history"
            : contextual === "users"
              ? "User list with search"
              : "Buckets";
  return (
    <div
      className="flex flex-1 flex-col justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center"
    >
      <p className="text-sm font-medium text-foreground">{blurb}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Expand to show the {CONTEXTUAL_LABELS[contextual].toLowerCase()} sidebar.
      </p>
    </div>
  );
}

function SidebarPlaceholder({
  contextual,
}: {
  contextual: StudioContextual;
}) {
  const blurb =
    contextual === "tables"
      ? "Schema picker, search, and table list"
      : contextual === "jobs"
        ? "Job list with status filters"
        : contextual === "endpoints"
          ? "Endpoints grouped by table and custom"
          : contextual === "queries"
            ? "Saved queries and history"
            : contextual === "users"
              ? "User list with search"
              : "Buckets";
  return (
    <div
      className="flex flex-1 flex-col justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center"
    >
      <p className="text-sm font-medium text-foreground">{blurb}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Wired in S0047 — this column is reserved.
      </p>
    </div>
  );
}

function SidebarLoading() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function SidebarEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-center">
      <p className="text-sm text-muted-foreground">No {label.toLowerCase()} yet</p>
    </div>
  );
}

function SidebarError({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-3 py-6 text-center">
      <p className="text-sm text-destructive">Could not load {label.toLowerCase()}</p>
    </div>
  );
}
