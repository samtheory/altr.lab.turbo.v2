import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ resource: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const upstream = await proxyToJord(
    `/apis/generated/${encodeURIComponent(resource)}`,
  );
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/apis/generated/${encodeURIComponent(resource)}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}
