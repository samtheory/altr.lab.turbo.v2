import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(`/migrate/jobs/${encodeURIComponent(id)}`);
  return forwardUpstream(upstream);
}
