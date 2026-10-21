import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/functions/${encodeURIComponent(id)}/invoke`,
    { method: "POST", body },
  );
  return forwardUpstream(upstream);
}
