import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/admin/auth/users");
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const upstream = await proxyToJord("/admin/auth/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
  return forwardUpstream(upstream);
}
