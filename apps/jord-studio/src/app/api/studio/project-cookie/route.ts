import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_PROJECT_SLUG,
  PROJECT_COOKIE,
  PROJECT_COOKIE_MAX_AGE_SEC,
} from "@/lib/project-scope";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim()
      : DEFAULT_PROJECT_SLUG;

  const response = NextResponse.json({ ok: true as const, slug });
  response.cookies.set(PROJECT_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PROJECT_COOKIE_MAX_AGE_SEC,
  });
  return response;
}
