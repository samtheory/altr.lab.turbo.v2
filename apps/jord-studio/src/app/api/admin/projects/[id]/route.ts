import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

const CTRL = { skipProjectScope: true } as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/admin/projects/${encodeURIComponent(id)}`,
    undefined,
    CTRL,
  );
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/admin/projects/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
    CTRL,
  );
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/admin/projects/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    CTRL,
  );
  return forwardUpstream(upstream);
}
