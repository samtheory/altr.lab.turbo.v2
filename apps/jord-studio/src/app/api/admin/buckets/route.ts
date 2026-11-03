import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  const upstream = await proxyToJord("/admin/buckets");
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord("/admin/buckets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardUpstream(upstream);
}
