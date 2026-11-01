import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

const CTRL = { skipProjectScope: true } as const;

export async function GET() {
  const upstream = await proxyToJord("/admin/projects", undefined, CTRL);
  return forwardUpstream(upstream);
}

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await proxyToJord(
    "/admin/projects",
    { method: "POST", body },
    CTRL,
  );
  return forwardUpstream(upstream);
}
