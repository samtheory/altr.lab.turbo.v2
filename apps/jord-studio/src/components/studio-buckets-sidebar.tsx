"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@altr/apolyx";

import { useInspectorOptional } from "@/components/inspector-host";
import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  SidebarBadge,
  StudioSidebarList,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import { canManageBlobs, type JordRole } from "@/lib/auth/roles";
import {
  BUCKETS_CHANGED_EVENT,
  bucketProviderLabel,
  emitBucketsChanged,
  readApiError,
  type BucketPublic,
  type JordBucketProvider,
  type JordBucketStatus,
} from "@/lib/bucket-admin";

type BucketRow = {
  name: string;
  provider: JordBucketProvider | null;
  status: JordBucketStatus;
  objectCount: number;
};

type Props = {
  role: JordRole;
};

/** Contextual Storage sidebar: buckets with provider badge + object count (S0068). */
export function StudioBucketsSidebar({ role }: Props) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const inspector = useInspectorOptional();
  const canManage = canManageBlobs(role);

  const [rows, setRows] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/buckets", { cache: "no-store" });
      let next: BucketRow[] = [];
      if (res.ok) {
        const body = (await res.json()) as { buckets?: BucketPublic[] };
        next = (body.buckets ?? []).map((bucket) => ({
          name: bucket.name,
          provider: bucket.provider,
          status: bucket.status,
          objectCount: 0,
        }));
      } else if (res.status === 401 || res.status === 403 || res.status === 404) {
        // Non-admin: fall back to the env-backed bucket list.
        const fallback = await fetch("/api/blobs/buckets", {
          cache: "no-store",
        });
        if (!fallback.ok) throw new Error(await readApiError(fallback));
        const body = (await fallback.json()) as { buckets?: string[] };
        next = (body.buckets ?? []).map((name) => ({
          name,
          provider: null,
          status: "active",
          objectCount: 0,
        }));
      } else {
        throw new Error(await readApiError(res));
      }

      const counts = await Promise.all(
        next.map(async (row) => {
          try {
            const objectsRes = await fetch(
              `/api/blobs/${encodeURIComponent(row.name)}`,
              { cache: "no-store" },
            );
            if (!objectsRes.ok) return 0;
            const body = (await objectsRes.json()) as {
              objects?: unknown[];
            };
            return body.objects?.length ?? 0;
          } catch {
            return 0;
          }
        }),
      );

      setRows(next.map((row, i) => ({ ...row, objectCount: counts[i] ?? 0 })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buckets");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reload = () => void load();
    window.addEventListener(BUCKETS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(BUCKETS_CHANGED_EVENT, reload);
  }, [load]);

  const selectedName = useMemo(() => {
    const param = searchParams.get("bucket");
    if (param && rows.some((row) => row.name === param)) return param;
    return rows[0]?.name ?? "";
  }, [searchParams, rows]);

  const items = useMemo<SidebarItem[]>(() => {
    const lower = searchValue.trim().toLowerCase();
    return rows
      .filter((row) => !lower || row.name.toLowerCase().includes(lower))
      .map((row) => ({
        id: row.name,
        label: row.name,
        meta: `${row.objectCount} object${row.objectCount === 1 ? "" : "s"}`,
        badge: (
          <span className="flex items-center gap-1">
            <SidebarBadge
              variant={row.status === "paused" ? "destructive" : "outline"}
            >
              {bucketProviderLabel(row.provider)}
            </SidebarBadge>
            {row.status === "paused" ? (
              <SidebarBadge variant="destructive">paused</SidebarBadge>
            ) : null}
          </span>
        ),
      }));
  }, [rows, searchValue]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onSelect = useCallback(
    (item: SidebarItem) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("bucket", item.id);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Buckets"
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      items={items}
      selectedId={selectedName || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      empty={
        canManage
          ? "No buckets yet. Create one to start uploading."
          : "No buckets yet."
      }
      listAriaLabel="Bucket list"
      footer={
        canManage ? (
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => inspector?.open("create-bucket")}
          >
            New bucket
          </Button>
        ) : null
      }
    />,
  );

  return null;
}

/** Refresh the sidebar after a page-level bucket mutation. */
export { emitBucketsChanged };
