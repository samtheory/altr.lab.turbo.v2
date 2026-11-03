"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldInput,
  FieldTextarea,
} from "@altr/apolyx";

import type { JordRole } from "@/lib/auth/roles";
import { formatStudioTime, readStudioError } from "@/lib/studio-api";
import {
  authUserStatus,
  authUserStatusLabel,
  emitAuthUsersChanged,
  parseMetadataJson,
  stringifyMetadata,
  type AuthAdminUser,
} from "@/lib/studio-auth-users";

type Props = { role: JordRole };

type CreateForm = {
  email: string;
  password: string;
  userMetadata: string;
  appMetadata: string;
};

const EMPTY_FORM: CreateForm = {
  email: "",
  password: "",
  userMetadata: "{}",
  appMetadata: "{}",
};

export function UsersAdminPanel({ role }: Props) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManage = role === "admin";

  const [users, setUsers] = useState<AuthAdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selectedParam = searchParams.get("user");
  const selected = useMemo(
    () =>
      users?.find((user) => user.id === selectedParam) ?? users?.[0] ?? null,
    [users, selectedParam],
  );

  const createParam = searchParams.get("new");
  const createMode: "create" | "invite" | null =
    createParam === "invite"
      ? "invite"
      : createParam === "create"
        ? "create"
        : null;

  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [userMetaText, setUserMetaText] = useState("{}");
  const [appMetaText, setAppMetaText] = useState("{}");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!canManage) {
      setUsers([]);
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/users", { cache: "no-store" });
      if (!res.ok) throw new Error(await readStudioError(res));
      const body = (await res.json()) as { users?: AuthAdminUser[] };
      setUsers(body.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    }
  }, [canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    setUserMetaText(stringifyMetadata(selected.userMetadata));
    setAppMetaText(stringifyMetadata(selected.appMetadata));
    setMetaError(null);
  }, [selected]);

  useEffect(() => {
    setForm(EMPTY_FORM);
    setCreateError(null);
  }, [createMode]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  async function run(
    label: string,
    work: () => Promise<void>,
    success?: string,
  ) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await work();
      if (success) setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitCreate() {
    if (!createMode) return;
    const userMeta = parseMetadataJson(form.userMetadata);
    if (!userMeta.ok) {
      setCreateError(`user_metadata: ${userMeta.error}`);
      return;
    }
    const appMeta = parseMetadataJson(form.appMetadata);
    if (!appMeta.ok) {
      setCreateError(`app_metadata: ${appMeta.error}`);
      return;
    }
    setCreateError(null);
    setBusy("create");
    try {
      const res = await fetch("/api/admin/auth/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: createMode,
          email: form.email,
          ...(createMode === "create" ? { password: form.password } : {}),
          ...(createMode === "create" ? { email_confirm: true } : {}),
          user_metadata: userMeta.value,
          app_metadata: appMeta.value,
        }),
      });
      if (!res.ok) {
        setCreateError(await readStudioError(res));
        return;
      }
      const body = (await res.json()) as { user?: AuthAdminUser };
      await refresh();
      emitAuthUsersChanged();
      if (body.user) setParam("user", body.user.id);
      setParam("new", null);
      setNotice(
        createMode === "invite"
          ? `Invitation sent to ${form.email}.`
          : `Created ${form.email}.`,
      );
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveMetadata() {
    if (!selected) return;
    const userMeta = parseMetadataJson(userMetaText);
    if (!userMeta.ok) {
      setMetaError(`user_metadata: ${userMeta.error}`);
      return;
    }
    const appMeta = parseMetadataJson(appMetaText);
    if (!appMeta.ok) {
      setMetaError(`app_metadata: ${appMeta.error}`);
      return;
    }
    setMetaError(null);
    await run(
      "metadata",
      async () => {
        const res = await fetch(
          `/api/admin/auth/users/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              user_metadata: userMeta.value,
              app_metadata: appMeta.value,
            }),
          },
        );
        if (!res.ok) throw new Error(await readStudioError(res));
        await refresh();
        emitAuthUsersChanged();
      },
      "Metadata saved.",
    );
  }

  async function confirmEmail() {
    if (!selected) return;
    await run(
      "confirm",
      async () => {
        const res = await fetch(
          `/api/admin/auth/users/${encodeURIComponent(selected.id)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email_confirm: true }),
          },
        );
        if (!res.ok) throw new Error(await readStudioError(res));
        await refresh();
        emitAuthUsersChanged();
      },
      "Email marked confirmed.",
    );
  }

  async function toggleBan(disabled: boolean) {
    if (!selected) return;
    await run(
      "ban",
      async () => {
        const res = await fetch(
          `/api/admin/auth/users/${encodeURIComponent(selected.id)}/ban`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              disabled,
              ...(disabled && banReason.trim() ? { reason: banReason.trim() } : {}),
            }),
          },
        );
        if (!res.ok) throw new Error(await readStudioError(res));
        await refresh();
        emitAuthUsersChanged();
      },
      disabled ? "User banned and sessions revoked." : "User un-banned.",
    );
    setBanReason("");
  }

  async function revokeSessions() {
    if (!selected) return;
    await run(
      "revoke",
      async () => {
        const res = await fetch(
          `/api/admin/auth/users/${encodeURIComponent(selected.id)}/revoke`,
          { method: "POST" },
        );
        if (!res.ok) throw new Error(await readStudioError(res));
        const body = (await res.json()) as { revoked?: number };
        setNotice(`Revoked ${body.revoked ?? 0} session(s).`);
      },
      undefined,
    );
  }

  async function deleteUser() {
    if (!selected) return;
    const id = selected.id;
    await run(
      "delete",
      async () => {
        const res = await fetch(
          `/api/admin/auth/users/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(await readStudioError(res));
        setParam("user", null);
        await refresh();
        emitAuthUsersChanged();
      },
      "User deleted.",
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            The auth console is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = selected ? authUserStatus(selected) : null;
  const banned = status === "banned";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Auth
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Users
        </h1>
        <p className="text-sm text-muted-foreground">
          Create and invite users, edit metadata, ban, delete and revoke
          sessions. Password hashes and tokens never leave the server.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setParam("new", "create")}>
          Create user
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setParam("new", "invite")}
        >
          Invite user
        </Button>
      </div>

      {!users ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          No users yet. Create the first account or send an invitation.
        </div>
      ) : !selected ? (
        <p className="text-sm text-muted-foreground">
          Select a user from the Users list.
        </p>
      ) : (
        <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">
                  {selected.email}
                </h2>
                <Badge
                  variant={
                    banned
                      ? "destructive"
                      : status === "unconfirmed"
                        ? "secondary"
                        : "success"
                  }
                >
                  {status ? authUserStatusLabel(status) : "—"}
                </Badge>
                {banned && selected.banReason ? (
                  <span className="text-xs text-muted-foreground">
                    {selected.banReason}
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {selected.id}
              </p>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </dt>
              <dd>{formatStudioTime(selected.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Last sign-in
              </dt>
              <dd>{formatStudioTime(selected.lastSignInAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Updated
              </dt>
              <dd>{formatStudioTime(selected.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Banned at
              </dt>
              <dd>{formatStudioTime(selected.disabledAt)}</dd>
            </div>
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="user_metadata"
              description="JSON object owned by the app and editable by the user in SDKs."
              error={metaError?.startsWith("user_metadata") ? metaError : undefined}
            >
              <FieldTextarea
                value={userMetaText}
                rows={8}
                spellCheck={false}
                className="font-mono text-xs"
                onChange={(event) => setUserMetaText(event.target.value)}
              />
            </Field>
            <Field
              label="app_metadata"
              description="JSON object for roles, plans and claims the user cannot edit."
              error={metaError?.startsWith("app_metadata") ? metaError : undefined}
            >
              <FieldTextarea
                value={appMetaText}
                rows={8}
                spellCheck={false}
                className="font-mono text-xs"
                onChange={(event) => setAppMetaText(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveMetadata()}
            >
              {busy === "metadata" ? "Saving…" : "Save metadata"}
            </Button>
            {!selected.emailConfirmed ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void confirmEmail()}
              >
                Mark email confirmed
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void revokeSessions()}
            >
              {busy === "revoke" ? "Revoking…" : "Revoke all sessions"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => {
                setBanReason(selected.banReason ?? "");
                setBanOpen(true);
              }}
            >
              {banned ? "Un-ban user" : "Ban user"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={createMode !== null}
        onOpenChange={(open) => {
          if (!open) setParam("new", null);
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {createMode === "invite" ? "Invite user" : "Create user"}
            </DialogTitle>
            <DialogDescription>
              {createMode === "invite"
                ? "Creates the account unconfirmed and sends an invitation email."
                : "Creates a confirmed account with the password you set."}
            </DialogDescription>
          </DialogHeader>

          {createError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not continue</AlertTitle>
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-4">
            <Field label="Email" required>
              <FieldInput
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </Field>
            {createMode === "create" ? (
              <Field
                label="Password"
                required
                description="Checked against the project password policy."
              >
                <FieldInput
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </Field>
            ) : null}
            <Field label="user_metadata" optional>
              <FieldTextarea
                value={form.userMetadata}
                rows={4}
                spellCheck={false}
                className="font-mono text-xs"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    userMetadata: event.target.value,
                  }))
                }
              />
              <FieldDescription>JSON object; defaults to {}.</FieldDescription>
            </Field>
            <Field label="app_metadata" optional>
              <FieldTextarea
                value={form.appMetadata}
                rows={4}
                spellCheck={false}
                className="font-mono text-xs"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    appMetadata: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setParam("new", null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy === "create"}
              onClick={() => void submitCreate()}
            >
              {busy === "create"
                ? "Working…"
                : createMode === "invite"
                  ? "Send invite"
                  : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banned ? "Un-ban user" : "Ban user"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banned
                ? "Restores sign-in and clears the ban reason."
                : "Blocks sign-in and revokes every active refresh token."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!banned ? (
            <Field label="Reason" optional>
              <FieldInput
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="Shown to operators only"
              />
            </Field>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void toggleBan(!banned)}
              disabled={busy !== null}
            >
              {banned ? "Un-ban" : "Ban user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes the account, refresh tokens and pending auth
              tokens for {selected?.email ?? "this user"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteUser()}
              disabled={busy !== null}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
