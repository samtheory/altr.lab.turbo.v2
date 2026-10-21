import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/columns`,
    { method: "POST", body },
  );
  return forwardUpstream(upstream);
}
