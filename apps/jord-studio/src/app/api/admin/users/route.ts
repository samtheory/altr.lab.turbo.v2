import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/admin/users");
  return forwardUpstream(upstream);
}
