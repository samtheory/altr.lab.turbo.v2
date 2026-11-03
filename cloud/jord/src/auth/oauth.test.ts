import { randomBytes } from "node:crypto";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import {
  createAesGcmSecretPort,
  createJordClient,
  fsPathToFileUrl,
} from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import { createWriteQueue } from "../queue.js";
import type { JordAuthConfig } from "./config.js";
import { ConsoleMailer } from "./mailer.js";
import { pkceChallenge } from "./oauth.js";
import { signSessionToken } from "./token.js";

const temps: string[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const SITE = "https://app.example.com";
const CLIENT_ID = "client-123";
const CLIENT_SECRET = "super-secret-value";

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

type Profile = {
  sub: string;
  email: string;
  email_verified: boolean;
  aud?: string;
  iss?: string;
};

/** Stub Google: enforces code, PKCE, client secret; mints an id_token. */
function stubProvider() {
  const state = {
    profile: {
      sub: "g-1",
      email: "ada@lab.test",
      email_verified: true,
    } as Profile,
    challenge: "",
    calls: 0,
  };
  const fetchImpl: typeof fetch = async (_url, init) => {
    state.calls++;
    const body = new URLSearchParams(String(init?.body ?? ""));
    const ok =
      body.get("code") === "good-code" &&
      body.get("client_secret") === CLIENT_SECRET &&
      body.get("client_id") === CLIENT_ID &&
      pkceChallenge(body.get("code_verifier") ?? "") === state.challenge;
    if (!ok) return new Response('{"error":"invalid_grant"}', { status: 400 });
    const p = state.profile;
    const payload = {
      iss: p.iss ?? "https://accounts.google.com",
      aud: p.aud ?? CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 600,
      sub: p.sub,
      email: p.email,
      email_verified: p.email_verified,
    };
    const idToken = `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;
    return Response.json({ id_token: idToken });
  };
  return { state, fetchImpl };
}

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-oauth-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const stub = stubProvider();
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
    secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
    oauthFetch: stub.fetchImpl,
  });
  return { app, jord, stub };
}

type Ctx = Awaited<ReturnType<typeof boot>>;

const adminHeaders = () => ({
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
});

async function configure(ctx: Ctx, enabled = true) {
  const settings = await ctx.app.request("/admin/auth/settings", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({
      site_url: SITE,
      redirect_allowlist: [`${SITE}/**`],
    }),
  });
  expect(settings.status).toBe(200);
  const res = await ctx.app.request("/admin/auth/oauth/google", {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({
      enabled,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  expect(res.status).toBe(200);
  return res;
}

/** Hit authorize, return the state and record the PKCE challenge on the stub. */
async function authorize(ctx: Ctx, redirectTo?: string) {
  const qs = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
  const res = await ctx.app.request(`/auth/oauth/google${qs}`);
  expect(res.status).toBe(302);
  const loc = new URL(res.headers.get("location") ?? "");
  expect(loc.origin + loc.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  expect(loc.searchParams.get("code_challenge_method")).toBe("S256");
  expect(loc.searchParams.get("redirect_uri")).toBe(`${SITE}/auth/oauth/google/callback`);
  ctx.stub.state.challenge = loc.searchParams.get("code_challenge") ?? "";
  const state = loc.searchParams.get("state") ?? "";
  const setCookie = res.headers.get("set-cookie") ?? "";
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=Lax");
  cookies.set(state, setCookie.split(";")[0] ?? "");
  return state;
}

const cookies = new Map<string, string>();

const callback = (
  ctx: Ctx,
  state: string,
  code = "good-code",
  cookie: string | null = cookies.get(state) ?? `jord_oauth_state=${state}`,
) =>
  ctx.app.request(
    `/auth/oauth/google/callback?code=${code}&state=${encodeURIComponent(state)}`,
    cookie ? { headers: { cookie } } : undefined,
  );

describe("oauth (S0075)", () => {
  it("happy path creates a confirmed user, links the identity, returns a session", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const state = await authorize(ctx);
      const res = await callback(ctx, state);
      expect(res.status).toBe(200);
      const session = (await res.json()) as Record<string, string>;
      expect(session.access_token).toBeTruthy();
      expect(session.refresh_token).toBeTruthy();
      const me = await ctx.app.request("/auth/me", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      expect(me.status).toBe(200);

      const ids = await ctx.jord.query(
        "SELECT provider, subject FROM jord_identities",
        [],
      );
      expect(ids).toHaveLength(1);
      // Password sign-in can never match an OAuth-created user.
      const pw = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "oauth$none" }),
      });
      expect(pw.status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("links to an existing user only when the provider email is verified", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse-battery" }),
      });
      const before = await ctx.jord.query("SELECT id FROM jord_users", []);

      ctx.stub.state.profile.email_verified = false;
      const denied = await callback(ctx, await authorize(ctx));
      expect(denied.status).toBe(400);
      expect(await ctx.jord.query("SELECT id FROM jord_identities", [])).toHaveLength(0);

      ctx.stub.state.profile.email_verified = true;
      const ok = await callback(ctx, await authorize(ctx));
      expect(ok.status).toBe(200);
      const after = await ctx.jord.query("SELECT id FROM jord_users", []);
      expect(after).toHaveLength(before.length);
      expect(await ctx.jord.query("SELECT id FROM jord_identities", [])).toHaveLength(1);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects unknown state, a replayed state, and an expired state", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      expect((await callback(ctx, "not-a-real-state")).status).toBe(400);

      const state = await authorize(ctx);
      expect((await callback(ctx, state)).status).toBe(200);
      const replay = await callback(ctx, state);
      expect(replay.status).toBe(400);
      expect(await replay.json()).toEqual({ error: "oauth_failed" });

      const stale = await authorize(ctx);
      await ctx.jord.query("UPDATE jord_oauth_states SET expires_at = 1", []);
      expect((await callback(ctx, stale)).status).toBe(400);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects a PKCE verifier mismatch at the provider", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const state = await authorize(ctx);
      await ctx.jord.query("UPDATE jord_oauth_states SET code_verifier = 'tampered'", []);
      const res = await callback(ctx, state);
      expect(res.status).toBe(400);
      expect(await ctx.jord.query("SELECT id FROM jord_identities", [])).toHaveLength(0);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects a wrong code, wrong audience and wrong issuer with the same generic error", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const bodies: unknown[] = [];

      bodies.push(await (await callback(ctx, await authorize(ctx), "bad-code")).json());

      ctx.stub.state.profile.aud = "someone-else";
      bodies.push(await (await callback(ctx, await authorize(ctx))).json());

      ctx.stub.state.profile.aud = undefined;
      ctx.stub.state.profile.iss = "https://evil.test";
      bodies.push(await (await callback(ctx, await authorize(ctx))).json());

      for (const b of bodies) expect(b).toEqual({ error: "oauth_failed" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("disabled provider refuses authorize and callback immediately", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const state = await authorize(ctx);
      await ctx.app.request("/admin/auth/oauth/google", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ enabled: false }),
      });
      expect((await ctx.app.request("/auth/oauth/google")).status).toBe(403);
      expect((await callback(ctx, state)).status).toBe(400);
      expect(ctx.stub.state.calls).toBe(0);
    } finally {
      await ctx.jord.close();
    }
  });

  it("disabled and unknown-user outcomes look identical (no existence leak)", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse-battery" }),
      });
      await ctx.jord.query("UPDATE jord_users SET disabled_at = 1", []);
      const disabled = await callback(ctx, await authorize(ctx));

      await ctx.app.request("/admin/auth/settings", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ signups_enabled: false }),
      });
      ctx.stub.state.profile = { sub: "g-2", email: "new@lab.test", email_verified: true };
      const blockedSignup = await callback(ctx, await authorize(ctx));

      expect(disabled.status).toBe(blockedSignup.status);
      expect(await disabled.json()).toEqual(await blockedSignup.json());
    } finally {
      await ctx.jord.close();
    }
  });

  it("redirects with tokens in the fragment; off-allowlist redirect is refused up front", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const bad = await ctx.app.request(
        `/auth/oauth/google?redirect_to=${encodeURIComponent("https://evil.test/x")}`,
      );
      expect(bad.status).toBe(400);

      const state = await authorize(ctx, `${SITE}/home`);
      const res = await callback(ctx, state);
      expect(res.status).toBe(302);
      const loc = new URL(res.headers.get("location") ?? "");
      expect(loc.origin + loc.pathname).toBe(`${SITE}/home`);
      expect(loc.search).toBe("");
      expect(new URLSearchParams(loc.hash.slice(1)).get("access_token")).toBeTruthy();
    } finally {
      await ctx.jord.close();
    }
  });

  it("never returns the client secret and requires credentials to enable", async () => {
    const ctx = await boot();
    try {
      const res = await ctx.app.request("/admin/auth/oauth/google", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.status).toBe(400);

      await configure(ctx);
      const got = await ctx.app.request("/admin/auth/oauth/google", {
        headers: adminHeaders(),
      });
      const text = await got.text();
      expect(text).not.toContain(CLIENT_SECRET);
      expect(JSON.parse(text)).toEqual({
        enabled: true,
        client_id: CLIENT_ID,
        client_secret_configured: true,
      });
      const rows = await ctx.jord.query(
        "SELECT client_secret_sealed FROM jord_oauth_providers",
        [],
      );
      expect(String(rows[0]?.client_secret_sealed)).not.toContain(CLIENT_SECRET);

      const anon = await ctx.app.request("/admin/auth/oauth/google");
      expect(anon.status).toBeGreaterThanOrEqual(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("authorize needs a site URL", async () => {
    const ctx = await boot();
    try {
      await ctx.app.request("/admin/auth/oauth/google", {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          enabled: true,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });
      expect((await ctx.app.request("/auth/oauth/google")).status).toBe(503);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects a callback without the browser-bound cookie (login CSRF)", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const state = await authorize(ctx);
      const forged = await callback(ctx, state, "good-code", null);
      expect(forged.status).toBe(400);
      expect(ctx.stub.state.calls).toBe(0);
      const wrong = await callback(ctx, state, "good-code", "jord_oauth_state=other");
      expect(wrong.status).toBe(400);
    } finally {
      await ctx.jord.close();
    }
  });

  it("linking an unconfirmed pre-registered account strips its password", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      const post = (url: string, body: unknown) =>
        ctx.app.request(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      // Attacker pre-registers the victim's address; account stays unconfirmed.
      await post("/auth/signup", { email: "ada@lab.test", password: "attacker-password-1" });
      const res = await callback(ctx, await authorize(ctx));
      expect(res.status).toBe(200);
      const pw = await post("/auth/signin", {
        email: "ada@lab.test",
        password: "attacker-password-1",
      });
      expect(pw.status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("purges expired states on the next authorize", async () => {
    const ctx = await boot();
    try {
      await configure(ctx);
      await authorize(ctx);
      await ctx.jord.query("UPDATE jord_oauth_states SET expires_at = 1", []);
      await authorize(ctx);
      const rows = await ctx.jord.query("SELECT state_hash FROM jord_oauth_states", []);
      expect(rows).toHaveLength(1);
    } finally {
      await ctx.jord.close();
    }
  });
});
