import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import {
  type SecretPort,
  AUTH_RATE_LIMIT_KEYS,
  type AuthRateLimitKey,
  type JordDriverPort,
} from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import {
  confirmUser,
  consumeMagicLink,
  issueRefreshToken,
  normalizeEmail,
  recoverUser,
  requestMagicLink,
  resetUserPassword,
  revokeRefreshFamily,
  rotateRefreshToken,
  signinUser,
  signupUser,
} from "./identity.js";
import { ACCESS_TTL_SEC, ANON_TTL_SEC, signAccessToken } from "./jwt.js";
import type { JwtKeyring } from "./keyring.js";
import {
  clientIp,
  issueUserSession,
  listSessions,
  renewSession,
  revokeAllSessions,
  revokeSession,
} from "./sessions.js";
import { createOAuthRoutes, type OAuthFetch } from "./oauth.js";
import type { MailerPort } from "./mailer.js";
import {
  createAuthMiddleware,
  requireOperatorAdmin,
  type JordAuthVariables,
} from "./middleware.js";
import {
  createMemoryRateLimitStore,
  type RateLimitStore,
} from "../http/rate-limit-store.js";
import {
  loadAuthSettings,
  validateRedirectParam,
  type JordAuthSettings,
} from "./settings.js";

const WINDOW_MS = 60_000;

function authEndpoint(path: string): AuthRateLimitKey | null {
  const last = path.slice(path.lastIndexOf("/") + 1);
  return (AUTH_RATE_LIMIT_KEYS as readonly string[]).includes(last)
    ? (last as AuthRateLimitKey)
    : null;
}

function clientKey(header: string | undefined, route: string): string {
  const ip = header?.split(",")[0]?.trim() || "local";
  return `auth:${route}:${ip}`;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function requireJwt(
  auth: JordAuthConfig,
  keyring?: JwtKeyring,
): Promise<string> {
  const secret = keyring ? await keyring.current() : auth.jwtSecret;
  if (!secret) {
    throw new HTTPException(503, { message: "jwt is not configured" });
  }
  return secret;
}

function redirectDenied(
  settings: JordAuthSettings,
  raw: unknown,
): Response | null {
  const check = validateRedirectParam(raw, settings);
  if (check.ok) return null;
  return Response.json({ error: "redirect_not_allowed" }, { status: 400 });
}

export function createAuthRoutes(input: {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  mailer: MailerPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  /** Shared limiter from S0036; memory fallback for single-process boots. */
  rateLimit?: RateLimitStore;
  /** Per-project signing key (S0071); env secret when absent. */
  keyring?: JwtKeyring;
  /** S0075: seals/unseals the OAuth client secret. */
  secrets?: SecretPort | null;
  /** S0075: provider HTTP, injected in tests. */
  oauthFetch?: OAuthFetch;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.route(
    "/oauth",
    createOAuthRoutes({
      jord: input.jord,
      auth: input.auth,
      enqueueWrite: input.enqueueWrite,
      rateLimit: input.rateLimit,
      keyring: input.keyring,
      secrets: input.secrets ?? null,
      fetch: input.oauthFetch,
    }),
  );
  const limiter = input.rateLimit ?? createMemoryRateLimitStore();

  routes.use("*", async (c, next) => {
    const endpoint = authEndpoint(c.req.path);
    if (!endpoint) {
      await next();
      return;
    }
    const settings = await loadAuthSettings(input.jord);
    const maxHits = settings.rate_limits[endpoint];
    const key = clientKey(c.req.header("x-forwarded-for"), endpoint);
    let count: number;
    try {
      count = await limiter.hit(key, WINDOW_MS);
    } catch (err) {
      // A limiter outage must not take auth down with it.
      console.error("[@altr/jord-server] auth rate-limit store failed, allowing", err);
      await next();
      return;
    }
    if (count > maxHits) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    await next();
  });

  routes.post("/signup", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    if (!settings.email_password_enabled) {
      return c.json({ error: "provider_disabled" }, 403);
    }
    if (!settings.signups_enabled) {
      return c.json({ error: "signups_disabled" }, 403);
    }
    const body = await readJson(c.req.raw);
    const denied = redirectDenied(settings, body.redirect_to);
    if (denied) return denied;
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await input.enqueueWrite(() =>
      signupUser({
        jord: input.jord,
        mailer: input.mailer,
        email,
        password,
        autoconfirm: settings.autoconfirm,
        minPasswordLength: settings.password_min_length,
      }),
    );
    if (!result.ok && result.error === "invalid_email") {
      return c.json({ error: "invalid_email" }, 400);
    }
    if (!result.ok) {
      return c.json({ error: "invalid_password" }, 400);
    }
    return c.json({ ok: true as const });
  });

  routes.post("/signin", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    if (!settings.email_password_enabled) {
      return c.json({ error: "provider_disabled" }, 403);
    }
    const body = await readJson(c.req.raw);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await signinUser({ jord: input.jord, email, password });
    if (!result.ok) return c.json({ error: "invalid_credentials" }, 401);
    const secret = await requireJwt(input.auth, input.keyring);
    return c.json(
      await issueUserSession({
        jord: input.jord,
        enqueueWrite: input.enqueueWrite,
        secret,
        iss: input.auth.jwtIss,
        aud: input.auth.jwtAud,
        user: result.user,
        ttlSec: settings.session_ttl_seconds,
        extraClaims: settings.custom_claims,
        userAgent: c.req.header("user-agent"),
        ip: clientIp(c.req.header("x-forwarded-for")),
      }),
    );
  });

  routes.post("/refresh", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    const body = await readJson(c.req.raw);
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token : "";
    const rotated = await input.enqueueWrite(() =>
      rotateRefreshToken({ jord: input.jord, refreshToken }),
    );
    if (!rotated.ok) {
      return c.json({ error: rotated.error }, 401);
    }
    const secret = await requireJwt(input.auth, input.keyring);
    const access = signAccessToken({
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      sub: rotated.user.id,
      role: "user",
      email: rotated.user.email,
      ttlSec: settings.session_ttl_seconds,
      extraClaims: settings.custom_claims,
      sid: rotated.familyId,
    });
    await input.enqueueWrite(() =>
      renewSession({
        jord: input.jord,
        id: rotated.familyId,
        userId: rotated.user.id,
        userAgent: c.req.header("user-agent"),
        ip: clientIp(c.req.header("x-forwarded-for")),
      }),
    );
    return c.json({
      token_type: "bearer" as const,
      access_token: access.token,
      refresh_token: rotated.refreshToken,
      expires_in: settings.session_ttl_seconds,
    });
  });

  routes.post("/recover", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    const body = await readJson(c.req.raw);
    const denied = redirectDenied(settings, body.redirect_to);
    if (denied) return denied;
    const email = typeof body.email === "string" ? body.email : "";
    await input.enqueueWrite(() =>
      recoverUser({ jord: input.jord, mailer: input.mailer, email }),
    );
    return c.json({ ok: true as const });
  });

  const MAGIC_EMAIL_WINDOW_MS = 15 * 60_000;
  const MAGIC_EMAIL_MAX = 3;

  async function limited(key: string, windowMs: number, max: number) {
    try {
      return (await limiter.hit(key, windowMs)) > max;
    } catch (err) {
      console.error("[@altr/jord-server] auth rate-limit store failed, allowing", err);
      return false;
    }
  }

  routes.post("/magic-link", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    const body = await readJson(c.req.raw);
    const denied = redirectDenied(settings, body.redirect_to);
    if (denied) return denied;
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    // Per-IP uses the shared recover budget; exceeding it is a visible 429
    // (it says nothing about the email). Per-email overflow is silent so the
    // response stays identical to the unknown-email case.
    if (await limited(`auth:magic-link:${ip}`, WINDOW_MS, settings.rate_limits.recover)) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    const overEmail =
      email !== "" &&
      email.length <= 254 &&
      (await limited(`auth:magic-link-email:${email}`, MAGIC_EMAIL_WINDOW_MS, MAGIC_EMAIL_MAX));
    if (!overEmail) {
      await input.enqueueWrite(() =>
        requestMagicLink({ jord: input.jord, mailer: input.mailer, email, ip }),
      );
    }
    return c.json({ ok: true as const });
  });

  // GET is the emailed-link shape; POST lets a front end confirm explicitly so
  // mail scanners that prefetch links cannot burn the token.
  const verifyMagic = async (c: import("hono").Context) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    const settings = await loadAuthSettings(input.jord);
    let token = c.req.query("token") ?? "";
    let redirectTo: unknown = c.req.query("redirect_to");
    if (c.req.method === "POST") {
      const body = await readJson(c.req.raw);
      token = typeof body.token === "string" ? body.token : token;
      redirectTo = body.redirect_to ?? redirectTo;
    }
    const denied = redirectDenied(settings, redirectTo);
    if (denied) return denied;
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (await limited(`auth:magic-verify:${ip}`, WINDOW_MS, settings.rate_limits.signin)) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    const result = await input.enqueueWrite(() =>
      consumeMagicLink({ jord: input.jord, token }),
    );
    if (!result.ok) return c.json({ error: "invalid_token" }, 400);
    const secret = await requireJwt(input.auth, input.keyring);
    const session = await issueUserSession({
      jord: input.jord,
      enqueueWrite: input.enqueueWrite,
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      user: result.user,
      ttlSec: settings.session_ttl_seconds,
      extraClaims: settings.custom_claims,
      userAgent: c.req.header("user-agent"),
      ip,
    });
    return c.json({
      ...session,
      ...(typeof redirectTo === "string" && redirectTo ? { redirect_to: redirectTo } : {}),
    });
  };
  routes.get("/magic-link/verify", verifyMagic);
  routes.post("/magic-link/verify", verifyMagic);

  routes.post("/reset", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    const body = await readJson(c.req.raw);
    const denied = redirectDenied(settings, body.redirect_to);
    if (denied) return denied;
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await input.enqueueWrite(() =>
      resetUserPassword({
        jord: input.jord,
        token,
        password,
        minPasswordLength: settings.password_min_length,
      }),
    );
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ ok: true as const });
  });

  routes.post("/confirm", async (c) => {
    const settings = await loadAuthSettings(input.jord);
    const body = await readJson(c.req.raw);
    const denied = redirectDenied(settings, body.redirect_to);
    if (denied) return denied;
    const token = typeof body.token === "string" ? body.token : "";
    const ok = await input.enqueueWrite(() =>
      confirmUser({ jord: input.jord, token }),
    );
    if (!ok) return c.json({ error: "invalid_token" }, 400);
    return c.json({ ok: true as const });
  });

  const authed = createAuthMiddleware(input.auth, input.keyring, input.jord);

  routes.post("/logout", authed, async (c) => {
    const body = await readJson(c.req.raw);
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token : "";
    if (refreshToken) {
      await input.enqueueWrite(() =>
        revokeRefreshFamily({ jord: input.jord, refreshToken }),
      );
    }
    return c.json({ ok: true as const });
  });

  routes.get("/me", authed, (c) => {
    const principal = c.get("principal");
    return c.json({
      kind: principal.kind,
      uid: principal.uid ?? null,
      role: principal.role,
      claims: principal.claims,
    });
  });

  routes.get("/sessions", authed, async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "user" || !principal.uid) {
      return c.json({ error: "user_required" }, 403);
    }
    const current = principal.claims.sid;
    const sessions = await listSessions(input.jord, principal.uid);
    return c.json({
      sessions: sessions.map((row) => ({
        id: row.id,
        device: row.device,
        ip: row.ip,
        created_at: row.created_at,
        last_seen_at: row.last_seen_at,
        expires_at: row.expires_at,
        current: row.id === current,
      })),
    });
  });

  // Revoke all of my sessions; ?others=true keeps the one making the call.
  routes.delete("/sessions", authed, async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "user" || !principal.uid) {
      return c.json({ error: "user_required" }, 403);
    }
    const uid = principal.uid;
    const sid = principal.claims.sid;
    const keep = c.req.query("others") === "true" && typeof sid === "string";
    const result = await input.enqueueWrite(() =>
      revokeAllSessions({
        jord: input.jord,
        userId: uid,
        exceptId: keep ? (sid as string) : undefined,
      }),
    );
    return c.json({ ok: true as const, ...result });
  });

  routes.delete("/sessions/:id", authed, async (c) => {
    const principal = c.get("principal");
    if (principal.kind !== "user" || !principal.uid) {
      return c.json({ error: "user_required" }, 403);
    }
    const uid = principal.uid;
    const ok = await input.enqueueWrite(() =>
      revokeSession({ jord: input.jord, id: c.req.param("id"), userId: uid }),
    );
    if (!ok) return c.json({ error: "session_not_found" }, 404);
    return c.json({ ok: true as const });
  });

  routes.post("/anon-key", authed, requireOperatorAdmin(), async (c) => {
    const settings = await loadAuthSettings(input.jord);
    if (!settings.anonymous_enabled) {
      return c.json({ error: "provider_disabled" }, 403);
    }
    const secret = await requireJwt(input.auth, input.keyring);
    const access = signAccessToken({
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      sub: "anon",
      role: "anon",
      ttlSec: ANON_TTL_SEC,
    });
    return c.json({
      token_type: "bearer" as const,
      access_token: access.token,
      expires_in: ANON_TTL_SEC,
      role: "anon" as const,
    });
  });

  return routes;
}

export function tokenFromMail(text: string, kind: "confirm" | "reset" | "magic"): string {
  const line = text.split("\n").find((row) => row.startsWith(`${kind}:`));
  return line?.slice(kind.length + 1).trim() ?? "";
}

export function sameEmail(left: string, right: string): boolean {
  return normalizeEmail(left) === normalizeEmail(right);
}

export { ACCESS_TTL_SEC };
