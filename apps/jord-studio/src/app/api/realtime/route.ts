import { getSession } from "@/lib/auth/session";
import { canSubscribeRealtime } from "@/lib/auth/roles";
import { getJordServerUrl } from "@/lib/jord-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Same-origin SSE for Studio. EventSource cannot set Authorization;
 * this route attaches the session bearer and proxies jord-server.
 * The browser never opens data/jord.db.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "unauthorized", message: "Sign in to Studio before subscribing." },
      { status: 401 },
    );
  }
  if (!canSubscribeRealtime(session.role)) {
    return Response.json(
      { error: "forbidden", message: "This role cannot subscribe to live updates." },
      { status: 403 },
    );
  }

  const incoming = new URL(request.url);
  const table = incoming.searchParams.get("table") ?? "records";
  const id = incoming.searchParams.get("id");
  const qs = new URLSearchParams({ table });
  if (id) qs.set("id", id);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${getJordServerUrl()}/realtime?${qs.toString()}`,
      {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${session.bearer}`,
        },
        cache: "no-store",
        signal: request.signal,
      },
    );
  } catch {
    return Response.json(
      {
        error: "jord_unreachable",
        message:
          "Cannot reach jord-server. Start it with `pnpm dev:jord` (default http://127.0.0.1:8787).",
      },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
