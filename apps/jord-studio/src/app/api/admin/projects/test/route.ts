import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord(
    "/admin/projects/test",
    { method: "POST", body },
    { skipProjectScope: true },
  );
  return forwardUpstream(upstream);
}
