import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}${url.search}`,
  );
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}${url.search}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { name } = await context.params;
  const url = new URL(request.url);
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}${url.search}`,
    { method: "DELETE", body: body || JSON.stringify({ confirm: true }) },
  );
  return forwardUpstream(upstream);
}
