import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const qs = bucket != null ? `?bucket=${encodeURIComponent(bucket)}` : "";
  const upstream = await proxyToJord(`/records${qs}`);
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord("/records", {
    method: "POST",
    body,
  });
  return forwardUpstream(upstream);
}
