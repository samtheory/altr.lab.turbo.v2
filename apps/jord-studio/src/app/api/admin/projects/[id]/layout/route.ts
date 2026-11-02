import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

const CTRL = { skipProjectScope: true } as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = `/admin/projects/${encodeURIComponent(id)}/layout${
    qs ? `?${qs}` : ""
  }`;
  const upstream = await proxyToJord(path, undefined, CTRL);
  return forwardUpstream(upstream);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const upstream = await proxyToJord(
    `/admin/projects/${encodeURIComponent(id)}/layout`,
    { method: "PUT", body },
    CTRL,
  );
  return forwardUpstream(upstream);
}
