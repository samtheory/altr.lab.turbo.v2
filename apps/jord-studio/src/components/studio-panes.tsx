"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FocusScope,
  Presence,
  cn,
  motion,
  useReducedMotion,
} from "@altr/apolyx";

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

type InspectorFrameProps = PaneProps & {
  /** Called for ESC / backdrop — prefer URL close via InspectorProvider. */
  onDismiss?: () => void;
  /** Links dialog to the panel title (InspectorPanelChrome). */
  labelledBy?: string;
};

/**
 * Right inspector frame — overlays content only (never the primary nav).
 * No layout shift / scroll lock on the page behind. S0048.
 */
export function StudioInspector({
  children,
  className,
  onDismiss,
  labelledBy,
}: InspectorFrameProps) {
  const { inspectorOpen, setInspectorOpen } = useStudioPanes();
  const reduced = useReducedMotion();
  const fallbackLabelId = useId();

  const dismiss = useCallback(() => {
    if (onDismiss) onDismiss();
    else setInspectorOpen(false);
  }, [onDismiss, setInspectorOpen]);

  useEffect(() => {
    if (!inspectorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectorOpen, dismiss]);

  return (
    <Presence present={inspectorOpen}>
      {({ present }) => (
        <div
          data-slot="studio-inspector-layer"
          className="pointer-events-none absolute inset-0 z-20 flex justify-end"
          hidden={!present && !inspectorOpen}
        >
          <motion.button
            type="button"
            aria-label="Close inspector"
            className="pointer-events-auto absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: present && inspectorOpen ? 1 : 0 }}
            transition={{ duration: reduced ? 0.12 : 0.18 }}
            onClick={dismiss}
          />
          <FocusScope>
            <motion.aside
              id="jord-inspector"
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy ?? fallbackLabelId}
              tabIndex={-1}
              data-state={inspectorOpen && present ? "open" : "closed"}
              className={cn(
                /* 420–520px band */
                "pointer-events-auto relative flex h-full w-[min(100%,30rem)] min-w-[min(100%,26.25rem)] shrink-0 flex-col border-l border-border bg-background shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className,
              )}
              initial={reduced ? { opacity: 0 } : { opacity: 1, x: "100%" }}
              animate={
                inspectorOpen && present
                  ? { opacity: 1, x: "0%" }
                  : reduced
                    ? { opacity: 0 }
                    : { opacity: 1, x: "100%" }
              }
              transition={
                reduced
                  ? { duration: 0.12 }
                  : { duration: 0.18, ease: [0.45, 0, 0.55, 1] }
              }
            >
              <span id={fallbackLabelId} className="sr-only">
                Inspector
              </span>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </motion.aside>
          </FocusScope>
        </div>
      )}
    </Presence>
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
