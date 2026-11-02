/**
 * Per-project workspace tabs for the Tables section (S0051).
 *
 * Tab keys are always `schema.table` so `public.users` and `auth.users` never collide.
 * URL contract (documented in tech_space/studio):
 *   `?tabs=public.users,auth.users&active=public.users`
 * Path `/tables/[name]` mirrors the active table name for deep links; `schema` stays
 * in the query when it is not the dialect default.
 */

const VERSION = "v1";

export type TabKey = string;

export type WorkspaceTabFilter = {
  id: string;
  columnId: string;
  operator: string;
  value?: string | number | boolean | null;
  valueTo?: string | number | null;
};

export type WorkspaceTabState = {
  /** Row page offset for the table browser. */
  offset: number;
  /** Scroll position of `#main` when the tab was last active. */
  scrollY: number;
  /**
   * Active grid filters (S0056). Legacy `Record<string,string>` snapshots
   * are ignored and start empty.
   */
  filters: WorkspaceTabFilter[];
  columnOrder: string[] | null;
  columnWidths: Record<string, number> | null;
  hiddenColumns: string[] | null;
  pinnedColumns: Record<string, "left" | "right"> | null;
  sort: { columnId: string; direction: "asc" | "desc" } | null;
  quickSearch: string;
  /** Named view id currently applied (from table-views store). */
  activeViewId: string | null;
  /** Optional inspector deep-link fragment for this tab. */
  inspector: string | null;
};

export type WorkspaceTabsSnapshot = {
  order: TabKey[];
  active: TabKey | null;
  states: Record<TabKey, WorkspaceTabState>;
};

const DEFAULT_STATE: WorkspaceTabState = {
  offset: 0,
  scrollY: 0,
  filters: [],
  columnOrder: null,
  columnWidths: null,
  hiddenColumns: null,
  pinnedColumns: null,
  sort: null,
  quickSearch: "",
  activeViewId: null,
  inspector: null,
};

export function emptyTabState(): WorkspaceTabState {
  return {
    ...DEFAULT_STATE,
    filters: [],
    pinnedColumns: null,
    hiddenColumns: null,
  };
}

function parseTabFilters(raw: unknown): WorkspaceTabFilter[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkspaceTabFilter[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const v = item as Partial<WorkspaceTabFilter>;
    if (typeof v.id !== "string" || typeof v.columnId !== "string") continue;
    if (typeof v.operator !== "string") continue;
    out.push({
      id: v.id,
      columnId: v.columnId,
      operator: v.operator,
      value: v.value ?? "",
      valueTo: v.valueTo ?? null,
    });
  }
  return out;
}

function storageKey(projectSlug: string): string {
  return `jord.studio.tabs:${VERSION}:${projectSlug}`;
}

/** `schema.table` — schema and table are non-empty, no dots inside either segment. */
const TAB_KEY_RE = /^([^.]+)\.([^.]+)$/;

export function isTabKey(value: string): value is TabKey {
  return TAB_KEY_RE.test(value);
}

export function makeTabKey(schema: string, table: string): TabKey {
  const s = schema.trim();
  const t = table.trim();
  if (!s || !t || s.includes(".") || t.includes(".")) {
    throw new Error(`Invalid tab key parts: schema=${schema} table=${table}`);
  }
  return `${s}.${t}`;
}

export function parseTabKey(key: TabKey): { schema: string; table: string } | null {
  const m = TAB_KEY_RE.exec(key);
  if (!m) return null;
  return { schema: m[1]!, table: m[2]! };
}

export function tabLabel(
  key: TabKey,
  defaultSchema: string,
): { title: string; schemaBadge: string | null } {
  const parsed = parseTabKey(key);
  if (!parsed) return { title: key, schemaBadge: null };
  if (parsed.schema === defaultSchema) {
    return { title: parsed.table, schemaBadge: null };
  }
  return { title: parsed.table, schemaBadge: parsed.schema };
}

export function parseTabsParam(raw: string | null): TabKey[] {
  if (!raw || raw.trim() === "") return [];
  const out: TabKey[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const key = part.trim();
    if (!isTabKey(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function serializeTabsParam(order: TabKey[]): string {
  return order.filter(isTabKey).join(",");
}

export function resolveActive(
  order: TabKey[],
  preferred: string | null,
): TabKey | null {
  if (order.length === 0) return null;
  if (preferred && order.includes(preferred)) return preferred;
  return order[0] ?? null;
}

/** Merge URL + stored snapshot. URL wins for order/active when present. */
export function mergeTabsSnapshot(input: {
  urlTabs: TabKey[];
  urlActive: string | null;
  stored: WorkspaceTabsSnapshot | null;
  /** Deep-link from `/tables/[name]` (+ optional schema). */
  pathKey: TabKey | null;
}): WorkspaceTabsSnapshot {
  let order =
    input.urlTabs.length > 0
      ? [...input.urlTabs]
      : input.stored
        ? [...input.stored.order]
        : [];
  const states: Record<TabKey, WorkspaceTabState> = {
    ...(input.stored?.states ?? {}),
  };

  if (input.pathKey && isTabKey(input.pathKey)) {
    if (!order.includes(input.pathKey)) order.push(input.pathKey);
  }

  order = order.filter(isTabKey);
  for (const key of order) {
    if (!states[key]) states[key] = emptyTabState();
  }

  const preferred =
    input.urlActive ??
    input.pathKey ??
    input.stored?.active ??
    null;
  const active = resolveActive(order, preferred);

  return { order, active, states };
}

export function loadTabsSnapshot(
  projectSlug: string,
): WorkspaceTabsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(projectSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceTabsSnapshot>;
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((k): k is TabKey => typeof k === "string" && isTabKey(k))
      : [];
    const states: Record<TabKey, WorkspaceTabState> = {};
    if (parsed.states && typeof parsed.states === "object") {
      for (const [key, value] of Object.entries(parsed.states)) {
        if (!isTabKey(key) || !value || typeof value !== "object") continue;
        const v = value as Partial<WorkspaceTabState>;
        states[key] = {
          offset: typeof v.offset === "number" && v.offset >= 0 ? v.offset : 0,
          scrollY: typeof v.scrollY === "number" && v.scrollY >= 0 ? v.scrollY : 0,
          filters: parseTabFilters(v.filters),
          columnOrder: Array.isArray(v.columnOrder)
            ? v.columnOrder.filter((c): c is string => typeof c === "string")
            : null,
          columnWidths:
            v.columnWidths && typeof v.columnWidths === "object"
              ? { ...(v.columnWidths as Record<string, number>) }
              : null,
          hiddenColumns: Array.isArray(v.hiddenColumns)
            ? v.hiddenColumns.filter((c): c is string => typeof c === "string")
            : null,
          pinnedColumns:
            v.pinnedColumns && typeof v.pinnedColumns === "object"
              ? Object.fromEntries(
                  Object.entries(
                    v.pinnedColumns as Record<string, unknown>,
                  ).flatMap(([k, pin]) =>
                    pin === "left" || pin === "right" ? [[k, pin] as const] : [],
                  ),
                )
              : null,
          sort:
            v.sort &&
            typeof v.sort === "object" &&
            typeof (v.sort as { columnId?: unknown }).columnId === "string" &&
            ((v.sort as { direction?: unknown }).direction === "asc" ||
              (v.sort as { direction?: unknown }).direction === "desc")
              ? {
                  columnId: (v.sort as { columnId: string }).columnId,
                  direction: (v.sort as { direction: "asc" | "desc" })
                    .direction,
                }
              : null,
          quickSearch:
            typeof v.quickSearch === "string" ? v.quickSearch : "",
          activeViewId:
            typeof v.activeViewId === "string" ? v.activeViewId : null,
          inspector: typeof v.inspector === "string" ? v.inspector : null,
        };
      }
    }
    const active =
      typeof parsed.active === "string" && order.includes(parsed.active)
        ? parsed.active
        : resolveActive(order, null);
    return { order, active, states };
  } catch {
    return null;
  }
}

export function saveTabsSnapshot(
  projectSlug: string,
  snapshot: WorkspaceTabsSnapshot,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(projectSlug), JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function closeTabInSnapshot(
  snapshot: WorkspaceTabsSnapshot,
  key: TabKey,
): WorkspaceTabsSnapshot {
  const idx = snapshot.order.indexOf(key);
  if (idx < 0) return snapshot;
  const order = snapshot.order.filter((k) => k !== key);
  const states = { ...snapshot.states };
  delete states[key];
  let active = snapshot.active;
  if (active === key) {
    active = order[idx] ?? order[idx - 1] ?? order[0] ?? null;
  }
  return { order, active, states };
}

export function reorderTabs(
  order: TabKey[],
  fromIndex: number,
  toIndex: number,
): TabKey[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return order;
  next.splice(toIndex, 0, item);
  return next;
}

export function moveTab(
  order: TabKey[],
  key: TabKey,
  delta: -1 | 1,
): TabKey[] {
  const idx = order.indexOf(key);
  if (idx < 0) return order;
  return reorderTabs(order, idx, idx + delta);
}

export function pathKeyFromRoute(input: {
  tableName: string | null;
  schemaParam: string | null;
  defaultSchema: string;
}): TabKey | null {
  if (!input.tableName || input.tableName === "") return null;
  const schema =
    input.schemaParam &&
    input.schemaParam !== "" &&
    input.schemaParam !== "all"
      ? input.schemaParam
      : input.defaultSchema;
  try {
    return makeTabKey(schema, input.tableName);
  } catch {
    return null;
  }
}
