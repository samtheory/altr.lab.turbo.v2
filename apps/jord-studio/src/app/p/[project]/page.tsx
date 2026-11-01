import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@altr/apolyx";

import { resolveStudioProject } from "@/lib/project-resolve";
import { engineLabel } from "@/lib/projects";
import { projectHref } from "@/lib/project-scope";

type Props = { params: Promise<{ project: string }> };

export default async function ProjectHomePage({ params }: Props) {
  const { project: raw } = await params;
  const slug = decodeURIComponent(raw);
  const resolved = await resolveStudioProject(slug);
  if (!resolved.ok) {
    return null;
  }
  const { project } = resolved;
  const engine =
    project.engine === "env" ? "Primary (env)" : engineLabel(project.engine);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Project
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {project.slug}
        </h1>
        <p className="text-sm text-muted-foreground">
          {engine}
          {project.isDefault
            ? " · env-backed database from JORD_SERVER_URL"
            : ` · ${project.target}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={projectHref(slug, "/tables")}>
            Tables <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={projectHref(slug, "/database/sql")}>SQL console</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/projects">All projects</Link>
        </Button>
      </div>
    </div>
  );
}
