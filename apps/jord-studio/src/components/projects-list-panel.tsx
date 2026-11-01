"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { FolderPlus, Plus } from "lucide-react";
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

import {
  engineLabel,
  formatRelativeTime,
  hostFromTarget,
  type ProjectPublic,
} from "@/lib/projects";

type Props = { role: string };

export function ProjectsListPanel({ role }: Props) {
  const [projects, setProjects] = useState<ProjectPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/projects", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as {
      projects?: ProjectPublic[];
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(
        body.message ??
          body.error ??
          (res.status === 503
            ? "Project registry unavailable (is JORD_MASTER_KEY set?)."
            : `Failed to load projects (${res.status})`),
      );
    }
    setProjects(body.projects ?? []);
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    startTransition(async () => {
      try {
        setError(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
        setProjects([]);
      }
    });
  }, [load, role]);

  function archive(id: string, slug: string) {
    if (
      !window.confirm(
        `Archive “${slug}”? Keys are revoked. The database is not dropped.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          setError(body.message ?? body.error ?? `Archive failed (${res.status})`);
          return;
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Archive failed");
      }
    });
  }

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="warning">
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            The projects list is limited to operator admin sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const active = (projects ?? []).filter((p) => p.status === "active");
  const archived = (projects ?? []).filter((p) => p.status === "archived");
  const empty = projects !== null && active.length === 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Control plane
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Register database targets. Studio never puts connection secrets in
            the browser URL or localStorage.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" aria-hidden />
            New project
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {projects === null ? (
        <Alert variant="info">
          <AlertTitle>Loading</AlertTitle>
          <AlertDescription>Fetching project registry…</AlertDescription>
        </Alert>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border px-6 py-12">
          <FolderPlus className="size-8 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold">No projects yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Create a project to register a libSQL file, Turso, or Postgres
              target and get publishable / secret / barrier keys.
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" aria-hidden />
              New project
            </Link>
          </Button>
        </div>
      ) : null}

      {active.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-mono text-sm">{project.slug}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{engineLabel(project.engine)}</Badge>
                </TableCell>
                <TableCell className="max-w-[14rem] truncate font-mono text-xs text-muted-foreground">
                  {hostFromTarget(project.target)}
                </TableCell>
                <TableCell>
                  <Badge>active</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(project.created_at)}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/p/${encodeURIComponent(project.slug)}`}>
                      Open
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${encodeURIComponent(project.id)}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => archive(project.id, project.slug)}
                  >
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {archived.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Archived</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archived.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {project.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{engineLabel(project.engine)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {project.archived_at
                      ? formatRelativeTime(project.archived_at)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
