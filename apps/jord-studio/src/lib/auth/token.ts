import { createHmac, timingSafeEqual } from "node:crypto";

import { isJordRole, type JordRole } from "./roles";

export type JordSessionClaims = {
  role: JordRole;
  exp: number;
};

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function signSessionToken(
  role: JordRole,
  secret: string,
  ttlMs: number = DEFAULT_SESSION_TTL_MS,
  nowMs: number = Date.now(),
): string {
  const claims: JordSessionClaims = { role, exp: nowMs + ttlMs };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function resolveBearerRole(
  bearer: string,
  secret: string,
  defaultRole: JordRole,
  nowMs: number = Date.now(),
): JordRole | null {
  if (!bearer) return null;

  if (safeEqualString(bearer, secret)) {
    return defaultRole;
  }

  const dot = bearer.indexOf(".");
  if (dot <= 0 || dot === bearer.length - 1) return null;
  const payload = bearer.slice(0, dot);
  const sig = bearer.slice(dot + 1);
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (!safeEqualString(sig, expected)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;
  } catch {
    return null;
  }

  if (
    typeof claims !== "object" ||
    claims === null ||
    !("role" in claims) ||
    !("exp" in claims)
  ) {
    return null;
  }

  const role = (claims as { role: unknown }).role;
  const exp = (claims as { exp: unknown }).exp;
  if (typeof role !== "string" || !isJordRole(role)) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp < nowMs) {
    return null;
  }
  return role;
}
