import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const upstream = await proxyToJord(
    `/jobs/${encodeURIComponent(id)}/runs${q}`,
  );
  return forwardUpstream(upstream);
}
