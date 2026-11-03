import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import { createWriteQueue } from "../queue.js";
import type { JordAuthConfig } from "./config.js";
import { ConsoleMailer } from "./mailer.js";
import {
  isAllowedRedirect,
  loadAuthSettings,
  validateRedirectPattern,
} from "./settings.js";
import { signSessionToken } from "./token.js";

const temps: string[] = [];

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "test-jwt-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-auth-settings-"));
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

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function admin(): Record<string, string> {
  return bearer(signSessionToken("admin", AUTH.secret));
}

async function getSettings(app: ReturnType<typeof createJordApp>) {
  const res = await app.request("/admin/auth/settings", { headers: admin() });
  expect(res.status).toBe(200);
  return ((await res.json()) as { settings: Record<string, unknown> }).settings;
}

async function patchSettings(
  app: ReturnType<typeof createJordApp>,
  body: Record<string, unknown>,
) {
  return app.request("/admin/auth/settings", {
    method: "PATCH",
    headers: { ...admin(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function signup(
  app: ReturnType<typeof createJordApp>,
  payload: Record<string, unknown>,
) {
  return app.request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("auth settings document", () => {
  it("serves today's defaults before a row exists, then persists a patch", async () => {
    const ctx = await boot();
    try {
      const defaults = await getSettings(ctx.app);
      expect(defaults).toMatchObject({
        signups_enabled: true,
        autoconfirm: false,
        password_min_length: 10,
        site_url: null,
        redirect_allowlist: [],
        session_ttl_seconds: 900,
        rate_limits: { signup: 30, signin: 30 },
      });
      expect(defaults.updated_at).toBeNull();

      const patched = await patchSettings(ctx.app, {
        password_min_length: 12,
        site_url: "https://app.example.com",
        redirect_allowlist: ["https://app.example.com/**"],
        session_ttl_seconds: 120,
      });
      expect(patched.status).toBe(200);
      const body = (await patched.json()) as {
        changed: string[];
        settings: Record<string, unknown>;
      };
      expect(body.changed).toEqual(
        expect.arrayContaining([
          "password_min_length",
          "site_url",
          "redirect_allowlist",
          "session_ttl_seconds",
        ]),
      );

      const reloaded = await getSettings(ctx.app);
      expect(reloaded).toMatchObject({
        password_min_length: 12,
        site_url: "https://app.example.com",
        redirect_allowlist: ["https://app.example.com/**"],
        session_ttl_seconds: 120,
      });
      expect(typeof reloaded.updated_at).toBe("number");

      const logs = await ctx.jord.query(
        "SELECT source, message FROM jord_logs WHERE source = 'auth.settings'",
      );
      expect(logs).toHaveLength(1);
      expect(String(logs[0]?.message)).toContain("auth settings updated");
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects invalid URLs, wildcard shapes, limits and unknown keys", async () => {
    const ctx = await boot();
    try {
      const badUrl = await patchSettings(ctx.app, {
        site_url: "javascript:alert(1)",
      });
      expect(badUrl.status).toBe(400);
      expect(await badUrl.json()).toMatchObject({
        error: "invalid_auth_settings",
      });

      const badPattern = await patchSettings(ctx.app, {
        redirect_allowlist: ["//evil.test/cb"],
      });
      expect(badPattern.status).toBe(400);

      const badLimit = await patchSettings(ctx.app, {
        rate_limits: { signup: 0 },
      });
      expect(badLimit.status).toBe(400);

      const unknown = await patchSettings(ctx.app, { nope: true });
      expect(unknown.status).toBe(400);

      const shortTtl = await patchSettings(ctx.app, { session_ttl_seconds: 5 });
      expect(shortTtl.status).toBe(400);
    } finally {
      await ctx.jord.close();
    }
  });

  it("is admin-only", async () => {
    const ctx = await boot();
    try {
      const editor = await ctx.app.request("/admin/auth/settings", {
        headers: bearer(signSessionToken("editor", AUTH.secret)),
      });
      expect(editor.status).toBe(403);
    } finally {
      await ctx.jord.close();
    }
  });

  it("applies the signup gate, autoconfirm and password policy", async () => {
    const ctx = await boot();
    try {
      expect((await patchSettings(ctx.app, { signups_enabled: false })).status).toBe(
        200,
      );
      const blocked = await signup(ctx.app, {
        email: "ada@lab.test",
        password: "correct-horse",
      });
      expect(blocked.status).toBe(403);
      expect(await blocked.json()).toEqual({ error: "signups_disabled" });

      expect((await patchSettings(ctx.app, { signups_enabled: true })).status).toBe(
        200,
      );
      expect(
        (await patchSettings(ctx.app, { password_min_length: 14 })).status,
      ).toBe(200);
      const tooShort = await signup(ctx.app, {
        email: "ada@lab.test",
        password: "correct-horse",
      });
      expect(tooShort.status).toBe(400);
      expect(await tooShort.json()).toEqual({ error: "invalid_password" });

      expect((await patchSettings(ctx.app, { autoconfirm: true })).status).toBe(
        200,
      );
      const created = await signup(ctx.app, {
        email: "ada@lab.test",
        password: "correct-horse-horse",
      });
      expect(created.status).toBe(200);
      expect(
        ctx.mailer.sent.filter((mail) => mail.subject.includes("Confirm")),
      ).toHaveLength(0);

      const signed = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ada@lab.test",
          password: "correct-horse-horse",
        }),
      });
      expect(signed.status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("rejects off-allowlist redirects and accepts same-site targets", async () => {
    const ctx = await boot();
    try {
      expect(
        (
          await patchSettings(ctx.app, {
            site_url: "https://app.example.com",
            redirect_allowlist: ["https://app.example.com/**"],
            autoconfirm: true,
          })
        ).status,
      ).toBe(200);

      const evil = await signup(ctx.app, {
        email: "redirect@lab.test",
        password: "correct-horse",
        redirect_to: "https://evil.test/take",
      });
      expect(evil.status).toBe(400);
      expect(await evil.json()).toEqual({ error: "redirect_not_allowed" });

      const protocolRelative = await signup(ctx.app, {
        email: "redirect@lab.test",
        password: "correct-horse",
        redirect_to: "//evil.test/take",
      });
      expect(protocolRelative.status).toBe(400);

      const sameSite = await signup(ctx.app, {
        email: "redirect@lab.test",
        password: "correct-horse",
        redirect_to: "https://app.example.com/welcome",
      });
      expect(sameSite.status).toBe(200);

      const allowedByWildcard = isAllowedRedirect(
        "https://app.example.com/a/b?ok=1",
        {
          site_url: "https://app.example.com",
          redirect_allowlist: ["https://app.example.com/**"],
        },
      );
      expect(allowedByWildcard).toBe(true);
      expect(
        isAllowedRedirect("https://app.example.com/cb", {
          site_url: null,
          redirect_allowlist: ["https://*.example.com/**"],
        }),
      ).toBe(true);
      expect(
        isAllowedRedirect("https://app.example.com.evil.test/cb", {
          site_url: null,
          redirect_allowlist: ["https://*.example.com/**"],
        }),
      ).toBe(false);
      expect(validateRedirectPattern("mailto:ada@lab.test")).not.toBeNull();
    } finally {
      await ctx.jord.close();
    }
  });

  it("takes an endpoint rate-limit change on the next request", async () => {
    const ctx = await boot();
    try {
      expect(
        (await patchSettings(ctx.app, { rate_limits: { signup: 1 } })).status,
      ).toBe(200);
      const first = await signup(ctx.app, {
        email: "first@lab.test",
        password: "correct-horse",
      });
      expect(first.status).toBe(200);
      const second = await signup(ctx.app, {
        email: "second@lab.test",
        password: "correct-horse",
      });
      expect(second.status).toBe(429);
    } finally {
      await ctx.jord.close();
    }
  });

  it("signs access tokens with the configured session TTL", async () => {
    const ctx = await boot();
    try {
      await patchSettings(ctx.app, {
        autoconfirm: true,
        session_ttl_seconds: 120,
      });
      await signup(ctx.app, {
        email: "ttl@lab.test",
        password: "correct-horse",
      });
      const signed = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ttl@lab.test",
          password: "correct-horse",
        }),
      });
      expect(signed.status).toBe(200);
      const body = (await signed.json()) as { expires_in: number };
      expect(body.expires_in).toBe(120);

      const settings = await loadAuthSettings(ctx.jord);
      expect(settings.session_ttl_seconds).toBe(120);
    } finally {
      await ctx.jord.close();
    }
  });
});
