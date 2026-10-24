import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ namespace: string; id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { namespace, id } = await params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/vectors/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`,
    { method: "PUT", body },
  );
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { namespace, id } = await params;
  const upstream = await proxyToJord(
    `/vectors/${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return forwardUpstream(upstream);
}
