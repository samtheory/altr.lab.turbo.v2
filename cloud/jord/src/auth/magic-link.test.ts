import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "./config.js";
import { MAGIC_TTL_MS, consumeMagicLink, requestMagicLink } from "./identity.js";
import { ConsoleMailer } from "./mailer.js";
import { tokenFromMail } from "./routes.js";
import { signSessionToken } from "./token.js";
import { createWriteQueue } from "../queue.js";

const temps: string[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: "jwt-previous-secret",
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-magic-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const mailer = new ConsoleMailer();
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer,
  });
  return { app, jord, mailer };
}

type Ctx = Awaited<ReturnType<typeof boot>>;

const json = { "content-type": "application/json" };
const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
};

function post(
  ctx: Ctx,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return ctx.app.request(url, {
    method: "POST",
    headers: { ...json, ...headers },
    body: JSON.stringify(body),
  });
}

function patchSettings(ctx: Ctx, body: unknown) {
  return ctx.app.request("/admin/auth/settings", {
    method: "PATCH",
    headers: { ...json, ...admin },
    body: JSON.stringify(body),
  });
}

async function seedUser(ctx: Ctx, email = "ada@lab.test") {
  await post(ctx, "/auth/signup", { email, password: "correct-horse-battery" });
  await ctx.jord.query!("UPDATE jord_users SET email_confirmed = 1 WHERE email = ?", [
    email,
  ]);
  ctx.mailer.sent.length = 0;
}

function magicToken(ctx: Ctx): string {
  return tokenFromMail(ctx.mailer.sent.at(-1)?.text ?? "", "magic");
}

function verifyUrl(token: string, redirect?: string): string {
  const base = `/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
  return redirect ? `${base}&redirect_to=${encodeURIComponent(redirect)}` : base;
}

describe("magic link (S0074)", () => {
  it("happy path: request, verify, session; token hashed at rest", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      const res = await post(ctx, "/auth/magic-link", { email: "Ada@Lab.test" });
      expect(res.status).toBe(200);
      const token = magicToken(ctx);
      expect(token).not.toBe("");
      const rows = await ctx.jord.query!(
        "SELECT token_hash FROM jord_auth_tokens WHERE purpose = 'magic'",
        [],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).not.toBe(token);

      const verify = await ctx.app.request(verifyUrl(token));
      expect(verify.status).toBe(200);
      const session = (await verify.json()) as Record<string, string>;
      expect(session.access_token).toBeTruthy();
      expect(session.refresh_token).toBeTruthy();

      const me = await ctx.app.request("/auth/me", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      expect(me.status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects a reused token", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      await post(ctx, "/auth/magic-link", { email: "ada@lab.test" });
      const url = verifyUrl(magicToken(ctx));
      expect((await ctx.app.request(url)).status).toBe(200);
      expect((await ctx.app.request(url)).status).toBe(400);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects an expired token", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      const now = Date.now();
      await requestMagicLink({
        jord: ctx.jord,
        mailer: ctx.mailer,
        email: "ada@lab.test",
        nowMs: now,
      });
      const late = await consumeMagicLink({
        jord: ctx.jord,
        token: magicToken(ctx),
        nowMs: now + MAGIC_TTL_MS + 1,
      });
      expect(late).toEqual({ ok: false, error: "invalid_token" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("unknown email gets the same 200 and creates no token or mail", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      const known = await post(ctx, "/auth/magic-link", { email: "ada@lab.test" });
      const unknown = await post(ctx, "/auth/magic-link", { email: "nobody@lab.test" });
      expect(unknown.status).toBe(known.status);
      expect(await unknown.json()).toEqual(await known.json());
      expect(ctx.mailer.sent).toHaveLength(1);
      const rows = await ctx.jord.query!(
        "SELECT COUNT(*) AS n FROM jord_auth_tokens WHERE purpose = 'magic'",
        [],
      );
      expect(Number(rows[0]?.n)).toBe(1);
    } finally {
      await ctx.jord.close();
    }
  });

  it("disabled user gets no link and cannot consume an earlier one", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      await post(ctx, "/auth/magic-link", { email: "ada@lab.test" });
      const token = magicToken(ctx);
      await ctx.jord.query!("UPDATE jord_users SET disabled_at = ? WHERE email = ?", [
        Date.now(),
        "ada@lab.test",
      ]);
      expect((await ctx.app.request(verifyUrl(token))).status).toBe(400);

      ctx.mailer.sent.length = 0;
      expect((await post(ctx, "/auth/magic-link", { email: "ada@lab.test" })).status).toBe(
        200,
      );
      expect(ctx.mailer.sent).toHaveLength(0);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects an off-allowlist redirect and accepts an allowed one", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      const patched = await patchSettings(ctx, {
        site_url: "https://app.example.com",
        redirect_allowlist: ["https://app.example.com/**"],
      });
      expect(patched.status).toBe(200);

      const bad = await post(ctx, "/auth/magic-link", {
        email: "ada@lab.test",
        redirect_to: "https://evil.test/cb",
      });
      expect(bad.status).toBe(400);
      expect(ctx.mailer.sent).toHaveLength(0);

      const ok = await post(ctx, "/auth/magic-link", {
        email: "ada@lab.test",
        redirect_to: "https://app.example.com/home",
      });
      expect(ok.status).toBe(200);
      const token = magicToken(ctx);

      expect(
        (await ctx.app.request(verifyUrl(token, "https://evil.test/x"))).status,
      ).toBe(400);
      // A refused redirect must not burn the token.
      const good = await ctx.app.request(
        verifyUrl(token, "https://app.example.com/home"),
      );
      expect(good.status).toBe(200);
      expect(await good.json()).toMatchObject({
        redirect_to: "https://app.example.com/home",
      });
    } finally {
      await ctx.jord.close();
    }
  });

  it("limits to 3 links per email per window without changing the response", async () => {
    const ctx = await boot();
    try {
      await seedUser(ctx);
      for (let i = 0; i < 5; i++) {
        const res = await post(ctx, "/auth/magic-link", { email: "ada@lab.test" });
        expect(res.status).toBe(200);
      }
      expect(ctx.mailer.sent).toHaveLength(3);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rate limits per IP with 429", async () => {
    const ctx = await boot();
    try {
      await patchSettings(ctx, { rate_limits: { recover: 2 } });
      const ip = { "x-forwarded-for": "203.0.113.9" };
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await post(ctx, "/auth/magic-link", { email: `u${i}@lab.test` }, ip);
        statuses.push(res.status);
      }
      expect(statuses).toEqual([200, 200, 429, 429]);
    } finally {
      await ctx.jord.close();
    }
  });
});
