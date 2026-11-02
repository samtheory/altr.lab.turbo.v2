"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  cn,
  useReducedMotion,
} from "@altr/apolyx";
import { ChevronDown, X } from "lucide-react";

import { useProjectHref, useProjectSlug } from "@/hooks/use-project-path";
import {
  SCHEMA_ALL,
  fallbackDefaultSchema,
  loadSchemaPref,
} from "@/lib/studio-schema-prefs";
import {
  type TabKey,
  type WorkspaceTabState,
  type WorkspaceTabsSnapshot,
  closeTabInSnapshot,
  emptyTabState,
  isTabKey,
  loadTabsSnapshot,
  makeTabKey,
  mergeTabsSnapshot,
  moveTab,
  parseTabKey,
  parseTabsParam,
  pathKeyFromRoute,
  reorderTabs,
  saveTabsSnapshot,
  serializeTabsParam,
  tabLabel,
} from "@/lib/studio-workspace-tabs";

export type WorkspaceTabsApi = {
  enabled: boolean;
  ready: boolean;
  order: TabKey[];
  active: TabKey | null;
  defaultSchema: string;
  openTab: (input: { schema: string; table: string }) => void;
  focusTab: (key: TabKey) => void;
  closeTab: (key: TabKey) => void;
  closeOthers: (key: TabKey) => void;
  closeAll: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  getTabState: (key: TabKey) => WorkspaceTabState;
  patchTabState: (key: TabKey, patch: Partial<WorkspaceTabState>) => void;
};

const WorkspaceTabsContext = createContext<WorkspaceTabsApi | null>(null);

export function useWorkspaceTabs(): WorkspaceTabsApi {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) {
    throw new Error("useWorkspaceTabs must be used within WorkspaceTabsProvider");
  }
  return ctx;
}

export function useWorkspaceTabsOptional(): WorkspaceTabsApi | null {
  return useContext(WorkspaceTabsContext);
}

type ProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

/**
 * Owns open table tabs for the Data section. Mount when `contextual === "tables"`.
 */
export function WorkspaceTabsProvider({ enabled, children }: ProviderProps) {
  const projectSlug = useProjectSlug();
  const hrefFor = useProjectHref();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceTabsSnapshot>({
    order: [],
    active: null,
    states: {},
  });
  const [defaultSchema, setDefaultSchema] = useState("public");
  const skipNextUrlWrite = useRef(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const tableNameFromPath = useMemo(() => {
    const m = pathname.match(/^\/p\/[^/]+\/tables\/([^/]+)$/);
    if (!m?.[1]) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }, [pathname]);

  // Bootstrap from URL + localStorage once per project / enable.
  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const stored = loadTabsSnapshot(projectSlug);
    const pref = loadSchemaPref(projectSlug);
    const def = fallbackDefaultSchema(
      pref && pref !== SCHEMA_ALL ? [pref, "public", "main"] : ["public", "main"],
    );
    setDefaultSchema(def);

    const schemaParam = searchParams.get("schema");
    const pathKey = pathKeyFromRoute({
      tableName: tableNameFromPath,
      schemaParam,
      defaultSchema: def,
    });
    const merged = mergeTabsSnapshot({
      urlTabs: parseTabsParam(searchParams.get("tabs")),
      urlActive: searchParams.get("active"),
      stored,
      pathKey,
    });
    if (!cancelled) {
      setSnapshot(merged);
      setReady(true);
      skipNextUrlWrite.current = true;
    }
    return () => {
      cancelled = true;
    };
    // Intentionally once per project enable — URL sync effect handles later URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, projectSlug]);

  // Persist locally.
  useEffect(() => {
    if (!enabled || !ready) return;
    saveTabsSnapshot(projectSlug, snapshot);
  }, [enabled, ready, projectSlug, snapshot]);

  const navigateToSnapshot = useCallback(
    (next: WorkspaceTabsSnapshot, opts?: { replace?: boolean }) => {
      const sp = searchParamsRef.current;
      const q = sp.get("q");
      const filter = sp.get("filter");
      const schemaPicker = sp.get("schema");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filter) params.set("filter", filter);

      if (next.order.length === 0 || !next.active) {
        // Keep picker schema on the empty index.
        if (schemaPicker) params.set("schema", schemaPicker);
        const qs = params.toString();
        const href = hrefFor("/tables");
        const target = qs ? `${href}?${qs}` : href;
        if (opts?.replace) router.replace(target, { scroll: false });
        else router.push(target, { scroll: false });
        return;
      }

      const parsed = parseTabKey(next.active);
      if (!parsed) return;
      params.set("tabs", serializeTabsParam(next.order));
      params.set("active", next.active);
      if (parsed.schema !== defaultSchema) {
        params.set("schema", parsed.schema);
      } else if (schemaPicker === SCHEMA_ALL) {
        params.set("schema", SCHEMA_ALL);
      }
      const qs = params.toString();
      const href = hrefFor(`/tables/${encodeURIComponent(parsed.table)}`);
      const target = qs ? `${href}?${qs}` : href;
      if (opts?.replace) router.replace(target, { scroll: false });
      else router.push(target, { scroll: false });
    },
    [hrefFor, router, defaultSchema],
  );

  // Write URL when snapshot changes (after bootstrap).
  useEffect(() => {
    if (!enabled || !ready) return;
    if (skipNextUrlWrite.current) {
      skipNextUrlWrite.current = false;
      const urlTabs = parseTabsParam(searchParams.get("tabs"));
      const urlActive = searchParams.get("active");
      const needsAlign =
        snapshot.order.length > 0 &&
        (urlTabs.length === 0 ||
          urlActive !== snapshot.active ||
          serializeTabsParam(urlTabs) !== serializeTabsParam(snapshot.order));
      if (!needsAlign) return;
    }
    navigateToSnapshot(snapshot, { replace: true });
    // searchParams read only for the bootstrap align check — do not re-run on every query tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ready, snapshot, navigateToSnapshot]);

  const captureScroll = useCallback(() => {
    const key = snapshotRef.current.active;
    if (!key) return;
    const main = document.getElementById("main");
    const scrollY = main?.scrollTop ?? 0;
    setSnapshot((prev) => {
      const cur = prev.states[key] ?? emptyTabState();
      if (cur.scrollY === scrollY) return prev;
      return {
        ...prev,
        states: { ...prev.states, [key]: { ...cur, scrollY } },
      };
    });
  }, []);

  const openTab = useCallback(
    (input: { schema: string; table: string }) => {
      if (!enabled) return;
      captureScroll();
      let key: TabKey;
      try {
        key = makeTabKey(input.schema, input.table);
      } catch {
        return;
      }
      setSnapshot((prev) => {
        const order = prev.order.includes(key)
          ? prev.order
          : [...prev.order, key];
        const states = {
          ...prev.states,
          [key]: prev.states[key] ?? emptyTabState(),
        };
        return { order, active: key, states };
      });
    },
    [enabled, captureScroll],
  );

  const focusTab = useCallback(
    (key: TabKey) => {
      if (!enabled || !isTabKey(key)) return;
      captureScroll();
      setSnapshot((prev) => {
        if (!prev.order.includes(key)) return prev;
        if (prev.active === key) return prev;
        return { ...prev, active: key };
      });
    },
    [enabled, captureScroll],
  );

  const closeTab = useCallback(
    (key: TabKey) => {
      if (!enabled) return;
      captureScroll();
      setSnapshot((prev) => closeTabInSnapshot(prev, key));
    },
    [enabled, captureScroll],
  );

  const closeOthers = useCallback(
    (key: TabKey) => {
      if (!enabled || !isTabKey(key)) return;
      setSnapshot((prev) => {
        if (!prev.order.includes(key)) return prev;
        const states: Record<TabKey, WorkspaceTabState> = {
          [key]: prev.states[key] ?? emptyTabState(),
        };
        return { order: [key], active: key, states };
      });
    },
    [enabled],
  );

  const closeAll = useCallback(() => {
    if (!enabled) return;
    setSnapshot({ order: [], active: null, states: {} });
  }, [enabled]);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!enabled) return;
      setSnapshot((prev) => ({
        ...prev,
        order: reorderTabs(prev.order, fromIndex, toIndex),
      }));
    },
    [enabled],
  );

  const getTabState = useCallback(
    (key: TabKey) => snapshot.states[key] ?? emptyTabState(),
    [snapshot.states],
  );

  const patchTabState = useCallback((key: TabKey, patch: Partial<WorkspaceTabState>) => {
    setSnapshot((prev) => {
      const cur = prev.states[key] ?? emptyTabState();
      return {
        ...prev,
        states: { ...prev.states, [key]: { ...cur, ...patch } },
      };
    });
  }, []);

  // Keyboard: Ctrl/Cmd+W close; Alt+←/→ reorder active.
  useEffect(() => {
    if (!enabled || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "w" || e.key === "W")) {
        const active = snapshotRef.current.active;
        if (!active) return;
        e.preventDefault();
        closeTab(active);
        return;
      }
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const active = snapshotRef.current.active;
        if (!active) return;
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -1 : 1;
        setSnapshot((prev) => ({
          ...prev,
          order: moveTab(prev.order, active, delta),
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, ready, closeTab]);

  // Restore scroll when active tab changes.
  useLayoutEffect(() => {
    if (!enabled || !ready || !snapshot.active) return;
    const y = snapshot.states[snapshot.active]?.scrollY ?? 0;
    const main = document.getElementById("main");
    if (main) {
      requestAnimationFrame(() => {
        main.scrollTop = y;
      });
    }
  }, [enabled, ready, snapshot.active]); // eslint-disable-line react-hooks/exhaustive-deps -- restore on tab switch only

  const api = useMemo<WorkspaceTabsApi>(
    () => ({
      enabled,
      ready,
      order: snapshot.order,
      active: snapshot.active,
      defaultSchema,
      openTab,
      focusTab,
      closeTab,
      closeOthers,
      closeAll,
      reorder,
      getTabState,
      patchTabState,
    }),
    [
      enabled,
      ready,
      snapshot.order,
      snapshot.active,
      defaultSchema,
      openTab,
      focusTab,
      closeTab,
      closeOthers,
      closeAll,
      reorder,
      getTabState,
      patchTabState,
    ],
  );

  if (!enabled) return <>{children}</>;

  return (
    <WorkspaceTabsContext.Provider value={api}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
}

/** Tab strip above the content pane. */
export function WorkspaceTabsStrip({ className }: { className?: string }) {
  const tabs = useWorkspaceTabsOptional();
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const [overflowKeys, setOverflowKeys] = useState<TabKey[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!tabs?.ready || tabs.order.length === 0) {
      setOverflowKeys([]);
      return;
    }
    const el = listRef.current;
    if (!el) return;

    const measure = () => {
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-tab-key]"));
      const hidden: TabKey[] = [];
      const left = el.scrollLeft;
      const right = left + el.clientWidth;
      for (const child of children) {
        const key = child.dataset.tabKey;
        if (!key || !isTabKey(key)) continue;
        const cLeft = child.offsetLeft;
        const cRight = cLeft + child.offsetWidth;
        if (cLeft < left - 1 || cRight > right + 1) hidden.push(key);
      }
      setOverflowKeys(hidden);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [tabs?.ready, tabs?.order, tabs?.active]);

  if (!tabs || !tabs.enabled || !tabs.ready || tabs.order.length === 0) {
    return null;
  }

  const duration = reduced ? 0 : 0.12;

  return (
    <div
      data-slot="workspace-tabs"
      className={cn(
        "flex shrink-0 items-stretch gap-1 border-b border-border bg-muted/30 px-2 pt-1.5",
        className,
      )}
      style={{
        transition: reduced ? undefined : `opacity ${duration}s ease-out`,
      }}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label="Open tables"
        className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto scrollbar-none"
      >
        {tabs.order.map((key, index) => {
          const { title, schemaBadge } = tabLabel(key, tabs.defaultSchema);
          const selected = tabs.active === key;
          return (
            <div
              key={key}
              data-tab-key={key}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex == null) return;
                tabs.reorder(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group relative flex max-w-[14rem] shrink-0 items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1.5 text-sm",
                selected
                  ? "border-border bg-background text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-accent-hover/40 hover:text-foreground",
              )}
              style={{
                transition: reduced
                  ? undefined
                  : `background-color ${duration}s ease-out, color ${duration}s ease-out`,
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => tabs.focusTab(key)}
              >
                <span className="truncate font-mono text-xs">{title}</span>
                {schemaBadge ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 font-mono text-[9px]"
                  >
                    {schemaBadge}
                  </Badge>
                ) : null}
              </button>
              <button
                type="button"
                aria-label={`Close ${title}`}
                className={cn(
                  "rounded p-0.5 text-muted-foreground opacity-70 hover:bg-accent hover:text-foreground group-hover:opacity-100",
                  selected && "opacity-100",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  tabs.closeTab(key);
                }}
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-0.5 shrink-0"
            aria-label="Tab overflow menu"
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel>Open tabs</DropdownMenuLabel>
          {tabs.order.map((key) => {
            const { title, schemaBadge } = tabLabel(key, tabs.defaultSchema);
            const label = schemaBadge ? `${schemaBadge}.${title}` : title;
            return (
              <DropdownMenuItem
                key={key}
                onSelect={() => tabs.focusTab(key)}
              >
                <span className="font-mono text-xs">{label}</span>
                {overflowKeys.includes(key) ? (
                  <Badge variant="outline" className="ml-auto text-[9px]">
                    off-screen
                  </Badge>
                ) : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {tabs.active ? (
            <DropdownMenuItem onSelect={() => tabs.closeTab(tabs.active!)}>
              Close
              <DropdownMenuShortcut>⌘W</DropdownMenuShortcut>
            </DropdownMenuItem>
          ) : null}
          {tabs.active ? (
            <DropdownMenuItem onSelect={() => tabs.closeOthers(tabs.active!)}>
              Close others
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => tabs.closeAll()}>
            Close all
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
