import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/schema/tables");
  return forwardUpstream(upstream);
}
