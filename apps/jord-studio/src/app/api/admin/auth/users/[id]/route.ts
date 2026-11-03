import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ id: string }> };

function userPath(id: string): string {
  return `/admin/auth/users/${encodeURIComponent(id)}`;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardUpstream(await proxyToJord(userPath(id)));
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardUpstream(
    await proxyToJord(userPath(id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    }),
  );
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardUpstream(
    await proxyToJord(userPath(id), { method: "DELETE" }),
  );
}
