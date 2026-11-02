import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const upstream = await proxyToJord(
    qs ? `/sql/saved-queries?${qs}` : "/sql/saved-queries",
  );
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const upstream = await proxyToJord("/sql/saved-queries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await request.text(),
  });
  return forwardUpstream(upstream);
}
