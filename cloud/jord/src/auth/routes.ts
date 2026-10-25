import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordDriverPort } from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import {
  confirmUser,
  issueRefreshToken,
  normalizeEmail,
  recoverUser,
  resetUserPassword,
  revokeRefreshFamily,
  rotateRefreshToken,
  signinUser,
  signupUser,
} from "./identity.js";
import { ACCESS_TTL_SEC, ANON_TTL_SEC, signAccessToken } from "./jwt.js";
import type { MailerPort } from "./mailer.js";
import {
  createAuthMiddleware,
  requireOperatorAdmin,
  type JordAuthVariables,
} from "./middleware.js";

const WINDOW_MS = 60_000;
const MAX_HITS = 30;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const slot = hits.get(key);
  if (!slot || slot.reset <= now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  slot.count += 1;
  return slot.count <= MAX_HITS;
}

function clientKey(header: string | undefined, route: string): string {
  const ip = header?.split(",")[0]?.trim() || "local";
  return `${route}:${ip}`;
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

function requireJwt(auth: JordAuthConfig): string {
  if (!auth.jwtSecret) {
    throw new HTTPException(503, { message: "jwt is not configured" });
  }
  return auth.jwtSecret;
}

export function createAuthRoutes(input: {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  mailer: MailerPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.use("*", async (c, next) => {
    const path = c.req.path;
    if (
      path.endsWith("/auth/me") ||
      path.endsWith("/auth/logout") ||
      path.endsWith("/auth/anon-key")
    ) {
      await next();
      return;
    }
    if (!rateLimit(clientKey(c.req.header("x-forwarded-for"), path))) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    await next();
  });

  routes.post("/signup", async (c) => {
    const body = await readJson(c.req.raw);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await input.enqueueWrite(() =>
      signupUser({
        jord: input.jord,
        mailer: input.mailer,
        email,
        password,
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
    const body = await readJson(c.req.raw);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await signinUser({ jord: input.jord, email, password });
    if (!result.ok) return c.json({ error: "invalid_credentials" }, 401);
    const secret = requireJwt(input.auth);
    const access = signAccessToken({
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      sub: result.user.id,
      role: "user",
      email: result.user.email,
    });
    const refresh = await input.enqueueWrite(() =>
      issueRefreshToken({ jord: input.jord, userId: result.user.id }),
    );
    return c.json({
      token_type: "bearer" as const,
      access_token: access.token,
      refresh_token: refresh.refreshToken,
      expires_in: ACCESS_TTL_SEC,
    });
  });

  routes.post("/refresh", async (c) => {
    const body = await readJson(c.req.raw);
    const refreshToken =
      typeof body.refresh_token === "string" ? body.refresh_token : "";
    const rotated = await input.enqueueWrite(() =>
      rotateRefreshToken({ jord: input.jord, refreshToken }),
    );
    if (!rotated.ok) {
      return c.json({ error: rotated.error }, 401);
    }
    const secret = requireJwt(input.auth);
    const access = signAccessToken({
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      sub: rotated.user.id,
      role: "user",
      email: rotated.user.email,
    });
    return c.json({
      token_type: "bearer" as const,
      access_token: access.token,
      refresh_token: rotated.refreshToken,
      expires_in: ACCESS_TTL_SEC,
    });
  });

  routes.post("/recover", async (c) => {
    const body = await readJson(c.req.raw);
    const email = typeof body.email === "string" ? body.email : "";
    await input.enqueueWrite(() =>
      recoverUser({ jord: input.jord, mailer: input.mailer, email }),
    );
    return c.json({ ok: true as const });
  });

  routes.post("/reset", async (c) => {
    const body = await readJson(c.req.raw);
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await input.enqueueWrite(() =>
      resetUserPassword({ jord: input.jord, token, password }),
    );
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ ok: true as const });
  });

  routes.post("/confirm", async (c) => {
    const body = await readJson(c.req.raw);
    const token = typeof body.token === "string" ? body.token : "";
    const ok = await input.enqueueWrite(() =>
      confirmUser({ jord: input.jord, token }),
    );
    if (!ok) return c.json({ error: "invalid_token" }, 400);
    return c.json({ ok: true as const });
  });

  const authed = createAuthMiddleware(input.auth);

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

  routes.post("/anon-key", authed, requireOperatorAdmin(), (c) => {
    const secret = requireJwt(input.auth);
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

export function tokenFromMail(text: string, kind: "confirm" | "reset"): string {
  const line = text.split("\n").find((row) => row.startsWith(`${kind}:`));
  return line?.slice(kind.length + 1).trim() ?? "";
}

export function sameEmail(left: string, right: string): boolean {
  return normalizeEmail(left) === normalizeEmail(right);
}
