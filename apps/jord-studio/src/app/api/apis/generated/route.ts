import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/apis/generated");
  return forwardUpstream(upstream);
}
