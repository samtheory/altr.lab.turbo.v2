import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type RouteContext = { params: Promise<{ name: string; column: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { name, column } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/columns/${encodeURIComponent(column)}`,
    { method: "PATCH", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { name, column } = await context.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/schema/tables/${encodeURIComponent(name)}/columns/${encodeURIComponent(column)}`,
    {
      method: "DELETE",
      body: body || JSON.stringify({ confirm: true }),
    },
  );
  return forwardUpstream(upstream);
}
