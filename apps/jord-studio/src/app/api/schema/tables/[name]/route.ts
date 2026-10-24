import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params;
  const upstream = await proxyToJord(`/schema/tables/${encodeURIComponent(name)}`);
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { name } = await context.params;
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
  return forwardUpstream(upstream);
}
