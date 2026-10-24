import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/triggers");
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord("/triggers", { method: "POST", body });
  return forwardUpstream(upstream);
}
