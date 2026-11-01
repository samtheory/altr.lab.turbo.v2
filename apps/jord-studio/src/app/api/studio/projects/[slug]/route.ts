import { resolveStudioProject } from "@/lib/project-resolve";
import { getSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug: raw } = await ctx.params;
  let slug: string;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    return Response.json({ error: "project_not_found" }, { status: 404 });
  }
  const resolved = await resolveStudioProject(slug);
  if (!resolved.ok) {
    return Response.json(
      {
        error: resolved.error,
        ...(resolved.reason ? { reason: resolved.reason } : {}),
      },
      { status: resolved.status },
    );
  }
  return Response.json({ project: resolved.project });
}
