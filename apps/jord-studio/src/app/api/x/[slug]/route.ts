import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ slug: string }> };

async function proxyX(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
  const url = new URL(request.url);
  const qs = url.search;
  const upstream = await proxyToJord(`/x/${encodeURIComponent(slug)}${qs}`, {
    method: request.method,
    body,
  });
  return forwardUpstream(upstream);
}

export const GET = proxyX;
export const POST = proxyX;
export const PATCH = proxyX;
export const DELETE = proxyX;
