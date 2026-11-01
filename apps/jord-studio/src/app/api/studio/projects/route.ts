import { listStudioProjectsForSwitcher } from "@/lib/project-resolve";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const projects = await listStudioProjectsForSwitcher();
  return Response.json({ projects });
}
