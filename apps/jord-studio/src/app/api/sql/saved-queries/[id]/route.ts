import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/sql/saved-queries/${encodeURIComponent(id)}`,
  );
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/sql/saved-queries/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/sql/saved-queries/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return forwardUpstream(upstream);
}
