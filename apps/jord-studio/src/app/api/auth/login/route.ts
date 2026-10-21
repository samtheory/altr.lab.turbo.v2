import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  getServerToken,
  getStudioPassword,
  getStudioRole,
} from "@/lib/auth/config";
import { setSessionCookie } from "@/lib/auth/session";

function safeEqualPassword(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const secret = getServerToken();
  const password = getStudioPassword();
  if (!secret || !password) {
    return NextResponse.json(
      {
        error: "misconfigured",
        message:
          "Set JORD_SERVER_TOKEN and JORD_STUDIO_PASSWORD in apps/jord-studio/.env.local",
      },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "JSON body required" },
      { status: 400 },
    );
  }

  if (typeof body.password !== "string" || !safeEqualPassword(body.password, password)) {
    return NextResponse.json(
      { error: "unauthorized", message: "Invalid password" },
      { status: 401 },
    );
  }

  const role = getStudioRole();
  await setSessionCookie(role);
  return NextResponse.json({ ok: true as const, role });
}
