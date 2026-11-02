"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from "@altr/apolyx";
import { Plus, X } from "lucide-react";

import { useProjectSlug } from "@/hooks/use-project-path";
import {
  type SqlQueryTab,
  type SqlWorkspaceSnapshot,
  addSqlTab,
  closeSqlTab,
  emptyWorkspace,
  isTabDirty,
  loadWorkspaceSnapshot,
  markTabExecuted,
  patchSqlTab,
  reorderSqlTabs,
  saveWorkspaceSnapshot,
  truncateTitle,
} from "@/lib/studio-sql-workspace";

export type SqlWorkspaceApi = {
  enabled: boolean;
  ready: boolean;
  order: string[];
  active: string | null;
  activeTab: SqlQueryTab | null;
  getTab: (id: string) => SqlQueryTab | null;
  setActive: (id: string) => void;
  newTab: () => void;
  /** Open a saved query or history statement in a **new** tab. */
  openStatement: (input: {
    title: string;
    sql: string;
    savedQueryId?: string | null;
  }) => void;
  renameTab: (id: string, title: string) => void;
  updateSql: (sql: string) => void;
  requestClose: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  markExecuted: () => void;
  /** Persist current SQL as a saved query (create or update). */
  requestSave: () => void;
  /** Notify sidebar lists to refetch. */
  revision: number;
  bumpRevision: () => void;
};

const SqlWorkspaceContext = createContext<SqlWorkspaceApi | null>(null);

export function useSqlWorkspace(): SqlWorkspaceApi {
  const ctx = useContext(SqlWorkspaceContext);
  if (!ctx) {
    throw new Error("useSqlWorkspace must be used within SqlWorkspaceProvider");
  }
  return ctx;
}

export function useSqlWorkspaceOptional(): SqlWorkspaceApi | null {
  return useContext(SqlWorkspaceContext);
}

type ProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function SqlWorkspaceProvider({ enabled, children }: ProviderProps) {
  const projectSlug = useProjectSlug();
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<SqlWorkspaceSnapshot>(emptyWorkspace);
  const [revision, setRevision] = useState(0);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    setSnapshot(loadWorkspaceSnapshot(window.localStorage, projectSlug));
    setReady(true);
  }, [enabled, projectSlug]);

  useEffect(() => {
    if (!enabled || !ready) return;
    saveWorkspaceSnapshot(window.localStorage, projectSlug, snapshot);
  }, [enabled, ready, projectSlug, snapshot]);

  const bumpRevision = useCallback(() => {
    setRevision((n) => n + 1);
  }, []);

  const setActive = useCallback((id: string) => {
    setSnapshot((prev) =>
      prev.order.includes(id) ? { ...prev, active: id } : prev,
    );
  }, []);

  const newTab = useCallback(() => {
    setSnapshot((prev) => addSqlTab(prev));
  }, []);

  const openStatement = useCallback(
    (input: { title: string; sql: string; savedQueryId?: string | null }) => {
      setSnapshot((prev) =>
        addSqlTab(prev, {
          title: input.title,
          sql: input.sql,
          baseline: input.sql,
          savedQueryId: input.savedQueryId ?? null,
        }),
      );
    },
    [],
  );

  const renameTab = useCallback((id: string, title: string) => {
    const next = title.trim();
    if (!next) return;
    setSnapshot((prev) => patchSqlTab(prev, id, { title: next }));
  }, []);

  const updateSql = useCallback((sql: string) => {
    setSnapshot((prev) => {
      if (!prev.active) return prev;
      return patchSqlTab(prev, prev.active, { sql });
    });
  }, []);

  const applyClose = useCallback((id: string, force: boolean) => {
    setSnapshot((prev) => {
      const result = closeSqlTab(prev, id, { force });
      if (!result.ok) {
        setPendingCloseId(id);
        return prev;
      }
      setPendingCloseId(null);
      return result.snapshot;
    });
  }, []);

  const requestClose = useCallback(
    (id: string) => {
      applyClose(id, false);
    },
    [applyClose],
  );

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setSnapshot((prev) => ({
      ...prev,
      order: reorderSqlTabs(prev.order, fromIndex, toIndex),
    }));
  }, []);

  const markExecuted = useCallback(() => {
    setSnapshot((prev) => {
      if (!prev.active) return prev;
      return markTabExecuted(prev, prev.active);
    });
  }, []);

  const requestSave = useCallback(() => {
    const active = snapshotRef.current.active;
    const tab = active ? snapshotRef.current.tabs[active] : null;
    if (!tab) return;
    if (tab.savedQueryId) {
      void (async () => {
        setSaveBusy(true);
        setSaveError(null);
        try {
          const res = await fetch(`/api/sql/saved-queries/${tab.savedQueryId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sql: tab.sql, name: tab.title }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(body.message ?? `Save failed (${res.status})`);
          }
          setSnapshot((prev) =>
            patchSqlTab(prev, tab.id, { baseline: tab.sql }),
          );
          bumpRevision();
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Save failed");
          setSaveOpen(true);
          setSaveName(tab.title);
        } finally {
          setSaveBusy(false);
        }
      })();
      return;
    }
    setSaveName(tab.title === "Untitled" ? truncateTitle(tab.sql) : tab.title);
    setSaveError(null);
    setSaveOpen(true);
  }, [bumpRevision]);

  const confirmSaveAs = useCallback(async () => {
    const active = snapshotRef.current.active;
    const tab = active ? snapshotRef.current.tabs[active] : null;
    if (!tab) return;
    const name = saveName.trim();
    if (!name) {
      setSaveError("Name is required");
      return;
    }
    setSaveBusy(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/sql/saved-queries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, sql: tab.sql }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        query?: { id: string; name: string };
      };
      if (!res.ok) {
        throw new Error(body.message ?? `Save failed (${res.status})`);
      }
      const savedId = body.query?.id ?? null;
      setSnapshot((prev) =>
        patchSqlTab(prev, tab.id, {
          title: body.query?.name ?? name,
          baseline: tab.sql,
          savedQueryId: savedId,
        }),
      );
      setSaveOpen(false);
      bumpRevision();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }, [bumpRevision, saveName]);

  // Keyboard: Ctrl/Cmd+T new, Ctrl/Cmd+W close, Ctrl/Cmd+S save.
  useEffect(() => {
    if (!enabled || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "t") {
        e.preventDefault();
        newTab();
        return;
      }
      if (key === "w") {
        const active = snapshotRef.current.active;
        if (!active) return;
        e.preventDefault();
        requestClose(active);
        return;
      }
      if (key === "s") {
        e.preventDefault();
        requestSave();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled, ready, newTab, requestClose, requestSave]);

  const activeTab = snapshot.active
    ? (snapshot.tabs[snapshot.active] ?? null)
    : null;

  const api = useMemo<SqlWorkspaceApi>(
    () => ({
      enabled,
      ready,
      order: snapshot.order,
      active: snapshot.active,
      activeTab,
      getTab: (id) => snapshot.tabs[id] ?? null,
      setActive,
      newTab,
      openStatement,
      renameTab,
      updateSql,
      requestClose,
      reorder,
      markExecuted,
      requestSave,
      revision,
      bumpRevision,
    }),
    [
      enabled,
      ready,
      snapshot.order,
      snapshot.active,
      snapshot.tabs,
      activeTab,
      setActive,
      newTab,
      openStatement,
      renameTab,
      updateSql,
      requestClose,
      reorder,
      markExecuted,
      requestSave,
      revision,
      bumpRevision,
    ],
  );

  if (!enabled) return <>{children}</>;

  return (
    <SqlWorkspaceContext.Provider value={api}>
      {children}
      <AlertDialog
        open={pendingCloseId != null}
        onOpenChange={(open) => {
          if (!open) setPendingCloseId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This tab has edits that are not saved or re-run. Closing discards
              them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCloseId) applyClose(pendingCloseId, true);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save query</DialogTitle>
            <DialogDescription>
              Stored in this project database. Opening from the sidebar always
              creates a new tab.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Query name"
            aria-label="Saved query name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmSaveAs();
              }
            }}
          />
          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSaveOpen(false)}
              disabled={saveBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSaveAs()}
              disabled={saveBusy || !saveName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SqlWorkspaceContext.Provider>
  );
}

/** Tab strip above the SQL editor. */
export function SqlQueryTabsStrip({ className }: { className?: string }) {
  const ws = useSqlWorkspaceOptional();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!ws || !ws.enabled || !ws.ready) return null;

  return (
    <div
      data-slot="sql-query-tabs"
      className={cn(
        "flex shrink-0 items-stretch gap-1 border-b border-border bg-muted/30 px-1 pt-1.5",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="SQL query tabs"
        className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto scrollbar-none"
      >
        {ws.order.map((id, index) => {
          const tab = ws.getTab(id);
          if (!tab) return null;
          const selected = ws.active === id;
          const dirty = isTabDirty(tab);
          const editing = editingId === id;
          return (
            <div
              key={id}
              role="tab"
              aria-selected={selected}
              draggable={!editing}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex == null) return;
                ws.reorder(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group flex max-w-[14rem] items-center gap-1 rounded-t-md border border-b-0 px-2 py-1.5 text-sm",
                selected
                  ? "border-border bg-background text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60",
              )}
            >
              {editing ? (
                <Input
                  value={editValue}
                  autoFocus
                  className="h-6 min-w-0 flex-1 px-1 py-0 text-xs"
                  aria-label="Rename tab"
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    ws.renameTab(id, editValue);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      ws.renameTab(id, editValue);
                      setEditingId(null);
                    }
                    if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => ws.setActive(id)}
                  onDoubleClick={() => {
                    setEditingId(id);
                    setEditValue(tab.title);
                  }}
                  title={tab.title}
                >
                  {dirty ? "• " : ""}
                  {tab.title}
                </button>
              )}
              <button
                type="button"
                className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  ws.requestClose(id);
                }}
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mb-0.5 shrink-0"
        aria-label="New query tab"
        aria-keyshortcuts="Control+T Meta+T"
        onClick={ws.newTab}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
