import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string; pk: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { name, pk } = await context.params;
  const url = new URL(request.url);
  const schema = url.searchParams.get("schema");
  const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(pk)}${qs}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { name, pk } = await context.params;
  const url = new URL(request.url);
  const schema = url.searchParams.get("schema");
  const qs = schema ? `?schema=${encodeURIComponent(schema)}` : "";
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(pk)}${qs}`,
    { method: "DELETE" },
  );
  return forwardUpstream(upstream);
}
