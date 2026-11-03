import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardUpstream(
    await proxyToJord(`/admin/auth/users/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
    }),
  );
}
