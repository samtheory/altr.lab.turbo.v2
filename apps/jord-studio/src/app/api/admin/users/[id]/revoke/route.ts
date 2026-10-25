import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/admin/users/${encodeURIComponent(id)}/revoke`,
    { method: "POST" },
  );
  return forwardUpstream(upstream);
}
