import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import { createWriteQueue } from "../queue.js";
import type { JordAuthConfig } from "./config.js";
import { signAccessToken } from "./jwt.js";
import { ConsoleMailer } from "./mailer.js";
import {
  LAST_SEEN_THROTTLE_MS,
  SESSION_RETAIN_MS,
  deviceLabel,
  gcSessions,
  sessionLive,
} from "./sessions.js";
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
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-sessions-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
  });
  return { app, jord };
}

type Ctx = Awaited<ReturnType<typeof boot>>;
type Tokens = {
  access_token: string;
  refresh_token: string;
  session_id: string;
};

const json = { "content-type": "application/json" };
const adminHeaders = () => ({
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  ...json,
});
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

async function signupAndLogin(
  ctx: Ctx,
  opts: { email?: string; ua?: string; ip?: string; signup?: boolean } = {},
): Promise<Tokens> {
  const email = opts.email ?? "ada@lab.test";
  if (opts.signup !== false) {
    await ctx.app.request("/auth/signup", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ email, password: "correct-horse-battery" }),
    });
    await ctx.jord.query("UPDATE jord_users SET email_confirmed = 1 WHERE email = ?", [email]);
  }
  const res = await ctx.app.request("/auth/signin", {
    method: "POST",
    headers: {
      ...json,
      "user-agent": opts.ua ?? CHROME,
      "x-forwarded-for": opts.ip ?? "203.0.113.7",
    },
    body: JSON.stringify({ email, password: "correct-horse-battery" }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as Tokens;
}

const me = (ctx: Ctx, t: Tokens) =>
  ctx.app.request("/auth/me", { headers: bearer(t.access_token) });

describe("sessions (S0076)", () => {
  it("sign-in creates a session row and the token carries sid", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      const payload = JSON.parse(
        Buffer.from(t.access_token.split(".")[1] ?? "", "base64url").toString(),
      ) as Record<string, unknown>;
      expect(payload.sid).toBe(t.session_id);

      const rows = await ctx.jord.query(
        "SELECT id, user_agent, ip, revoked_at FROM jord_sessions",
        [],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: t.session_id,
        user_agent: "Chrome on Windows",
        ip: "203.0.113.7",
      });
      expect(rows[0]?.revoked_at).toBeNull();
      expect((await me(ctx, t)).status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("lists my sessions, marks the current one, hides other users", async () => {
    const ctx = await boot();
    try {
      const a1 = await signupAndLogin(ctx);
      const a2 = await signupAndLogin(ctx, { signup: false, ua: FIREFOX, ip: "198.51.100.2" });
      await signupAndLogin(ctx, { email: "bob@lab.test" });

      const res = await ctx.app.request("/auth/sessions", { headers: bearer(a1.access_token) });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        sessions: Array<{ id: string; device: string; ip: string; current: boolean }>;
      };
      expect(body.sessions).toHaveLength(2);
      expect(body.sessions.find((s) => s.current)?.id).toBe(a1.session_id);
      expect(body.sessions.find((s) => s.id === a2.session_id)).toMatchObject({
        device: "Firefox on Linux",
        ip: "198.51.100.2",
        current: false,
      });
    } finally {
      await ctx.jord.close();
    }
  });

  it("revoking a session fails its very next request; others keep working", async () => {
    const ctx = await boot();
    try {
      const a1 = await signupAndLogin(ctx);
      const a2 = await signupAndLogin(ctx, { signup: false, ua: FIREFOX });
      expect((await me(ctx, a2)).status).toBe(200);

      const del = await ctx.app.request(`/auth/sessions/${a2.session_id}`, {
        method: "DELETE",
        headers: bearer(a1.access_token),
      });
      expect(del.status).toBe(200);
      expect((await me(ctx, a2)).status).toBe(401);
      expect((await me(ctx, a1)).status).toBe(200);

      // The refresh family died with the session.
      const refresh = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: json,
        body: JSON.stringify({ refresh_token: a2.refresh_token }),
      });
      expect(refresh.status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("cannot revoke another user's session", async () => {
    const ctx = await boot();
    try {
      const ada = await signupAndLogin(ctx);
      const bob = await signupAndLogin(ctx, { email: "bob@lab.test" });
      const del = await ctx.app.request(`/auth/sessions/${bob.session_id}`, {
        method: "DELETE",
        headers: bearer(ada.access_token),
      });
      expect(del.status).toBe(404);
      expect((await me(ctx, bob)).status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("revoke-all kills every session; ?others=true keeps the caller's", async () => {
    const ctx = await boot();
    try {
      const a1 = await signupAndLogin(ctx);
      const a2 = await signupAndLogin(ctx, { signup: false });
      const a3 = await signupAndLogin(ctx, { signup: false });

      const others = await ctx.app.request("/auth/sessions?others=true", {
        method: "DELETE",
        headers: bearer(a1.access_token),
      });
      expect(await others.json()).toMatchObject({ ok: true, revoked: 2 });
      expect((await me(ctx, a1)).status).toBe(200);
      expect((await me(ctx, a2)).status).toBe(401);
      expect((await me(ctx, a3)).status).toBe(401);

      const all = await ctx.app.request("/auth/sessions", {
        method: "DELETE",
        headers: bearer(a1.access_token),
      });
      expect(all.status).toBe(200);
      expect((await me(ctx, a1)).status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("admin lists and revokes per user and per session", async () => {
    const ctx = await boot();
    try {
      const a1 = await signupAndLogin(ctx);
      const a2 = await signupAndLogin(ctx, { signup: false, ua: FIREFOX });
      const rows = await ctx.jord.query("SELECT id FROM jord_users", []);
      const uid = String(rows[0]?.id);

      const list = await ctx.app.request(`/admin/auth/users/${uid}/sessions`, {
        headers: adminHeaders(),
      });
      expect(((await list.json()) as { sessions: unknown[] }).sessions).toHaveLength(2);

      const one = await ctx.app.request(`/admin/auth/sessions/${a2.session_id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      expect(one.status).toBe(200);
      expect((await me(ctx, a2)).status).toBe(401);
      expect((await me(ctx, a1)).status).toBe(200);

      const all = await ctx.app.request(`/admin/auth/users/${uid}/sessions`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      expect(await all.json()).toMatchObject({ ok: true, revoked: 1 });
      expect((await me(ctx, a1)).status).toBe(401);

      // A user token is not an admin.
      const b = await signupAndLogin(ctx, { email: "bob@lab.test" });
      const denied = await ctx.app.request(`/admin/auth/users/${uid}/sessions`, {
        headers: bearer(b.access_token),
      });
      expect(denied.status).toBe(403);
    } finally {
      await ctx.jord.close();
    }
  });

  it("legacy admin revoke route also closes session rows", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      const rows = await ctx.jord.query("SELECT id FROM jord_users", []);
      const res = await ctx.app.request(`/admin/users/${String(rows[0]?.id)}/revoke`, {
        method: "POST",
        headers: adminHeaders(),
      });
      expect(res.status).toBe(200);
      expect((await me(ctx, t)).status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("an expired session fails; an unknown sid fails", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      await ctx.jord.query("UPDATE jord_sessions SET expires_at = 1", []);
      expect((await me(ctx, t)).status).toBe(401);

      const rows = await ctx.jord.query("SELECT id FROM jord_users", []);
      const forged = signAccessToken({
        secret: AUTH.jwtSecret as string,
        iss: AUTH.jwtIss,
        aud: AUTH.jwtAud,
        sub: String(rows[0]?.id),
        role: "user",
        sid: "no-such-session",
      });
      expect(
        (await ctx.app.request("/auth/me", { headers: bearer(forged.token) })).status,
      ).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("legacy tokens without sid keep working until they expire", async () => {
    const ctx = await boot();
    try {
      await signupAndLogin(ctx);
      const rows = await ctx.jord.query("SELECT id FROM jord_users", []);
      const legacy = signAccessToken({
        secret: AUTH.jwtSecret as string,
        iss: AUTH.jwtIss,
        aud: AUTH.jwtAud,
        sub: String(rows[0]?.id),
        role: "user",
      });
      expect(
        (await ctx.app.request("/auth/me", { headers: bearer(legacy.token) })).status,
      ).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("refresh keeps the same session id and extends it", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      await ctx.jord.query("UPDATE jord_sessions SET expires_at = ?", [Date.now() + 1000]);
      const res = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: json,
        body: JSON.stringify({ refresh_token: t.refresh_token }),
      });
      expect(res.status).toBe(200);
      const next = (await res.json()) as Tokens;
      const payload = JSON.parse(
        Buffer.from(next.access_token.split(".")[1] ?? "", "base64url").toString(),
      ) as Record<string, unknown>;
      expect(payload.sid).toBe(t.session_id);
      const rows = await ctx.jord.query("SELECT expires_at FROM jord_sessions", []);
      expect(Number(rows[0]?.expires_at)).toBeGreaterThan(Date.now() + 24 * 60 * 60 * 1000);
      expect((await me(ctx, next)).status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("writes last_seen_at at most once per throttle window", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      const rows0 = await ctx.jord.query("SELECT last_seen_at, user_id FROM jord_sessions", []);
      const created = Number(rows0[0]?.last_seen_at);
      const userId = String(rows0[0]?.user_id);

      const soon = created + 10_000;
      expect(await sessionLive({ jord: ctx.jord, id: t.session_id, userId, nowMs: soon })).toBe(true);
      const rows1 = await ctx.jord.query("SELECT last_seen_at FROM jord_sessions", []);
      expect(Number(rows1[0]?.last_seen_at)).toBe(created);

      const later = created + LAST_SEEN_THROTTLE_MS + 1;
      expect(await sessionLive({ jord: ctx.jord, id: t.session_id, userId, nowMs: later })).toBe(true);
      const rows2 = await ctx.jord.query("SELECT last_seen_at FROM jord_sessions", []);
      expect(Number(rows2[0]?.last_seen_at)).toBe(later);

      // A session id never validates for a different user.
      expect(
        await sessionLive({ jord: ctx.jord, id: t.session_id, userId: "someone-else", nowMs: later }),
      ).toBe(false);
    } finally {
      await ctx.jord.close();
    }
  });

  it("custom claims reach new tokens; reserved keys cannot be set or overridden", async () => {
    const ctx = await boot();
    try {
      const ok = await ctx.app.request("/admin/auth/settings", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ custom_claims: { plan: "pro", team: 7 } }),
      });
      expect(ok.status).toBe(200);
      const t = await signupAndLogin(ctx);
      const payload = JSON.parse(
        Buffer.from(t.access_token.split(".")[1] ?? "", "base64url").toString(),
      ) as Record<string, unknown>;
      expect(payload).toMatchObject({ plan: "pro", team: 7, sid: t.session_id });

      for (const key of ["sid", "sub", "role", "exp"]) {
        const bad = await ctx.app.request("/admin/auth/settings", {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ custom_claims: { [key]: "x" } }),
        });
        expect(bad.status).toBe(400);
      }

      // Even a row that slipped past validation cannot override sid.
      const forged = signAccessToken({
        secret: "s",
        iss: "i",
        aud: "a",
        sub: "u",
        role: "user",
        sid: "real",
        extraClaims: { sid: "evil", sub: "evil", role: "admin", exp: 1 },
      });
      const claims = JSON.parse(
        Buffer.from(forged.token.split(".")[1] ?? "", "base64url").toString(),
      ) as Record<string, unknown>;
      expect(claims).toMatchObject({ sid: "real", sub: "u", role: "user" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("cleanup removes long-dead sessions and keeps live ones", async () => {
    const ctx = await boot();
    try {
      const live = await signupAndLogin(ctx);
      await signupAndLogin(ctx, { signup: false });
      const old = Date.now() - SESSION_RETAIN_MS - 1000;
      const rows = await ctx.jord.query("SELECT id FROM jord_sessions", []);
      const deadId = String(rows.find((r) => r.id !== live.session_id)?.id);
      await ctx.jord.query("UPDATE jord_sessions SET revoked_at = ? WHERE id = ?", [old, deadId]);

      const result = await gcSessions(ctx.jord);
      expect(result.deleted).toBe(1);
      const left = await ctx.jord.query("SELECT id FROM jord_sessions", []);
      expect(left.map((r) => r.id)).toEqual([live.session_id]);
    } finally {
      await ctx.jord.close();
    }
  });

  it("labels devices without echoing the raw header", () => {
    expect(deviceLabel(CHROME)).toBe("Chrome on Windows");
    expect(deviceLabel(FIREFOX)).toBe("Firefox on Linux");
    expect(deviceLabel("")).toBe("Unknown device");
    expect(deviceLabel(null)).toBe("Unknown device");
  });

  it("banning or deleting a user kills their live access token at once", async () => {
    const ctx = await boot();
    try {
      const banned = await signupAndLogin(ctx);
      const gone = await signupAndLogin(ctx, { email: "bob@lab.test" });
      const rows = await ctx.jord.query("SELECT id, email FROM jord_users", []);
      const idOf = (email: string) => String(rows.find((r) => r.email === email)?.id);

      const ban = await ctx.app.request(`/admin/users/${idOf("ada@lab.test")}/disable`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ disabled: true }),
      });
      expect(ban.status).toBe(200);
      expect((await me(ctx, banned)).status).toBe(401);

      const del = await ctx.app.request(`/admin/auth/users/${idOf("bob@lab.test")}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      expect(del.status).toBeLessThan(300);
      expect((await me(ctx, gone)).status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("a refresh cannot revive an expired session", async () => {
    const ctx = await boot();
    try {
      const t = await signupAndLogin(ctx);
      await ctx.jord.query("UPDATE jord_sessions SET expires_at = 1", []);
      const res = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: json,
        body: JSON.stringify({ refresh_token: t.refresh_token }),
      });
      if (res.status === 200) {
        const next = (await res.json()) as Tokens;
        expect((await me(ctx, next)).status).toBe(401);
      }
      const row = await ctx.jord.query("SELECT expires_at FROM jord_sessions", []);
      expect(Number(row[0]?.expires_at)).toBe(1);
    } finally {
      await ctx.jord.close();
    }
  });
});
