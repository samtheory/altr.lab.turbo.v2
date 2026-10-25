import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Ctx = { params: Promise<{ table: string }> };

async function forward(request: Request, ctx: Ctx, method: string) {
  const { table } = await ctx.params;
  const url = new URL(request.url);
  const headers = new Headers();
  const prefer = request.headers.get("prefer");
  if (prefer) headers.set("prefer", prefer);
  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
  const upstream = await proxyToJord(`/api/v1/${encodeURIComponent(table)}${url.search}`, {
    method,
    headers,
    body,
  });
  return forwardUpstream(upstream);
}

export function GET(request: Request, ctx: Ctx) {
  return forward(request, ctx, "GET");
}

export function POST(request: Request, ctx: Ctx) {
  return forward(request, ctx, "POST");
}

export function PATCH(request: Request, ctx: Ctx) {
  return forward(request, ctx, "PATCH");
}

export function DELETE(request: Request, ctx: Ctx) {
  return forward(request, ctx, "DELETE");
}
