"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  StudioSidebarList,
  SidebarBadge,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import { useProjectHref } from "@/hooks/use-project-path";

type ApiError = { message?: string };

export function StudioTablesSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const hrefFor = useProjectHref();

  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  const selectedId = useActiveTableId(pathname, searchParams);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schema/tables", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.message ?? `Failed to list tables (${res.status}).`,
        );
      }
      const data = (await res.json()) as { tables: string[] };
      setTables(data.tables ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const onSelect = useCallback(
    (item: SidebarItem, _index: number) => {
      const name = item.id;
      const target =
        name === "records"
          ? hrefFor("/records")
          : hrefFor(`/tables/${encodeURIComponent(name)}`);
      router.push(target);
    },
    [router, hrefFor],
  );

  const filteredTables = filterByName(tables, searchValue);

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Tables"
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      items={buildTableItems(filteredTables, hrefFor)}
      selectedId={selectedId || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      listAriaLabel="Tables list"
      footer={
        <p className="text-xs text-muted-foreground">
          Create tables from{" "}
          <a
            href={hrefFor("/schema")}
            className="font-mono underline underline-offset-2 hover:text-foreground"
          >
            Schema
          </a>
          .
        </p>
      }
    />,
  );

  return null;
}

function filterByName(names: string[], q: string): string[] {
  if (!q) return names;
  const lower = q.toLowerCase();
  return names.filter((name) => name.toLowerCase().includes(lower));
}

function useActiveTableId(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const nameMatch = pathname.match(/^\/p\/[^/]+\/tables\/([^/]+)$/);
  if (nameMatch) {
    try {
      return decodeURIComponent(nameMatch[1] ?? "");
    } catch {
      return "";
    }
  }
  const param = searchParams.get("table");
  return param && param !== "" ? param : "";
}

function buildTableItems(
  tables: string[],
  hrefFor: (path?: string) => string,
): SidebarItem[] {
  return tables.map((name) => {
    const isRecords = name === "records";
    return {
      id: name,
      label: name,
      href: isRecords
        ? hrefFor("/records")
        : hrefFor(`/tables/${encodeURIComponent(name)}`),
      badge: isRecords ? (
        <SidebarBadge variant="secondary">scratchpad</SidebarBadge>
      ) : null,
      hint: isRecords ? "column-scratchpad editor" : "CRUD table",
    };
  });
}
