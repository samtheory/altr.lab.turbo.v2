import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "50";
  const offset = url.searchParams.get("offset") ?? "0";
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
  );
  return forwardUpstream(upstream);
}

export async function POST(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows`,
    { method: "POST", body },
  );
  return forwardUpstream(upstream);
}

