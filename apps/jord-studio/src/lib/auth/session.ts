import { cookies } from "next/headers";

import {
  getDefaultServerRole,
  getServerToken,
  getStudioRole,
  isStudioOpenBypass,
  SESSION_COOKIE,
} from "./config";
import type { JordRole } from "./roles";
import {
  DEFAULT_SESSION_TTL_MS,
  resolveBearerRole,
  signSessionToken,
} from "./token";

export type StudioSession = {
  role: JordRole;
  /** Bearer value to forward to jord-server. */
  bearer: string;
  /** True when session came from `JORD_STUDIO_OPEN=1` bypass (no cookie). */
  bypass: boolean;
};

export async function getSession(): Promise<StudioSession | null> {
  const secret = getServerToken();
  if (!secret) return null;

  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (cookie) {
    const role = resolveBearerRole(cookie, secret, getDefaultServerRole());
    if (role) {
      return { role, bearer: cookie, bypass: false };
    }
  }

  if (isStudioOpenBypass()) {
    const role = getStudioRole();
    const bearer = signSessionToken(role, secret);
    return { role, bearer, bypass: true };
  }

  return null;
}

export async function setSessionCookie(role: JordRole): Promise<void> {
  const secret = getServerToken();
  if (!secret) {
    throw new Error("JORD_SERVER_TOKEN is not configured");
  }
  const token = signSessionToken(role, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(DEFAULT_SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
