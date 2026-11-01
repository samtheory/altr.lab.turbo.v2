"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRegisterStudioSidebar } from "@/components/studio-panes";
import { StudioSidebarList, SidebarBadge } from "@/components/studio-sidebar-list";
import type { SidebarItem } from "@/components/studio-sidebar-list";
import {
  type GeneratedApiCatalog,
  type GeneratedApiResource,
} from "@/lib/generated-api";
import { type PublicCustomApi, type PublicFunction } from "@/lib/functions-api";

type ApiError = { error?: string; message?: string };

export function StudioEndpointsSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [catalog, setCatalog] = useState<GeneratedApiCatalog | null>(null);
  const [customApis, setCustomApis] = useState<PublicCustomApi[]>([]);
  const [functions, setFunctions] = useState<PublicFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(() => searchParams.get("q") ?? "");

  // Keep search in sync with the URL so reload restores it.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(() => {
    return searchParams.get("endpoint") ?? "";
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [genRes, customRes, fnRes] = await Promise.all([
        fetch("/api/apis/generated", { cache: "no-store" }),
        fetch("/api/custom-apis", { cache: "no-store" }),
        fetch("/api/functions", { cache: "no-store" }),
      ]);
      if (!genRes.ok) {
        const body = (await genRes.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.message ??
            (genRes.status === 503
              ? "jord-server is down — start `pnpm dev:jord`."
              : `Failed to load endpoints (${genRes.status}).`),
        );
      }
      const [genData, customData, fnData] = await Promise.all([
        genRes.json(),
        customRes.json(),
        fnRes.json(),
      ]);
      setCatalog(genData as GeneratedApiCatalog);
      const custom = (customData as { custom_apis?: PublicCustomApi[] }).custom_apis ?? [];
      setCustomApis(custom);
      const fns = (fnData as { functions?: PublicFunction[] }).functions ?? [];
      setFunctions(fns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load endpoints");
      setCatalog(null);
      setCustomApis([]);
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const items = buildEndpointItems(catalog, customApis, functions, selectedEndpoint);
  const filtered = filterEndpointItems(items, searchValue);

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Endpoints"
      searchable
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      items={filtered}
      selectedId={selectedEndpoint}
      onSelect={onSelect}
      error={error}
      loading={loading}
      listAriaLabel="Endpoints list"
    />,
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      router.replace(pathname + "?" + next.toString(), { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const onSelect = useCallback(
    (item: SidebarItem, _index: number) => {
      const target = item.href;
      if (!target) return;
      router.push(target);
    },
    [router],
  );
}

function buildEndpointItems(
  catalog: GeneratedApiCatalog | null,
  customApis: PublicCustomApi[],
  functions: PublicFunction[],
  selected: string,
): SidebarItem[] {
  const tables: SidebarItem[] = [];
  const custom: SidebarItem[] = [];

  // Generated API resources (table-backed CRUD).
  if (catalog) {
    for (const resource of catalog.resources) {
      const methods = resource.operations.map((op) => op.method);
      const grouped = groupMethods(methods);
      tables.push({
        id: resource.id,
        label: resource.id,
        meta: resource.table,
        badge:
          methods.length > 0 ? (
            <SidebarBadge variant="outline">{grouped}</SidebarBadge>
          ) : null,
        group: "Tables",
        href: `/apis/generated?endpoint=${encodeURIComponent(resource.id)}`,
      });
    }
    // The dedicated /api/v1/:table table API entry.
    if (catalog.resources.length > 0) {
      custom.push({
        id: "table-api",
        label: "Table API",
        meta: "/api/v1/:table",
        badge: <SidebarBadge variant="secondary">v1</SidebarBadge>,
        group: "Tables",
        href: "/apis/table",
      });
    }
  }

  // Custom APIs.
  for (const api of customApis) {
    custom.push({
      id: api.id,
      label: api.name,
      meta: `/x/${api.slug}`,
      badge:
        api.enabled ? (
          <SidebarBadge variant="success">{api.method}</SidebarBadge>
        ) : (
          <SidebarBadge variant="destructive">off</SidebarBadge>
        ),
      group: "Custom",
      href: `/apis/custom?endpoint=${encodeURIComponent(api.id)}`,
    });
  }

  // Functions (owned by /apis/functions).
  for (const fn of functions) {
    custom.push({
      id: fn.id,
      label: fn.slug,
      meta: fn.name,
      badge: fn.enabled ? (
        <SidebarBadge variant="secondary">fn</SidebarBadge>
      ) : (
        <SidebarBadge variant="outline">off</SidebarBadge>
      ),
      group: "Custom",
      href: `/apis/functions?endpoint=${encodeURIComponent(fn.id)}`,
    });
  }

  return [...tables, ...custom];
}

function groupMethods(methods: string[]): string {
  const set = new Set(methods);
  const parts: string[] = [];
  if (set.has("GET")) parts.push("GET");
  if (set.has("POST")) parts.push("POST");
  if (set.has("PATCH")) parts.push("PATCH");
  if (set.has("DELETE")) parts.push("DEL");
  return parts.join("/");
}
