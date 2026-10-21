import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = await proxyToJord(`/records/${encodeURIComponent(id)}`);
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(`/records/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = await proxyToJord(`/records/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return forwardUpstream(upstream);
}
