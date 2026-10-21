/**
 * Server-only helper: forward Studio BFF traffic to @altr/jord-server.
 * Never imports @libsql/client or touches data/jord.db.
 */

const DEFAULT_JORD_SERVER_URL = "http://127.0.0.1:8787";

export function getJordServerUrl(): string {
  const raw = process.env.JORD_SERVER_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_JORD_SERVER_URL).replace(/\/$/, "");
}

export async function proxyToJord(
  pathWithQuery: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${getJordServerUrl()}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;

  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
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
}

/** Pass upstream status + body through to the Studio origin (keeps 409 intact). */
export async function forwardUpstream(upstream: Response): Promise<Response> {
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(body, { status: upstream.status, headers });
}
