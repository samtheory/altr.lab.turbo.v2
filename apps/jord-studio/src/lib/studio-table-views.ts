/**
 * Named table views for S0056 — per project per `schema.table`.
 * Layout/filters/sort survive reload; new columns merge via `mergeColumnLayout`.
 */

import type {
  DataGridColumnLayout,
  DataGridFilter,
  DataGridSort,
} from "@altr/apolyx";
import { emptyColumnLayout } from "@altr/apolyx";

const VERSION = "v1";

export type TableViewSnapshot = {
  id: string;
  name: string;
  columnLayout: DataGridColumnLayout;
  filters: DataGridFilter[];
  sort: DataGridSort;
  quickSearch: string;
};

export type TableViewsBucket = {
  views: TableViewSnapshot[];
  defaultViewId: string | null;
};

export type TableViewsStore = Record<string, TableViewsBucket>;

function storageKey(projectSlug: string): string {
  return `jord.studio.table-views:${VERSION}:${projectSlug}`;
}

export function emptyViewsBucket(): TableViewsBucket {
  return { views: [], defaultViewId: null };
}

export function loadTableViewsStore(projectSlug: string): TableViewsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(projectSlug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TableViewsStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTableViewsStore(
  projectSlug: string,
  store: TableViewsStore,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(projectSlug), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function getTableViewsBucket(
  store: TableViewsStore,
  tableKey: string,
): TableViewsBucket {
  return store[tableKey] ?? emptyViewsBucket();
}

export function upsertTableView(
  store: TableViewsStore,
  tableKey: string,
  view: TableViewSnapshot,
  makeDefault = false,
): TableViewsStore {
  const bucket = getTableViewsBucket(store, tableKey);
  const idx = bucket.views.findIndex((v) => v.id === view.id);
  const views =
    idx >= 0
      ? bucket.views.map((v, i) => (i === idx ? view : v))
      : [...bucket.views, view];
  return {
    ...store,
    [tableKey]: {
      views,
      defaultViewId: makeDefault
        ? view.id
        : bucket.defaultViewId ?? view.id,
    },
  };
}

export function renameTableView(
  store: TableViewsStore,
  tableKey: string,
  viewId: string,
  name: string,
): TableViewsStore {
  const bucket = getTableViewsBucket(store, tableKey);
  return {
    ...store,
    [tableKey]: {
      ...bucket,
      views: bucket.views.map((v) =>
        v.id === viewId ? { ...v, name: name.trim() || v.name } : v,
      ),
    },
  };
}

export function deleteTableView(
  store: TableViewsStore,
  tableKey: string,
  viewId: string,
): TableViewsStore {
  const bucket = getTableViewsBucket(store, tableKey);
  const views = bucket.views.filter((v) => v.id !== viewId);
  let defaultViewId = bucket.defaultViewId;
  if (defaultViewId === viewId) {
    defaultViewId = views[0]?.id ?? null;
  }
  return {
    ...store,
    [tableKey]: { views, defaultViewId },
  };
}

export function setDefaultTableView(
  store: TableViewsStore,
  tableKey: string,
  viewId: string | null,
): TableViewsStore {
  const bucket = getTableViewsBucket(store, tableKey);
  return {
    ...store,
    [tableKey]: { ...bucket, defaultViewId: viewId },
  };
}

export function newViewId(): string {
  return `view_${Math.random().toString(36).slice(2, 10)}`;
}

export function snapshotFromState(input: {
  name: string;
  id?: string;
  columnLayout: DataGridColumnLayout;
  filters: DataGridFilter[];
  sort: DataGridSort;
  quickSearch: string;
}): TableViewSnapshot {
  return {
    id: input.id ?? newViewId(),
    name: input.name.trim() || "Untitled",
    columnLayout: input.columnLayout,
    filters: input.filters,
    sort: input.sort,
    quickSearch: input.quickSearch,
  };
}

export function defaultLayoutForColumns(
  columnIds: string[],
): DataGridColumnLayout {
  return emptyColumnLayout(columnIds);
}
