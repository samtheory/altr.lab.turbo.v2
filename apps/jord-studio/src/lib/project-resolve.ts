import { proxyToJord } from "@/lib/jord-proxy";
import {
  DEFAULT_PROJECT_SLUG,
  DEFAULT_PROJECT_SUMMARY,
  type StudioProjectSummary,
} from "@/lib/project-scope";

export type ResolveProjectResult =
  | { ok: true; project: StudioProjectSummary }
  | { ok: false; status: 404 | 410; error: string; reason?: string };

/**
 * Server-side project resolution for `/p/[project]` layouts.
 * `default` never hits the registry (env-backed primary DB).
 */
export async function resolveStudioProject(
  slug: string,
): Promise<ResolveProjectResult> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { ok: false, status: 404, error: "project_not_found" };
  }
  if (trimmed === DEFAULT_PROJECT_SLUG) {
    return { ok: true, project: DEFAULT_PROJECT_SUMMARY };
  }

  const upstream = await proxyToJord(
    `/studio/projects/${encodeURIComponent(trimmed)}`,
    undefined,
    { skipProjectScope: true },
  );

  if (upstream.status === 404 || upstream.status === 410) {
    const body = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
    };
    return {
      ok: false,
      status: upstream.status,
      error: body.error ?? "project_not_found",
      reason: body.reason,
    };
  }

  if (!upstream.ok) {
    return { ok: false, status: 404, error: "project_not_found" };
  }

  const body = (await upstream.json()) as {
    project?: {
      slug: string;
      engine: StudioProjectSummary["engine"];
      status: string;
      target: string;
    };
  };
  const project = body.project;
  if (!project || project.status !== "active") {
    return {
      ok: false,
      status: project?.status === "archived" ? 410 : 404,
      error:
        project?.status === "archived" ? "project_archived" : "project_not_found",
      reason:
        project?.status === "archived"
          ? "project is archived; keys are revoked"
          : undefined,
    };
  }

  return {
    ok: true,
    project: {
      slug: project.slug,
      engine: project.engine,
      status: "active",
      target: project.target,
      isDefault: false,
    },
  };
}

export async function listStudioProjectsForSwitcher(): Promise<
  StudioProjectSummary[]
> {
  const out: StudioProjectSummary[] = [DEFAULT_PROJECT_SUMMARY];
  const upstream = await proxyToJord("/studio/projects", undefined, {
    skipProjectScope: true,
  });
  if (!upstream.ok) return out;
  const body = (await upstream.json().catch(() => ({}))) as {
    projects?: Array<{
      slug: string;
      engine: StudioProjectSummary["engine"];
      status: string;
      target: string;
    }>;
  };
  for (const p of body.projects ?? []) {
    if (p.slug === DEFAULT_PROJECT_SLUG) continue;
    out.push({
      slug: p.slug,
      engine: p.engine,
      status: "active",
      target: p.target,
      isDefault: false,
    });
  }
  return out;
}
