import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const upstream = await proxyToJord(
    qs ? `/sql/history?${qs}` : "/sql/history",
  );
  return forwardUpstream(upstream);
}
