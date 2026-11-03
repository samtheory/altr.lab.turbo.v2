"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@altr/apolyx";

import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  SidebarBadge,
  StudioSidebarList,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import type { JordRole } from "@/lib/auth/roles";
import { readStudioError } from "@/lib/studio-api";
import {
  AUTH_USERS_CHANGED_EVENT,
  authUserStatus,
  authUserStatusLabel,
  filterAuthUsers,
  metadataKeys,
  paginateAuthUsers,
  type AuthAdminUser,
} from "@/lib/studio-auth-users";

type Props = {
  role: JordRole;
};

/** Contextual Users list for the Auth section (S0070). */
export function StudioUsersSidebar({ role }: Props) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManage = role === "admin";

  const [users, setUsers] = useState<AuthAdminUser[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/users", { cache: "no-store" });
      if (!res.ok) throw new Error(await readStudioError(res));
      const body = (await res.json()) as { users?: AuthAdminUser[] };
      setUsers(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reload = () => void load();
    window.addEventListener(AUTH_USERS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(AUTH_USERS_CHANGED_EVENT, reload);
  }, [load]);

  const filtered = useMemo(
    () => filterAuthUsers(users, searchValue),
    [users, searchValue],
  );
  const paged = useMemo(() => paginateAuthUsers(filtered, page), [filtered, page]);
  const selectedId = searchParams.get("user") ?? "";

  const items = useMemo<SidebarItem[]>(
    () =>
      paged.items.map((user) => {
        const status = authUserStatus(user);
        return {
          id: user.id,
          label: user.email,
          meta: metadataKeys(user.userMetadata),
          badge: (
            <SidebarBadge
              variant={
                status === "banned"
                  ? "destructive"
                  : status === "unconfirmed"
                    ? "outline"
                    : "success"
              }
            >
              {authUserStatusLabel(status)}
            </SidebarBadge>
          ),
          hint: user.lastSignInAt
            ? "signed in"
            : user.emailConfirmed
              ? "never signed in"
              : "invited",
        };
      }),
    [paged.items],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      setPage(1);
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
      next.set("user", item.id);
      next.delete("new");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function newUser(mode: "create" | "invite") {
    const next = new URLSearchParams(searchParams.toString());
    next.set("new", mode);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Users"
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      items={items}
      selectedId={selectedId || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      listAriaLabel="Auth users"
      empty={
        canManage
          ? "No users yet. Create or invite one."
          : "Admin sessions only."
      }
      footer={
        canManage ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {paged.total} user{paged.total === 1 ? "" : "s"}
              </span>
              <span>
                Page {paged.page} / {paged.pages}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={paged.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={paged.page >= paged.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => newUser("create")}
              >
                New user
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => newUser("invite")}
              >
                Invite
              </Button>
            </div>
          </div>
        ) : null
      }
    />,
  );

  return null;
}
