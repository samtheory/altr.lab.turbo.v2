import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string; pk: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { name, pk } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(pk)}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { name, pk } = await context.params;
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(pk)}`,
    { method: "DELETE" },
  );
  return forwardUpstream(upstream);
}
