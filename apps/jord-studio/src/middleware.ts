import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/config";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-jord-pathname", pathname);

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const openBypass = process.env.JORD_STUDIO_OPEN === "1";

  if (!isPublic && !hasSession && !openBypass) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && (hasSession || openBypass)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
