import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const upstream = await proxyToJord(`/schema/tables${url.search}`);
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.text();
  const upstream = await proxyToJord(`/schema/tables${url.search}`, {
    method: "POST",
    body,
  });
  return forwardUpstream(upstream);
}
