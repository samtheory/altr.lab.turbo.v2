import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function POST(request: Request) {
  const upstream = await proxyToJord("/sql/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
  return forwardUpstream(upstream);
}
