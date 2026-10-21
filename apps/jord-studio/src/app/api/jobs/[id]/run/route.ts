import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstream = await proxyToJord(`/jobs/${encodeURIComponent(id)}/run`, {
    method: "POST",
  });
  return forwardUpstream(upstream);
}
