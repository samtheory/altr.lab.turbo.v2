"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@altr/apolyx";

import type { StudioContextual } from "@/lib/studio-nav";

export type SidebarPaneStatus = "ready" | "loading" | "empty" | "error";

export type StudioPanesValue = {
  contextual: StudioContextual | null;
  sidebarStatus: SidebarPaneStatus;
  setSidebarStatus: (status: SidebarPaneStatus) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  /** Optional page-provided sidebar body (S0047); null → shell placeholder. */
  sidebarSlot: ReactNode | null;
  setSidebarSlot: (node: ReactNode | null) => void;
  /** Optional page-provided inspector body (S0048). */
  inspectorSlot: ReactNode | null;
  setInspectorSlot: (node: ReactNode | null) => void;
};

const StudioPanesContext = createContext<StudioPanesValue | null>(null);

export function StudioPanesProvider({
  contextual,
  children,
}: {
  contextual: StudioContextual | null;
  children: ReactNode;
}) {
  const [sidebarStatus, setSidebarStatus] =
    useState<SidebarPaneStatus>("ready");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sidebarSlot, setSidebarSlot] = useState<ReactNode | null>(null);
  const [inspectorSlot, setInspectorSlot] = useState<ReactNode | null>(null);

  const value = useMemo<StudioPanesValue>(
    () => ({
      contextual,
      sidebarStatus,
      setSidebarStatus,
      inspectorOpen,
      setInspectorOpen,
      sidebarSlot,
      setSidebarSlot,
      inspectorSlot,
      setInspectorSlot,
    }),
    [contextual, sidebarStatus, inspectorOpen, sidebarSlot, inspectorSlot],
  );

  return (
    <StudioPanesContext.Provider value={value}>
      {children}
    </StudioPanesContext.Provider>
  );
}

export function useStudioPanes(): StudioPanesValue {
  const ctx = useContext(StudioPanesContext);
  if (!ctx) {
    throw new Error("useStudioPanes must be used within StudioPanesProvider");
  }
  return ctx;
}

/** Optional hook for surfaces outside the shell (login) — returns null. */
export function useStudioPanesOptional(): StudioPanesValue | null {
  return useContext(StudioPanesContext);
}

type PaneProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Contextual sidebar scroll region. Pages (S0047) mount content via
 * `useRegisterStudioSidebar` or compose children directly.
 */
export function StudioSidebar({ children, className }: PaneProps) {
  return (
    <div
      id="jord-sidebar"
      data-slot="studio-sidebar"
      tabIndex={-1}
      className={cn(
        "flex h-full min-h-0 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

/** Main content scroll container — keeps scroll while inspector overlays. */
export function StudioContent({ children, className }: PaneProps) {
  return (
    <main
      id="main"
      data-slot="studio-content"
      tabIndex={-1}
      className={cn(
        "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Right inspector frame — overlays content; no width reflow when opened. */
export function StudioInspector({ children, className }: PaneProps) {
  const { inspectorOpen, setInspectorOpen } = useStudioPanes();

  const onBackdrop = useCallback(() => {
    setInspectorOpen(false);
  }, [setInspectorOpen]);

  useEffect(() => {
    if (!inspectorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectorOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectorOpen, setInspectorOpen]);

  if (!inspectorOpen) return null;

  return (
    <div
      data-slot="studio-inspector-layer"
      className="pointer-events-none absolute inset-0 z-20 flex justify-end"
    >
      <button
        type="button"
        aria-label="Close inspector"
        className="pointer-events-auto absolute inset-0 bg-background/40 backdrop-blur-sm"
        onClick={onBackdrop}
      />
      <aside
        id="jord-inspector"
        role="dialog"
        aria-modal="true"
        aria-label="Inspector"
        tabIndex={-1}
        className={cn(
          "pointer-events-auto relative flex h-full w-[min(100%,24rem)] shrink-0 flex-col border-l border-border bg-background shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {children}
        </div>
      </aside>
    </div>
  );
}

/** Register sidebar body from a page; clears on unmount (S0047). */
export function useRegisterStudioSidebar(node: ReactNode | null): void {
  const panes = useStudioPanesOptional();
  useEffect(() => {
    if (!panes) return;
    panes.setSidebarSlot(node);
    return () => panes.setSidebarSlot(null);
  }, [panes, node]);
}
