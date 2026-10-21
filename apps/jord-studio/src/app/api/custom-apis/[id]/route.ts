import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(`/custom-apis/${encodeURIComponent(id)}`);
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const upstream = await proxyToJord(`/custom-apis/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(`/custom-apis/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return forwardUpstream(upstream);
}
