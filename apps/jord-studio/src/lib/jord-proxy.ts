/**
 * Server-only helper: forward Studio BFF traffic to @altr/jord-server.
 * Never imports @libsql/client or touches data/jord.db.
 */

import { cookies, headers } from "next/headers";

import { getSession } from "@/lib/auth/session";
import {
  PROJECT_COOKIE,
  PROJECT_HEADER,
  assertProjectScopeMatch,
} from "@/lib/project-scope";

const DEFAULT_JORD_SERVER_URL = "http://127.0.0.1:8787";

export function getJordServerUrl(): string {
  const raw = process.env.JORD_SERVER_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_JORD_SERVER_URL).replace(
    /\/$/,
    "",
  );
}

export type ProxyToJordOptions = {
  /** Skip cookie/header project scope checks (control-plane / resolve). */
  skipProjectScope?: boolean;
};

export async function proxyToJord(
  pathWithQuery: string,
  init?: RequestInit,
  options?: ProxyToJordOptions,
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json(
      {
        error: "unauthorized",
        message: "Sign in to Studio before calling jord-server.",
      },
      { status: 401 },
    );
  }

  let projectSlug: string | null = null;
  if (!options?.skipProjectScope) {
    const cookieStore = await cookies();
    const hdrs = await headers();
    const cookieSlug = cookieStore.get(PROJECT_COOKIE)?.value ?? null;
    const headerSlug = hdrs.get(PROJECT_HEADER);
    const scope = assertProjectScopeMatch(cookieSlug, headerSlug);
    if (!scope.ok) {
      return Response.json(
        {
          error: scope.error,
          message:
            "Active project cookie does not match the requested project scope.",
        },
        { status: scope.status },
      );
    }
    projectSlug = scope.slug;
  }

  const url = `${getJordServerUrl()}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;

  try {
    const requestHeaders = new Headers(init?.headers);
    if (init?.body && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }
    requestHeaders.set("Authorization", `Bearer ${session.bearer}`);
    if (projectSlug) {
      requestHeaders.set("X-Jord-Project", projectSlug);
    }

    return await fetch(url, {
      ...init,
      headers: requestHeaders,
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
  const headersOut = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headersOut.set("Content-Type", contentType);
  // Admin data: never cached by the browser or a shared proxy.
  headersOut.set("Cache-Control", "no-store");
  return new Response(body, { status: upstream.status, headers: headersOut });
}
