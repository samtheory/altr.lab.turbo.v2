"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button } from "@altr/apolyx";
import { Trash2 } from "lucide-react";

import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  StudioSidebarList,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import { useSqlWorkspaceOptional } from "@/components/sql-workspace";
import { truncateTitle } from "@/lib/studio-sql-workspace";

type SavedQuery = {
  id: string;
  name: string;
  sql: string;
  updatedAt: number;
};

type HistoryEntry = {
  id: string;
  at: number;
  sql: string;
  ok: boolean;
  elapsedMs: number;
  rowCount: number | null;
  readOnly: boolean;
};

type Section = "saved" | "history";

function formatWhen(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(at));
  } catch {
    return String(at);
  }
}

export function StudioSqlSidebar() {
  const workspace = useSqlWorkspaceOptional();
  const [section, setSection] = useState<Section>("saved");
  const [searchValue, setSearchValue] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [saved, setSaved] = useState<SavedQuery[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSaved = useCallback(async (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    const res = await fetch(
      qs ? `/api/sql/saved-queries?${qs}` : "/api/sql/saved-queries",
      { cache: "no-store" },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Saved queries failed (${res.status})`);
    }
    const body = (await res.json()) as { queries?: SavedQuery[] };
    setSaved(body.queries ?? []);
  }, []);

  const loadHistory = useCallback(async (q: string, failed: boolean) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (failed) params.set("failed", "1");
    params.set("limit", "50");
    const res = await fetch(`/api/sql/history?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `History failed (${res.status})`);
    }
    const body = (await res.json()) as { history?: HistoryEntry[] };
    setHistory(body.history ?? []);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === "saved") await loadSaved(searchValue);
      else await loadHistory(searchValue, failedOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setSaved([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [section, searchValue, failedOnly, loadSaved, loadHistory]);

  useEffect(() => {
    void reload();
  }, [reload, workspace?.revision]);

  const onSelect = useCallback(
    (item: SidebarItem) => {
      if (!workspace) return;
      if (section === "saved") {
        const row = saved.find((q) => q.id === item.id);
        if (!row) return;
        workspace.openStatement({
          title: row.name,
          sql: row.sql,
          savedQueryId: row.id,
        });
        return;
      }
      const row = history.find((h) => h.id === item.id);
      if (!row) return;
      workspace.openStatement({
        title: truncateTitle(row.sql),
        sql: row.sql,
      });
    },
    [workspace, section, saved, history],
  );

  const deleteSaved = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/sql/saved-queries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      workspace?.bumpRevision();
      void reload();
    },
    [reload, workspace],
  );

  const items: SidebarItem[] = useMemo(() => {
    if (section === "saved") {
      return saved.map((q) => ({
        id: q.id,
        label: q.name,
        hint: truncateTitle(q.sql, 40),
        meta: formatWhen(q.updatedAt),
        badge: (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            aria-label={`Delete ${q.name}`}
            onClick={(e) => {
              e.stopPropagation();
              void deleteSaved(q.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      }));
    }
    return history.map((h) => ({
      id: h.id,
      label: truncateTitle(h.sql, 36),
      hint: h.sql,
      meta: `${formatWhen(h.at)} · ${h.elapsedMs} ms`,
      badge: (
        <Badge variant={h.ok ? "outline" : "destructive"} className="text-[10px]">
          {h.ok ? "ok" : "fail"}
          {h.rowCount != null ? ` · ${h.rowCount}` : ""}
        </Badge>
      ),
    }));
  }, [section, saved, history, deleteSaved]);

  const leading = (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-md border border-border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={section === "saved" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => setSection("saved")}
        >
          Saved
        </Button>
        <Button
          type="button"
          size="sm"
          variant={section === "history" ? "secondary" : "ghost"}
          className="flex-1"
          onClick={() => setSection("history")}
        >
          History
        </Button>
      </div>
      {section === "history" ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={failedOnly}
            onChange={(e) => setFailedOnly(e.target.checked)}
          />
          Failed only
        </label>
      ) : null}
    </div>
  );

  const node = (
    <StudioSidebarList
      header={section === "saved" ? "Saved queries" : "Execution history"}
      leading={leading}
      searchable
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      error={error ?? undefined}
      empty={
        section === "saved"
          ? "No saved queries yet. Use Ctrl/⌘+S in the editor."
          : "No audited statements yet. Run a query to populate history."
      }
      items={items}
      onSelect={onSelect}
      listAriaLabel={
        section === "saved" ? "Saved SQL queries" : "SQL execution history"
      }
    />
  );

  useRegisterStudioSidebar(node);
  return null;
}
