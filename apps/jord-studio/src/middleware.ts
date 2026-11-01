import { NextResponse, type NextRequest } from "next/server";

import { isStudioOpenBypass, SESSION_COOKIE } from "@/lib/auth/config";
import {
  DEFAULT_PROJECT_SLUG,
  PROJECT_COOKIE,
  PROJECT_COOKIE_MAX_AGE_SEC,
  extractProjectSlug,
  isProjectScopedPath,
} from "@/lib/project-scope";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

function withProjectCookie(response: NextResponse, slug: string): NextResponse {
  response.cookies.set(PROJECT_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PROJECT_COOKIE_MAX_AGE_SEC,
  });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-jord-pathname", pathname);

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const openBypass = isStudioOpenBypass();

  if (!isPublic && !hasSession && !openBypass) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && (hasSession || openBypass)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Legacy unscoped screens → /p/<cookie|default>/…
  if (isProjectScopedPath(pathname)) {
    const slug =
      request.cookies.get(PROJECT_COOKIE)?.value?.trim() || DEFAULT_PROJECT_SLUG;
    const target = new URL(`/p/${encodeURIComponent(slug)}${pathname}`, request.url);
    target.search = request.nextUrl.search;
    return withProjectCookie(NextResponse.redirect(target), slug);
  }

  const projectSlug = extractProjectSlug(pathname);
  if (projectSlug) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withProjectCookie(response, projectSlug);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
