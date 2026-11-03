import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";
import { STATS_WINDOWS, type StatsWindow } from "@/lib/studio-dashboard";

type Ctx = { params: Promise<{ id: string }> };

/** S0096: admin-session proxy for GET /admin/projects/:id/stats. `window` is validated here too. */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  // Project ids and slugs are lowercase words, digits, `-` and `_` (a UUID also fits); reject the rest early.
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) {
    return Response.json({ error: "invalid_project", message: "invalid project id" }, { status: 400 });
  }
  const raw = new URL(request.url).searchParams.get("window") ?? "1h";
  if (!(STATS_WINDOWS as readonly string[]).includes(raw)) {
    return Response.json(
      { error: "invalid_window", message: "window must be 1h, 24h or 7d" },
      { status: 400 },
    );
  }
  const window = raw as StatsWindow;
  return forwardUpstream(
    await proxyToJord(
      `/admin/projects/${encodeURIComponent(id)}/stats?window=${window}`,
      undefined,
      { skipProjectScope: true },
    ),
  );
}
