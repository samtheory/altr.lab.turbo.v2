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
import type { GeneratedApiCatalog } from "@/lib/generated-api";
import type { PublicCustomApi, PublicFunction } from "@/lib/functions-api";

type ApiError = { error?: string; message?: string };

export function StudioEndpointsSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const hrefFor = useProjectHref();

  const [catalog, setCatalog] = useState<GeneratedApiCatalog | null>(null);
  const [customApis, setCustomApis] = useState<PublicCustomApi[]>([]);
  const [functions, setFunctions] = useState<PublicFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [selectedEndpoint, setSelectedEndpoint] = useState(
    () => searchParams.get("endpoint") ?? "",
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  useEffect(() => {
    setSelectedEndpoint(searchParams.get("endpoint") ?? "");
  }, [searchParams]);

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
      const custom =
        (customData as { custom_apis?: PublicCustomApi[] }).custom_apis ?? [];
      setCustomApis(custom);
      const fns =
        (fnData as { functions?: PublicFunction[] }).functions ?? [];
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
    (item: SidebarItem) => {
      const target = item.href;
      if (!target) return;
      router.push(target.startsWith("/p/") ? target : hrefFor(target));
    },
    [router, hrefFor],
  );

  const items = buildEndpointItems(catalog, customApis, functions, hrefFor);
  const filtered = filterEndpointItems(items, searchValue);

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Endpoints"
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      items={filtered}
      selectedId={selectedEndpoint || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      listAriaLabel="Endpoints list"
    />,
  );

  return null;
}

function filterEndpointItems(items: SidebarItem[], q: string): SidebarItem[] {
  if (!q) return items;
  const lower = q.toLowerCase();
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      (item.meta?.toLowerCase().includes(lower) ?? false) ||
      item.id.toLowerCase().includes(lower),
  );
}

function buildEndpointItems(
  catalog: GeneratedApiCatalog | null,
  customApis: PublicCustomApi[],
  functions: PublicFunction[],
  hrefFor: (path?: string) => string,
): SidebarItem[] {
  const tables: SidebarItem[] = [];
  const custom: SidebarItem[] = [];

  if (catalog) {
    for (const resource of catalog.resources) {
      const methods = resource.operations.map((op) => op.method);
      tables.push({
        id: resource.id,
        label: resource.id,
        meta: resource.table,
        badge:
          methods.length > 0 ? (
            <SidebarBadge variant="outline">
              {groupMethods(methods)}
            </SidebarBadge>
          ) : null,
        group: "Tables",
        href: hrefFor(
          `/apis/generated?endpoint=${encodeURIComponent(resource.id)}`,
        ),
      });
    }
    if (catalog.resources.length > 0) {
      custom.push({
        id: "table-api",
        label: "Table API",
        meta: "/api/v1/:table",
        badge: <SidebarBadge variant="secondary">v1</SidebarBadge>,
        group: "Tables",
        href: hrefFor("/apis/table"),
      });
    }
  }

  for (const api of customApis) {
    custom.push({
      id: api.id,
      label: api.name,
      meta: `/x/${api.slug}`,
      badge: api.enabled ? (
        <SidebarBadge variant="success">{api.method}</SidebarBadge>
      ) : (
        <SidebarBadge variant="destructive">off</SidebarBadge>
      ),
      group: "Custom",
      href: hrefFor(`/apis/custom?endpoint=${encodeURIComponent(api.id)}`),
    });
  }

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
      href: hrefFor(`/apis/functions?endpoint=${encodeURIComponent(fn.id)}`),
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
