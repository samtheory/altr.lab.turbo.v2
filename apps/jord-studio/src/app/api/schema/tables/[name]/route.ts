import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params;
  const upstream = await proxyToJord(`/schema/tables/${encodeURIComponent(name)}`);
  return forwardUpstream(upstream);
}
