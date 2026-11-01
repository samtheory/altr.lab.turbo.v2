import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/admin/projects");
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord("/admin/projects", {
    method: "POST",
    body,
  });
  return forwardUpstream(upstream);
}
