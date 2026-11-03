import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  const upstream = await proxyToJord(
    `/admin/buckets/${encodeURIComponent(name)}`,
  );
  return forwardUpstream(upstream);
}

export async function PATCH(request: Request, { params }: Params) {
  const { name } = await params;
  const upstream = await proxyToJord(
    `/admin/buckets/${encodeURIComponent(name)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return forwardUpstream(upstream);
}
