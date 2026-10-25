"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

type User = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  disabledAt: number | null;
  createdAt: number;
};

type Props = { role: string };

export function UsersAdminPanel({ role }: Props) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load users (${res.status})`);
    }
    const body = (await res.json()) as { users: User[] };
    setUsers(body.users);
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    startTransition(async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      }
    });
  }, [load, role]);

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            User admin is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Auth
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Users
        </h1>
        <p className="text-sm text-muted-foreground">
          Disable a user or revoke refresh-token families. Passwords are never
          shown.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-sm">{user.email}</TableCell>
              <TableCell>
                {user.disabledAt != null ? (
                  <Badge variant="destructive">disabled</Badge>
                ) : user.emailConfirmed ? (
                  <Badge>active</Badge>
                ) : (
                  <Badge variant="secondary">unconfirmed</Badge>
                )}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await fetch(`/api/admin/users/${user.id}/revoke`, {
                        method: "POST",
                      });
                      await load();
                    });
                  }}
                >
                  Revoke sessions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await fetch(`/api/admin/users/${user.id}/disable`, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          disabled: user.disabledAt == null,
                        }),
                      });
                      await load();
                    });
                  }}
                >
                  {user.disabledAt == null ? "Disable" : "Enable"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
