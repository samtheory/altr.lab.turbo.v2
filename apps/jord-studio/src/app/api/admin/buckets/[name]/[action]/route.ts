import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ name: string; action: string }> };

const ACTIONS = new Set(["test", "rotate", "pause", "resume"]);

export async function POST(request: Request, { params }: Params) {
  const { name, action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json(
      { error: "unknown_action", message: `Unsupported bucket action "${action}".` },
      { status: 404 },
    );
  }
  const upstream = await proxyToJord(
    `/admin/buckets/${encodeURIComponent(name)}/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return forwardUpstream(upstream);
}
