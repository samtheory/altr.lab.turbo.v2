import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ namespace: string }> };

export async function POST(request: Request, { params }: Params) {
  const { namespace } = await params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/vectors/${encodeURIComponent(namespace)}/search`,
    { method: "POST", body },
  );
  return forwardUpstream(upstream);
}
