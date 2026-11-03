import { ProjectDashboard } from "@/components/project-dashboard";
import { getJordServerUrl, proxyToJord } from "@/lib/jord-proxy";
import { resolveStudioProject } from "@/lib/project-resolve";
import { parseStatsWindow } from "@/lib/studio-dashboard";
import type { ProjectPublic } from "@/lib/projects";

type Props = {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
};

export default async function ProjectHomePage({ params, searchParams }: Props) {
  const { project: raw } = await params;
  const slug = decodeURIComponent(raw);
  const resolved = await resolveStudioProject(slug);
  if (!resolved.ok) {
    return null;
  }
  const sp = await searchParams;

  // Public registry record (key prefix + last4 only; hashes/plaintext never leave the server).
  let project: ProjectPublic | null = null;
  if (!resolved.project.isDefault) {
    const upstream = await proxyToJord(
      `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
      undefined,
      { skipProjectScope: true },
    );
    if (upstream.ok) {
      const body = (await upstream.json().catch(() => ({}))) as { project?: ProjectPublic };
      project = body.project ?? null;
    }
  }

  return (
    <ProjectDashboard
      slug={slug}
      serverUrl={getJordServerUrl()}
      project={project}
      initialWindow={parseStatsWindow(sp.window)}
    />
  );
}
