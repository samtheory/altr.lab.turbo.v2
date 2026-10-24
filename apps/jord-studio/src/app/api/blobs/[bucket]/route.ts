import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ bucket: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { bucket } = await params;
  const upstream = await proxyToJord(`/blobs/${encodeURIComponent(bucket)}`);
  return forwardUpstream(upstream);
}
