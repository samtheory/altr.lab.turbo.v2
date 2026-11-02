import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

function rowsQuery(url: URL): string {
  const limit = url.searchParams.get("limit") ?? "50";
  const offset = url.searchParams.get("offset") ?? "0";
  const qs = new URLSearchParams({ limit, offset });
  const schema = url.searchParams.get("schema");
  if (schema) qs.set("schema", schema);
  return qs.toString();
}

export async function GET(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows?${rowsQuery(url)}`,
  );
  return forwardUpstream(upstream);
}

export async function POST(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const schema = url.searchParams.get("schema");
  const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows${qs}`,
    { method: "POST", body },
  );
  return forwardUpstream(upstream);
}
