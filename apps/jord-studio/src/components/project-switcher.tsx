"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@altr/apolyx";

import {
  DEFAULT_PROJECT_SLUG,
  DEFAULT_PROJECT_SUMMARY,
  extractProjectRestPath,
  extractProjectSlug,
  projectHref,
  type StudioProjectSummary,
} from "@/lib/project-scope";
import { engineLabel, hostFromTarget } from "@/lib/projects";

function labelFor(project: StudioProjectSummary): string {
  if (project.isDefault) return "default (env)";
  return project.slug;
}

function engineBadge(project: StudioProjectSummary): string {
  if (project.engine === "env") return "env";
  return engineLabel(project.engine);
}

export function ProjectSwitcher() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const activeSlug = extractProjectSlug(pathname);
  const [projects, setProjects] = useState<StudioProjectSummary[]>([
    DEFAULT_PROJECT_SUMMARY,
  ]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/studio/projects", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          projects?: StudioProjectSummary[];
        };
        if (!cancelled && body.projects?.length) {
          setProjects(body.projects);
        }
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!activeSlug) return null;

  const value = activeSlug;
  const rest = extractProjectRestPath(pathname);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        value={value}
        disabled={isPending}
        onValueChange={(next) => {
          if (!next || next === value) return;
          startTransition(() => {
            void (async () => {
              await fetch("/api/studio/project-cookie", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: next }),
              });
              const target = projectHref(next, rest || "");
              router.push(target);
              router.refresh();
            })();
          });
        }}
      >
        <SelectTrigger
          aria-label="Active project"
          className="h-8 w-[min(100%,12rem)] sm:w-44"
        >
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.slug} value={project.slug}>
              <span className="flex flex-col gap-0.5 py-0.5 text-left">
                <span className="font-mono text-xs">{labelFor(project)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {engineBadge(project)}
                  {!project.isDefault
                    ? ` · ${hostFromTarget(project.target)}`
                    : ""}
                </span>
              </span>
            </SelectItem>
          ))}
          {activeSlug !== DEFAULT_PROJECT_SLUG &&
          !projects.some((p) => p.slug === activeSlug) ? (
            <SelectItem value={activeSlug}>
              <span className="font-mono text-xs">{activeSlug}</span>
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="hidden shrink-0 text-[10px] uppercase lg:inline-flex">
        {isPending ? "…" : "project"}
      </Badge>
    </div>
  );
}
