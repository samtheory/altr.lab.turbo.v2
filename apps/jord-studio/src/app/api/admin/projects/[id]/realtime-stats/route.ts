import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

/** S0086: admin-session proxy for GET /admin/projects/:id/realtime-stats. */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) {
    return Response.json({ error: "invalid_project", message: "invalid project id" }, { status: 400 });
  }
  return forwardUpstream(
    await proxyToJord(
      `/admin/projects/${encodeURIComponent(id)}/realtime-stats`,
      undefined,
      { skipProjectScope: true },
    ),
  );
}
