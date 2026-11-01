import { ProjectsListPanel } from "@/components/projects-list-panel";
import { getSession } from "@/lib/auth/session";

export default async function ProjectsPage() {
  const session = await getSession();
  return <ProjectsListPanel role={session?.role ?? "readonly"} />;
}
