import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/vectors/namespaces");
  return forwardUpstream(upstream);
}
