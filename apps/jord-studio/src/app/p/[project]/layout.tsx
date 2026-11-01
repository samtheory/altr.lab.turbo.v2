import { notFound } from "next/navigation";

import { ProjectArchived } from "@/components/project-archived";
import { resolveStudioProject } from "@/lib/project-resolve";

type Props = {
  children: React.ReactNode;
  params: Promise<{ project: string }>;
};

export default async function ProjectScopedLayout({ children, params }: Props) {
  const { project: raw } = await params;
  let slug: string;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    notFound();
  }

  const resolved = await resolveStudioProject(slug);
  if (!resolved.ok) {
    if (resolved.status === 410) {
      return (
        <ProjectArchived
          slug={slug}
          reason={resolved.reason ?? "This project is archived."}
        />
      );
    }
    notFound();
  }

  return children;
}
