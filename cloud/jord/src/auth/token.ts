import { createHmac, timingSafeEqual } from "node:crypto";

import type { JordAuthConfig } from "./config.js";
import {
  CURRENT_KID,
  PREVIOUS_KID,
  verifyJwt,
  type JwtKey,
} from "./jwt.js";
import type { Principal } from "./principal.js";
import { isJordRole, type JordRole } from "./roles.js";

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

/** Mint a signed bearer: `base64url(json).base64url(hmac)`. */
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

/**
 * Resolve role from Authorization bearer:
 * 1) Raw shared secret → `defaultRole`
 * 2) Signed session token → claims.role (if unexpired)
 */
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

export type ResolvedAccess = {
  principal: Principal;
  /** Absolute expiry in ms. Null for the raw shared secret. */
  accessExp: number | null;
};

let rawBearerWarned = false;

/** One deprecation line per process. Never includes the secret. */
export function warnRawBearer(mode: string): void {
  if (rawBearerWarned) return;
  rawBearerWarned = true;
  console.warn(
    `[@altr/jord-server] deprecated: raw JORD_SERVER_TOKEN bearer accepted (legacy mode ${mode}). Use an HMAC operator token or an end-user JWT.`,
  );
}

export function resetRawBearerWarning(): void {
  rawBearerWarned = false;
}

/** Env-only key list (tests, and the fallback when no keyring is wired). */
export function jwtEnvKeys(auth: JordAuthConfig): JwtKey[] {
  const keys: JwtKey[] = [];
  if (auth.jwtSecret) keys.push({ kid: CURRENT_KID, secret: auth.jwtSecret });
  if (auth.jwtSecretPrevious) {
    keys.push({ kid: PREVIOUS_KID, secret: auth.jwtSecretPrevious });
  }
  return keys;
}

/**
 * Resolve the request principal:
 * 1. Raw shared secret → operator (`admin` escape) or `service` / `service_role`
 * 2. HS256 JWT → `user` or `anon` (never an operator)
 * 3. HMAC session token → `operator`
 */
export function resolvePrincipal(
  bearer: string,
  auth: JordAuthConfig,
  nowMs: number = Date.now(),
): ResolvedAccess | null {
  return resolvePrincipalWithKeys(bearer, auth, jwtEnvKeys(auth), nowMs);
}

/** Same resolution, with an explicit key list (per-project keyring, S0071). */
export function resolvePrincipalWithKeys(
  bearer: string,
  auth: JordAuthConfig,
  keys: JwtKey[],
  nowMs: number = Date.now(),
): ResolvedAccess | null {
  if (!bearer) return null;

  if (safeEqualString(bearer, auth.secret)) {
    warnRawBearer(auth.legacyMode);
    if (auth.legacyMode === "service") {
      return {
        principal: {
          kind: "service",
          role: "service_role",
          claims: { legacy: true },
        },
        accessExp: null,
      };
    }
    return {
      principal: {
        kind: "operator",
        role: auth.defaultRole,
        claims: { legacy: true },
      },
      accessExp: null,
    };
  }

  if (bearer.split(".").length === 3 && keys.length > 0) {
    const claims = verifyJwt(bearer, {
      keys,
      iss: auth.jwtIss,
      aud: auth.jwtAud,
      nowMs,
    });
    if (!claims) return null;
    if (claims.role === "anon") {
      return {
        principal: {
          kind: "anon",
          role: "anon",
          claims: { iss: claims.iss, aud: claims.aud },
        },
        accessExp: claims.exp * 1000,
      };
    }
    if (claims.role !== "user") return null;
    return {
      principal: {
        kind: "user",
        uid: claims.sub,
        role: "user",
        claims: {
          iss: claims.iss,
          aud: claims.aud,
          sub: claims.sub,
          ...(claims.email ? { email: claims.email } : {}),
          ...(typeof claims.sid === "string" ? { sid: claims.sid } : {}),
        },
      },
      accessExp: claims.exp * 1000,
    };
  }

  const dot = bearer.indexOf(".");
  if (dot <= 0 || dot !== bearer.lastIndexOf(".")) return null;
  const payload = bearer.slice(0, dot);
  const sig = bearer.slice(dot + 1);
  const expected = createHmac("sha256", auth.secret)
    .update(payload)
    .digest("base64url");
  if (!safeEqualString(sig, expected)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
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
  return {
    principal: { kind: "operator", role, claims: {} },
    accessExp: exp,
  };
}

export function parseAuthorizationHeader(
  header: string | undefined | null,
): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return null;
  return match[1].trim();
}
