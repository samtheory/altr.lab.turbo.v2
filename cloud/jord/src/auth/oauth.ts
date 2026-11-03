import { createHash, randomBytes, randomUUID } from "node:crypto";

import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import type {
  AesGcmSecretPort,
  JordDriverPort,
  SecretPort,
} from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import { normalizeEmail } from "./identity.js";
import { clientIp, issueUserSession } from "./sessions.js";
import type { JwtKeyring } from "./keyring.js";
import {
  requireOperatorAdmin,
  type JordAuthVariables,
} from "./middleware.js";
import { loadAuthSettings, validateRedirectParam } from "./settings.js";
import {
  createMemoryRateLimitStore,
  type RateLimitStore,
} from "../http/rate-limit-store.js";

/**
 * S0075 — one OAuth 2.0 provider (Google), authorization-code + PKCE (S256).
 *
 * Linking policy (decided before coding): a provider identity is matched by
 * (provider, subject). With no identity yet, a **verified** provider email that
 * matches an existing user links to it; with no such user a new confirmed user
 * is created (only while sign-ups are enabled). An unverified email never
 * links or creates. Every failure is the same generic `oauth_failed` so the
 * callback cannot be used to learn whether an account exists.
 */

export const OAUTH_PROVIDERS = ["google"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number];

export type OAuthEndpoints = {
  authorize: string;
  token: string;
  issuers: string[];
};

export const OAUTH_ENDPOINTS: Record<OAuthProviderId, OAuthEndpoints> = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
  },
};

const STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TIMEOUT_MS = 5_000;
const WINDOW_MS = 60_000;
const COOKIE = "jord_oauth_state";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

function secretId(provider: OAuthProviderId): string {
  return `auth.oauth.${provider}.secret`;
}

function isProvider(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

function ph(jord: JordDriverPort, sql: string): string {
  if (jord.dialect !== "postgres") return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function q(
  jord: JordDriverPort,
  sql: string,
  args: Array<string | number | null> = [],
): Promise<Array<Record<string, unknown>>> {
  return jord.query(ph(jord, sql), args);
}

function truthy(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "t";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

type ProviderRow = {
  enabled: boolean;
  clientId: string | null;
  secretSealed: string | null;
};

async function loadProvider(
  jord: JordDriverPort,
  provider: OAuthProviderId,
): Promise<ProviderRow> {
  const rows = await q(
    jord,
    "SELECT enabled, client_id, client_secret_sealed FROM jord_oauth_providers WHERE provider = ?",
    [provider],
  );
  const row = rows[0];
  if (!row) return { enabled: false, clientId: null, secretSealed: null };
  return {
    enabled: truthy(row.enabled),
    clientId: typeof row.client_id === "string" ? row.client_id : null,
    secretSealed:
      typeof row.client_secret_sealed === "string"
        ? row.client_secret_sealed
        : null,
  };
}

function requireSealPort(secrets: SecretPort | null): AesGcmSecretPort {
  if (!secrets || typeof (secrets as AesGcmSecretPort).peekSealed !== "function") {
    throw new HTTPException(503, {
      message: "JORD_MASTER_KEY is required to store an OAuth client secret",
    });
  }
  return secrets as AesGcmSecretPort;
}

export type OAuthFetch = typeof fetch;

type IdClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
};

/** Decode the id_token received directly over TLS from the token endpoint and
 * validate iss / aud / exp (OIDC Core 3.1.3.7 allows skipping the signature
 * check for this channel). */
function readIdToken(
  idToken: unknown,
  input: { endpoints: OAuthEndpoints; clientId: string; nowMs: number },
): IdClaims | null {
  if (typeof idToken !== "string") return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!claims || typeof claims !== "object") return null;
  const aud = claims.aud;
  const audOk = Array.isArray(aud)
    ? aud.includes(input.clientId)
    : aud === input.clientId;
  if (!audOk) return null;
  if (typeof claims.iss !== "string" || !input.endpoints.issuers.includes(claims.iss)) {
    return null;
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 < input.nowMs) return null;
  if (typeof claims.sub !== "string" || claims.sub === "") return null;
  if (typeof claims.email !== "string" || claims.email === "") return null;
  return {
    sub: claims.sub,
    email: normalizeEmail(claims.email),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
  };
}

/** `/auth/oauth/:provider` (authorize) and `/auth/oauth/:provider/callback`. */
export function createOAuthRoutes(input: {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  rateLimit?: RateLimitStore;
  keyring?: JwtKeyring;
  secrets: SecretPort | null;
  /** Injected for tests; defaults to global fetch. */
  fetch?: OAuthFetch;
  endpoints?: Partial<Record<OAuthProviderId, OAuthEndpoints>>;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  const limiter = input.rateLimit ?? createMemoryRateLimitStore();
  const doFetch = input.fetch ?? fetch;

  const fail = () =>
    Response.json({ error: "oauth_failed" }, { status: 400 });

  async function overLimit(route: string, header: string | undefined, max: number) {
    const ip = header?.split(",")[0]?.trim() || "local";
    try {
      return (await limiter.hit(`auth:oauth-${route}:${ip}`, WINDOW_MS)) > max;
    } catch (err) {
      console.error("[@altr/jord-server] auth rate-limit store failed, allowing", err);
      return false;
    }
  }

  function redirectUri(siteUrl: string, provider: OAuthProviderId): string {
    return `${siteUrl.replace(/\/$/, "")}/auth/oauth/${provider}/callback`;
  }

  routes.get("/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return c.json({ error: "oauth_failed" }, 404);
    const settings = await loadAuthSettings(input.jord);
    if (await overLimit("authorize", c.req.header("x-forwarded-for"), settings.rate_limits.signin)) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    const cfg = await loadProvider(input.jord, provider);
    if (!cfg.enabled || !cfg.clientId || !cfg.secretSealed) {
      return c.json({ error: "provider_disabled" }, 403);
    }
    if (!settings.site_url) return c.json({ error: "site_url_required" }, 503);
    const redirectTo = c.req.query("redirect_to");
    const check = validateRedirectParam(redirectTo, settings);
    if (!check.ok) return c.json({ error: "redirect_not_allowed" }, 400);

    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const now = Date.now();
    await input.enqueueWrite(async () => {
      // Expired states are dead weight; sweep them with each new one.
      await q(input.jord, "DELETE FROM jord_oauth_states WHERE expires_at < ?", [now]);
      return q(
        input.jord,
        "INSERT INTO jord_oauth_states (state_hash, provider, code_verifier, redirect_to, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
        [sha256(state), provider, verifier, redirectTo || null, now, now + STATE_TTL_MS],
      );
    });
    // Bind the flow to this browser so a forged callback (login CSRF) fails.
    setCookie(c, COOKIE, state, {
      httpOnly: true,
      sameSite: "Lax",
      secure: settings.site_url.startsWith("https://"),
      path: "/auth/oauth",
      maxAge: STATE_TTL_MS / 1000,
    });
    const endpoints = input.endpoints?.[provider] ?? OAUTH_ENDPOINTS[provider];
    const url = new URL(endpoints.authorize);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", redirectUri(settings.site_url, provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", pkceChallenge(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    c.header("Cache-Control", "no-store");
    return c.redirect(url.toString(), 302);
  });

  routes.get("/:provider/callback", async (c) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return fail();
    const settings = await loadAuthSettings(input.jord);
    if (await overLimit("callback", c.req.header("x-forwarded-for"), settings.rate_limits.signin)) {
      throw new HTTPException(429, { message: "too many auth requests" });
    }
    const code = c.req.query("code") ?? "";
    const state = c.req.query("state") ?? "";
    if (!code || !state || !settings.site_url) return fail();
    const bound = getCookie(c, COOKIE);
    deleteCookie(c, COOKIE, { path: "/auth/oauth" });
    if (!bound || bound !== state) return fail();

    const cfg = await loadProvider(input.jord, provider);
    if (!cfg.enabled || !cfg.clientId || !cfg.secretSealed || !input.secrets) {
      return fail();
    }

    // The UPDATE is the gate: one state, one use, even with concurrent writers.
    const now = Date.now();
    const claimed = await input.enqueueWrite(() =>
      q(
        input.jord,
        "UPDATE jord_oauth_states SET used_at = ? WHERE state_hash = ? AND provider = ? AND used_at IS NULL AND expires_at >= ? RETURNING code_verifier, redirect_to",
        [now, sha256(state), provider, now],
      ),
    );
    const stateRow = claimed[0];
    if (!stateRow) return fail();
    const verifier = str(stateRow.code_verifier);
    const redirectTo = typeof stateRow.redirect_to === "string" ? stateRow.redirect_to : "";

    let clientSecret: string;
    try {
      clientSecret = input.secrets.unseal(cfg.secretSealed);
    } catch {
      return fail();
    }

    const endpoints = input.endpoints?.[provider] ?? OAUTH_ENDPOINTS[provider];
    let claims: IdClaims | null = null;
    try {
      const res = await doFetch(endpoints.token, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri(settings.site_url, provider),
          client_id: cfg.clientId,
          client_secret: clientSecret,
          code_verifier: verifier,
        }).toString(),
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      });
      if (!res.ok) return fail();
      const body = (await res.json()) as Record<string, unknown>;
      claims = readIdToken(body.id_token, {
        endpoints,
        clientId: cfg.clientId,
        nowMs: Date.now(),
      });
    } catch {
      return fail();
    }
    if (!claims || !claims.emailVerified) return fail();

    const user = await input.enqueueWrite(() =>
      resolveOAuthUser({
        jord: input.jord,
        provider,
        claims: claims!,
        signupsEnabled: settings.signups_enabled,
      }),
    );
    if (!user) return fail();

    const secret = input.keyring
      ? await input.keyring.current()
      : input.auth.jwtSecret;
    if (!secret) throw new HTTPException(503, { message: "jwt is not configured" });
    const session = await issueUserSession({
      jord: input.jord,
      enqueueWrite: input.enqueueWrite,
      secret,
      iss: input.auth.jwtIss,
      aud: input.auth.jwtAud,
      user,
      ttlSec: settings.session_ttl_seconds,
      extraClaims: settings.custom_claims,
      userAgent: c.req.header("user-agent"),
      ip: clientIp(c.req.header("x-forwarded-for")),
    });
    if (redirectTo && validateRedirectParam(redirectTo, settings).ok) {
      // Fragment, not query: tokens must not reach server logs or Referer.
      const target = new URL(redirectTo);
      target.hash = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: String(session.expires_in),
        token_type: "bearer",
      }).toString();
      return c.redirect(target.toString(), 302);
    }
    return c.json(session);
  });

  return routes;
}

async function resolveOAuthUser(input: {
  jord: JordDriverPort;
  provider: OAuthProviderId;
  claims: IdClaims;
  signupsEnabled: boolean;
}): Promise<{ id: string; email: string } | null> {
  const { jord, provider, claims } = input;
  const now = Date.now();
  const disabled = (row: Record<string, unknown>) => row.disabled_at != null;

  const linked = await q(
    jord,
    "SELECT u.id, u.email, u.disabled_at FROM jord_identities i JOIN jord_users u ON u.id = i.user_id WHERE i.provider = ? AND i.subject = ?",
    [provider, claims.sub],
  );
  if (linked[0]) {
    if (disabled(linked[0])) return null;
    await q(jord, "UPDATE jord_users SET last_sign_in_at = ? WHERE id = ?", [
      now,
      str(linked[0].id),
    ]);
    return { id: str(linked[0].id), email: str(linked[0].email) };
  }

  const existing = await q(
    jord,
    "SELECT id, email, email_confirmed, disabled_at FROM jord_users WHERE email = ?",
    [claims.email],
  );
  let userId: string;
  let email: string;
  let createdHere = false;
  const yes = jord.dialect === "postgres" ? "TRUE" : "1";
  if (existing[0]) {
    if (disabled(existing[0])) return null;
    userId = str(existing[0].id);
    email = str(existing[0].email);
    await q(
      jord,
      `UPDATE jord_users SET email_confirmed = ${yes}, last_sign_in_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, userId],
    );
    if (!truthy(existing[0].email_confirmed)) {
      // Pre-account takeover guard: whoever registered this address before it
      // was verified must not keep a working password or session.
      await q(jord, "UPDATE jord_users SET password_hash = 'oauth$none' WHERE id = ?", [userId]);
      await q(
        jord,
        "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
        [now, userId],
      );
    }
  } else {
    if (!input.signupsEnabled) return null;
    createdHere = true;
    userId = randomUUID();
    email = claims.email;
    // Not a valid scrypt string, so password sign-in can never match it.
    await q(
      jord,
      `INSERT INTO jord_users (id, email, password_hash, email_confirmed, created_at, updated_at, last_sign_in_at) VALUES (?, ?, 'oauth$none', ${yes}, ?, ?, ?)`,
      [userId, email, now, now, now],
    );
  }
  await q(
    jord,
    "INSERT INTO jord_identities (id, user_id, provider, subject, email, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (provider, subject) DO NOTHING",
    [randomUUID(), userId, provider, claims.sub, claims.email, now],
  );
  // A concurrent first sign-in may have won the identity; defer to it.
  const winner = await q(
    jord,
    "SELECT user_id FROM jord_identities WHERE provider = ? AND subject = ?",
    [provider, claims.sub],
  );
  const winnerId = str(winner[0]?.user_id);
  if (winnerId && winnerId !== userId) {
    if (createdHere) await q(jord, "DELETE FROM jord_users WHERE id = ?", [userId]);
    const row = await q(
      jord,
      "SELECT id, email, disabled_at FROM jord_users WHERE id = ?",
      [winnerId],
    );
    if (!row[0] || disabled(row[0])) return null;
    return { id: str(row[0].id), email: str(row[0].email) };
  }
  return { id: userId, email };
}

/** `GET/PUT /admin/auth/oauth/:provider` — operator admin only; secret is write-only. */
export function createOAuthAdminRoutes(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  secrets: SecretPort | null;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.use("*", requireOperatorAdmin());

  const view = (cfg: ProviderRow) => ({
    enabled: cfg.enabled,
    client_id: cfg.clientId,
    client_secret_configured: Boolean(cfg.secretSealed),
  });

  routes.get("/oauth/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return c.json({ error: "unknown_provider" }, 404);
    return c.json(view(await loadProvider(input.jord, provider)));
  });

  routes.put("/oauth/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (!isProvider(provider)) return c.json({ error: "unknown_provider" }, 404);
    let body: Record<string, unknown> = {};
    try {
      const raw = (await c.req.json()) as unknown;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        body = raw as Record<string, unknown>;
      }
    } catch {
      /* empty body */
    }
    const current = await loadProvider(input.jord, provider);
    const clientId =
      typeof body.client_id === "string" && body.client_id.trim() !== ""
        ? body.client_id.trim().slice(0, 512)
        : current.clientId;
    const enabled = typeof body.enabled === "boolean" ? body.enabled : current.enabled;

    let sealed = current.secretSealed;
    if (typeof body.client_secret === "string" && body.client_secret !== "") {
      const port = requireSealPort(input.secrets);
      try {
        await port.putSecret(secretId(provider), body.client_secret);
      } catch {
        // The port's map is in-memory: an id that already exists is rotated.
        await port.rotate(secretId(provider), body.client_secret);
      }
      sealed = port.peekSealed(secretId(provider)) ?? null;
    }
    if (enabled && (!clientId || !sealed)) {
      return c.json(
        { error: "invalid_oauth_config", message: "enabling needs client_id and client_secret" },
        400,
      );
    }

    const now = Date.now();
    const flag = input.jord.dialect === "postgres" ? enabled : enabled ? 1 : 0;
    await input.enqueueWrite(() =>
      input.jord.dialect === "postgres"
        ? input.jord.query(
            `INSERT INTO jord_oauth_providers (provider, enabled, client_id, client_secret_sealed, updated_at)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (provider) DO UPDATE SET enabled = EXCLUDED.enabled,
               client_id = EXCLUDED.client_id,
               client_secret_sealed = EXCLUDED.client_secret_sealed,
               updated_at = EXCLUDED.updated_at`,
            [provider, flag as never, clientId, sealed, now],
          )
        : input.jord.query(
            `INSERT INTO jord_oauth_providers (provider, enabled, client_id, client_secret_sealed, updated_at)
             VALUES (?,?,?,?,?)
             ON CONFLICT (provider) DO UPDATE SET enabled = excluded.enabled,
               client_id = excluded.client_id,
               client_secret_sealed = excluded.client_secret_sealed,
               updated_at = excluded.updated_at`,
            [provider, flag as number, clientId, sealed, now],
          ),
    );
    return c.json(view({ enabled, clientId, secretSealed: sealed }));
  });

  return routes;
}
