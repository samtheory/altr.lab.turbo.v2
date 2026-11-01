import { ProjectForm } from "@/components/project-form";
import { getSession } from "@/lib/auth/session";

export default async function NewProjectPage() {
  const session = await getSession();
  return <ProjectForm mode="create" role={session?.role ?? "readonly"} />;
}
