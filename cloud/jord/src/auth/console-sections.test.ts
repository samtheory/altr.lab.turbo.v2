import path from "node:path";
import { randomBytes } from "node:crypto";
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
import { signSessionToken } from "./token.js";

const temps: string[] = [];

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "env-jwt-secret",
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

async function boot(options?: { withSecrets?: boolean }) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-auth-console-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const secrets =
    options?.withSecrets === false
      ? null
      : createAesGcmSecretPort({ masterKey: randomBytes(32) });
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
    secrets,
  });
  return { app, jord };
}

function admin(): Record<string, string> {
  return { authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}` };
}

async function patch(
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
  email: string,
  password = "correct-horse",
) {
  return app.request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function signin(
  app: ReturnType<typeof createJordApp>,
  email: string,
  password = "correct-horse",
) {
  return app.request("/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

function payloadOf(token: string): Record<string, unknown> {
  const part = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

async function me(
  app: ReturnType<typeof createJordApp>,
  token: string,
): Promise<number> {
  const res = await app.request("/auth/me", {
    headers: { authorization: `Bearer ${token}` },
  });
  return res.status;
}

describe("auth console sections S0071", () => {
  it("gates email/password and anonymous providers", async () => {
    const ctx = await boot();
    try {
      expect((await patch(ctx.app, { email_password_enabled: false })).status).toBe(
        200,
      );
      const blockedSignup = await signup(ctx.app, "off@lab.test");
      expect(blockedSignup.status).toBe(403);
      expect(await blockedSignup.json()).toEqual({ error: "provider_disabled" });
      const blockedSignin = await signin(ctx.app, "off@lab.test");
      expect(blockedSignin.status).toBe(403);
      expect(await blockedSignin.json()).toEqual({ error: "provider_disabled" });

      expect((await patch(ctx.app, { email_password_enabled: true })).status).toBe(
        200,
      );
      expect(
        (await patch(ctx.app, { anonymous_enabled: false })).status,
      ).toBe(200);
      const anon = await ctx.app.request("/auth/anon-key", {
        method: "POST",
        headers: admin(),
      });
      expect(anon.status).toBe(403);
      expect(await anon.json()).toEqual({ error: "provider_disabled" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("merges custom claims and refuses reserved ones", async () => {
    const ctx = await boot();
    try {
      expect(
        (await patch(ctx.app, { custom_claims: { role: "admin" } })).status,
      ).toBe(400);

      expect(
        (
          await patch(ctx.app, {
            autoconfirm: true,
            custom_claims: { plan: "pro", org: "lab" },
          })
        ).status,
      ).toBe(200);

      expect((await signup(ctx.app, "claims@lab.test")).status).toBe(200);
      const signed = await signin(ctx.app, "claims@lab.test");
      expect(signed.status).toBe(200);
      const body = (await signed.json()) as { access_token: string };
      const claims = payloadOf(body.access_token);
      expect(claims.plan).toBe("pro");
      expect(claims.org).toBe("lab");
      expect(claims.role).toBe("user");
      expect(claims.iss).toBe("jord");
      expect(typeof claims.sub).toBe("string");

      const listed = await ctx.app.request("/admin/auth/settings", {
        headers: admin(),
      });
      const listedBody = (await listed.json()) as {
        settings: Record<string, unknown>;
      };
      expect(listedBody.settings.custom_claims).toEqual({
        plan: "pro",
        org: "lab",
      });
    } finally {
      await ctx.jord.close();
    }
  });

  it("rotates the signing key, invalidates old tokens and resets to env", async () => {
    const ctx = await boot();
    try {
      await patch(ctx.app, { autoconfirm: true });
      await signup(ctx.app, "rotate@lab.test");
      const first = (await (await signin(ctx.app, "rotate@lab.test")).json()) as {
        access_token: string;
      };
      expect(await me(ctx.app, first.access_token)).toBe(200);

      const rotated = await ctx.app.request("/admin/auth/jwt/rotate", {
        method: "POST",
        headers: admin(),
      });
      expect(rotated.status).toBe(200);
      const rotatedText = await rotated.text();
      expect(rotatedText).not.toContain(AUTH.jwtSecret);
      const rotatedBody = JSON.parse(rotatedText) as {
        key: { source: string; fingerprint: string; configured: boolean };
        invalidated: string;
      };
      expect(rotatedBody.key.source).toBe("database");
      expect(rotatedBody.key.configured).toBe(true);
      expect(rotatedBody.key.fingerprint).toMatch(/^[0-9a-f]{16}$/);
      expect(rotatedBody.invalidated).toContain("access tokens");

      // The old access token was signed with the env key: rotation invalidates it.
      expect(await me(ctx.app, first.access_token)).toBe(401);

      const second = (await (await signin(ctx.app, "rotate@lab.test")).json()) as {
        access_token: string;
      };
      expect(await me(ctx.app, second.access_token)).toBe(200);

      const settings = await ctx.app.request("/admin/auth/settings", {
        headers: admin(),
      });
      const settingsText = await settings.text();
      expect(settingsText).not.toContain("jwt_key_sealed");
      expect(settingsText).not.toContain(AUTH.jwtSecret);
      const settingsBody = JSON.parse(settingsText) as {
        settings: Record<string, unknown>;
      };
      expect(settingsBody.settings.jwt_key_configured).toBe(true);
      expect(settingsBody.settings.jwt_key_fingerprint).toBe(
        rotatedBody.key.fingerprint,
      );

      const reset = await ctx.app.request("/admin/auth/jwt/key", {
        method: "DELETE",
        headers: admin(),
      });
      expect(reset.status).toBe(200);
      expect(await me(ctx.app, second.access_token)).toBe(401);

      const third = (await (await signin(ctx.app, "rotate@lab.test")).json()) as {
        access_token: string;
      };
      expect(await me(ctx.app, third.access_token)).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("refuses rotation without a master key", async () => {
    const ctx = await boot({ withSecrets: false });
    try {
      const rotated = await ctx.app.request("/admin/auth/jwt/rotate", {
        method: "POST",
        headers: admin(),
      });
      expect(rotated.status).toBe(503);
      expect(await rotated.json()).toMatchObject({
        error: "jwt_key_unavailable",
      });
    } finally {
      await ctx.jord.close();
    }
  });
});
