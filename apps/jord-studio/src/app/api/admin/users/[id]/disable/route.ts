import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const upstream = await proxyToJord(
    `/admin/users/${encodeURIComponent(id)}/disable`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    },
  );
  return forwardUpstream(upstream);
}
