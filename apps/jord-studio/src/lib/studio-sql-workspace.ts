/**
 * SQL workspace tabs + persistence (S0064).
 *
 * Pure helpers — no React. Tabs live in localStorage per project. Dirty means
 * the editor text differs from the last saved or executed snapshot (`baseline`).
 * Opening a saved query or history entry creates a **new** tab (documented).
 */

export const SQL_TABS_PREFIX = "jord.studio.sql.tabs:v1:";

export type SqlQueryTab = {
  id: string;
  title: string;
  sql: string;
  /** Last saved/executed snapshot. Dirty when `sql !== baseline`. */
  baseline: string;
  savedQueryId: string | null;
};

export type SqlWorkspaceSnapshot = {
  order: string[];
  active: string | null;
  tabs: Record<string, SqlQueryTab>;
};

export const DEFAULT_SQL_TAB_SQL = "SELECT 1 AS n;";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function sqlTabsKey(projectSlug: string): string {
  return `${SQL_TABS_PREFIX}${projectSlug}`;
}

export function createTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultTabTitle(index: number): string {
  return `Query ${index}`;
}

export function truncateTitle(sql: string, max = 28): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Untitled";
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}

export function isTabDirty(tab: SqlQueryTab): boolean {
  return tab.sql !== tab.baseline;
}

export function emptyWorkspace(): SqlWorkspaceSnapshot {
  const id = createTabId();
  const tab: SqlQueryTab = {
    id,
    title: defaultTabTitle(1),
    sql: DEFAULT_SQL_TAB_SQL,
    baseline: DEFAULT_SQL_TAB_SQL,
    savedQueryId: null,
  };
  return { order: [id], active: id, tabs: { [id]: tab } };
}

function parseTab(raw: unknown): SqlQueryTab | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : null;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const sql = typeof row.sql === "string" ? row.sql : null;
  const baseline = typeof row.baseline === "string" ? row.baseline : sql;
  if (!id || sql == null || baseline == null) return null;
  return {
    id,
    title: title || "Untitled",
    sql,
    baseline,
    savedQueryId:
      typeof row.savedQueryId === "string" && row.savedQueryId
        ? row.savedQueryId
        : null,
  };
}

export function parseWorkspaceSnapshot(raw: unknown): SqlWorkspaceSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!Array.isArray(row.order)) return null;
  const tabsRaw =
    row.tabs && typeof row.tabs === "object" && !Array.isArray(row.tabs)
      ? (row.tabs as Record<string, unknown>)
      : null;
  if (!tabsRaw) return null;

  const tabs: Record<string, SqlQueryTab> = {};
  for (const [key, value] of Object.entries(tabsRaw)) {
    const tab = parseTab(value);
    if (tab && tab.id === key) tabs[key] = tab;
  }

  const order = row.order.filter(
    (id): id is string => typeof id === "string" && id in tabs,
  );
  if (order.length === 0) return null;

  const active =
    typeof row.active === "string" && order.includes(row.active)
      ? row.active
      : order[0]!;

  return { order, active, tabs };
}

export function loadWorkspaceSnapshot(
  storage: StorageLike | null | undefined,
  projectSlug: string,
): SqlWorkspaceSnapshot {
  if (!storage) return emptyWorkspace();
  try {
    const raw = storage.getItem(sqlTabsKey(projectSlug));
    if (!raw) return emptyWorkspace();
    const parsed = parseWorkspaceSnapshot(JSON.parse(raw) as unknown);
    return parsed ?? emptyWorkspace();
  } catch {
    return emptyWorkspace();
  }
}

export function saveWorkspaceSnapshot(
  storage: StorageLike | null | undefined,
  projectSlug: string,
  snapshot: SqlWorkspaceSnapshot,
): void {
  if (!storage) return;
  try {
    storage.setItem(sqlTabsKey(projectSlug), JSON.stringify(snapshot));
  } catch {
    // private mode / quota — editor still works for the session
  }
}

export function reorderSqlTabs(
  order: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
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

export function addSqlTab(
  snapshot: SqlWorkspaceSnapshot,
  seed?: Partial<Pick<SqlQueryTab, "title" | "sql" | "baseline" | "savedQueryId">>,
): SqlWorkspaceSnapshot {
  const id = createTabId();
  const sql = seed?.sql ?? DEFAULT_SQL_TAB_SQL;
  const baseline = seed?.baseline ?? sql;
  const title =
    seed?.title?.trim() ||
    defaultTabTitle(snapshot.order.length + 1);
  const tab: SqlQueryTab = {
    id,
    title,
    sql,
    baseline,
    savedQueryId: seed?.savedQueryId ?? null,
  };
  return {
    order: [...snapshot.order, id],
    active: id,
    tabs: { ...snapshot.tabs, [id]: tab },
  };
}

/**
 * Close a tab. Returns `needsConfirm: true` when dirty and `force` is false —
 * caller shows the unsaved guard. When the last tab closes, a fresh empty tab
 * is created so the workspace is never blank.
 */
export function closeSqlTab(
  snapshot: SqlWorkspaceSnapshot,
  tabId: string,
  opts: { force?: boolean } = {},
):
  | { ok: true; snapshot: SqlWorkspaceSnapshot }
  | { ok: false; needsConfirm: true; tab: SqlQueryTab } {
  const tab = snapshot.tabs[tabId];
  if (!tab) return { ok: true, snapshot };
  if (!opts.force && isTabDirty(tab)) {
    return { ok: false, needsConfirm: true, tab };
  }

  const tabs = { ...snapshot.tabs };
  delete tabs[tabId];
  const order = snapshot.order.filter((id) => id !== tabId);

  if (order.length === 0) {
    return { ok: true, snapshot: emptyWorkspace() };
  }

  const active =
    snapshot.active === tabId
      ? (order[Math.max(0, snapshot.order.indexOf(tabId) - 1)] ?? order[0]!)
      : snapshot.active && order.includes(snapshot.active)
        ? snapshot.active
        : order[0]!;

  return { ok: true, snapshot: { order, active, tabs } };
}

export function patchSqlTab(
  snapshot: SqlWorkspaceSnapshot,
  tabId: string,
  patch: Partial<Omit<SqlQueryTab, "id">>,
): SqlWorkspaceSnapshot {
  const cur = snapshot.tabs[tabId];
  if (!cur) return snapshot;
  return {
    ...snapshot,
    tabs: { ...snapshot.tabs, [tabId]: { ...cur, ...patch } },
  };
}

export function markTabExecuted(
  snapshot: SqlWorkspaceSnapshot,
  tabId: string,
): SqlWorkspaceSnapshot {
  const cur = snapshot.tabs[tabId];
  if (!cur) return snapshot;
  return patchSqlTab(snapshot, tabId, { baseline: cur.sql });
}

export function filterSqlItems<T extends { id: string }>(
  items: T[],
  query: string,
  haystack: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => haystack(item).toLowerCase().includes(q));
}
