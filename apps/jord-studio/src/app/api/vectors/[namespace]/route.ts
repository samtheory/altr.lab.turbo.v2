import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ namespace: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { namespace } = await params;
  const upstream = await proxyToJord(
    `/vectors/${encodeURIComponent(namespace)}`,
  );
  return forwardUpstream(upstream);
}
