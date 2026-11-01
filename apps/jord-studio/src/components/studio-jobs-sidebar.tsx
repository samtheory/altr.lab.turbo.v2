"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  StudioSidebarList,
  SidebarBadge,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import { formatMs, type PublicJob } from "@/lib/jobs";

type ApiError = { error?: string; message?: string };

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "ok", label: "Last OK" },
  { value: "error", label: "Last error" },
  { value: "none", label: "Never ran" },
];

export function StudioJobsSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  const selectedId = useActiveJobId(searchParams, jobs);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.message ??
            (res.status === 503
              ? "jord-server is down — start `pnpm dev:jord`."
              : `Failed to load jobs (${res.status}).`),
        );
      }
      const data = (await res.json()) as { jobs: PublicJob[] };
      setJobs(data.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
      setJobs([]);
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
      const next = new URLSearchParams(searchParams.toString());
      if (item.id) next.set("job", item.id);
      else next.delete("job");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const filtered = statusFilteredJobs(jobs, statusFilter);
  const items = buildJobItems(
    filterByName(
      filtered.map((j) => j.id),
      searchValue,
    ).map((id) => filtered.find((j) => j.id === id)!),
  );

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Jobs"
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      filterOptions={STATUS_FILTER_OPTIONS}
      filterValue={statusFilter}
      onFilterChange={setStatusFilter}
      items={items}
      selectedId={selectedId || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      listAriaLabel="Jobs list"
    />,
  );

  return null;
}

function filterByName(ids: string[], q: string): string[] {
  if (!q) return ids;
  const lower = q.toLowerCase();
  return ids.filter((id) => id.toLowerCase().includes(lower));
}

function useActiveJobId(
  searchParams: URLSearchParams,
  jobs: PublicJob[],
): string {
  const param = searchParams.get("job");
  if (param && param !== "") {
    return jobs.some((j) => j.id === param) ? param : "";
  }
  return jobs[0]?.id ?? "";
}

function statusFilteredJobs(jobs: PublicJob[], filter: string): PublicJob[] {
  if (filter === "all") return jobs;
  if (filter === "none") return jobs.filter((j) => j.last_run_at == null);
  return jobs.filter((j) => j.last_status === filter);
}

function buildJobItems(jobs: PublicJob[]): SidebarItem[] {
  return jobs.map((job) => ({
    id: job.id,
    label: job.name,
    meta: job.kind,
    badge:
      job.last_status === "ok" ? (
        <SidebarBadge variant="success">ok</SidebarBadge>
      ) : job.last_status === "error" ? (
        <SidebarBadge variant="destructive">error</SidebarBadge>
      ) : null,
    hint: job.last_run_at != null ? formatMs(job.last_run_at) : "never ran",
  }));
}
