import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
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
  const dir = await mkdtemp(path.join(tmpdir(), "jord-auth-users-"));
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

function admin(): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
    "content-type": "application/json",
  };
}

function editor(): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("editor", AUTH.secret)}`,
    "content-type": "application/json",
  };
}

async function createUser(
  app: ReturnType<typeof createJordApp>,
  body: Record<string, unknown>,
) {
  return app.request("/admin/auth/users", {
    method: "POST",
    headers: admin(),
    body: JSON.stringify(body),
  });
}

async function listUsers(app: ReturnType<typeof createJordApp>) {
  const res = await app.request("/admin/auth/users", { headers: admin() });
  expect(res.status).toBe(200);
  const text = await res.text();
  return {
    text,
    users: (JSON.parse(text) as {
      users: Array<{
        id: string;
        email: string;
        emailConfirmed: boolean;
        disabledAt: number | null;
        banReason: string | null;
        userMetadata: Record<string, unknown>;
        appMetadata: Record<string, unknown>;
        lastSignInAt: number | null;
      }>;
    }).users,
  };
}

describe("admin auth users", () => {
  it("creates a user with metadata and never leaks hashes or tokens", async () => {
    const ctx = await boot();
    try {
      const res = await createUser(ctx.app, {
        mode: "create",
        email: "Ada@Lab.test",
        password: "correct-horse",
        user_metadata: { plan: "lab", nested: { ok: true } },
        app_metadata: { role: "tester" },
      });
      expect(res.status).toBe(201);
      const text = await res.text();
      expect(text).not.toContain("password_hash");
      expect(text).not.toContain("scrypt$");
      expect(text).not.toContain("token_hash");
      const created = JSON.parse(text) as {
        user: {
          id: string;
          email: string;
          emailConfirmed: boolean;
          userMetadata: Record<string, unknown>;
          appMetadata: Record<string, unknown>;
          lastSignInAt: number | null;
        };
      };
      expect(created.user.email).toBe("ada@lab.test");
      expect(created.user.emailConfirmed).toBe(true);
      expect(created.user.userMetadata).toEqual({
        plan: "lab",
        nested: { ok: true },
      });
      expect(created.user.appMetadata).toEqual({ role: "tester" });
      expect(created.user.lastSignInAt).toBeNull();

      const duplicate = await createUser(ctx.app, {
        mode: "create",
        email: "ada@lab.test",
        password: "correct-horse",
      });
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toEqual({ error: "email_exists" });

      const logs = await ctx.jord.query(
        "SELECT action FROM (SELECT json_extract(meta_json, '$.action') AS action FROM jord_logs WHERE source = 'auth.users')",
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    } finally {
      await ctx.jord.close();
    }
  });

  it("invites without a password, sends confirm mail, and patches metadata", async () => {
    const ctx = await boot();
    try {
      const invited = await createUser(ctx.app, {
        mode: "invite",
        email: "invite@lab.test",
        user_metadata: { source: "invite" },
      });
      expect(invited.status).toBe(201);
      const invitedBody = (await invited.json()) as {
        user: { id: string; emailConfirmed: boolean };
      };
      expect(invitedBody.user.emailConfirmed).toBe(false);
      expect(
        ctx.mailer.sent.filter((mail) => mail.subject.includes("invited")),
      ).toHaveLength(1);

      const patched = await ctx.app.request(
        `/admin/auth/users/${invitedBody.user.id}`,
        {
          method: "PATCH",
          headers: admin(),
          body: JSON.stringify({
            email_confirm: true,
            user_metadata: { plan: "pro" },
            app_metadata: { tier: "one" },
          }),
        },
      );
      expect(patched.status).toBe(200);
      const patchedBody = (await patched.json()) as {
        user: {
          emailConfirmed: boolean;
          userMetadata: Record<string, unknown>;
          appMetadata: Record<string, unknown>;
        };
      };
      expect(patchedBody.user.emailConfirmed).toBe(true);
      expect(patchedBody.user.userMetadata).toEqual({ plan: "pro" });
      expect(patchedBody.user.appMetadata).toEqual({ tier: "one" });

      const signed = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "invite@lab.test",
          password: "never-shared-random-password",
        }),
      });
      // Invited accounts cannot use the random placeholder password.
      expect(signed.status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("bans with a reason, revokes sessions, records last sign-in and deletes", async () => {
    const ctx = await boot();
    try {
      await createUser(ctx.app, {
        mode: "create",
        email: "ban@lab.test",
        password: "correct-horse",
      });
      const before = await listUsers(ctx.app);
      const user = before.users[0]!;

      const signed = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ban@lab.test",
          password: "correct-horse",
        }),
      });
      expect(signed.status).toBe(200);

      const afterSignin = await listUsers(ctx.app);
      expect(afterSignin.users[0]!.lastSignInAt).toBeTypeOf("number");
      expect(afterSignin.text).not.toContain("correct-horse");

      const banned = await ctx.app.request(`/admin/auth/users/${user.id}/ban`, {
        method: "POST",
        headers: admin(),
        body: JSON.stringify({ reason: "abuse" }),
      });
      expect(banned.status).toBe(200);
      const bannedBody = (await banned.json()) as {
        user: { disabledAt: number | null; banReason: string | null };
      };
      expect(bannedBody.user.disabledAt).toBeTypeOf("number");
      expect(bannedBody.user.banReason).toBe("abuse");

      const denied = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ban@lab.test",
          password: "correct-horse",
        }),
      });
      expect(denied.status).toBe(401);

      const revoked = await ctx.app.request(
        `/admin/auth/users/${user.id}/revoke`,
        { method: "POST", headers: admin() },
      );
      expect(revoked.status).toBe(200);

      const deleted = await ctx.app.request(`/admin/auth/users/${user.id}`, {
        method: "DELETE",
        headers: admin(),
      });
      expect(deleted.status).toBe(200);
      const gone = await ctx.app.request(`/admin/auth/users/${user.id}`, {
        headers: admin(),
      });
      expect(gone.status).toBe(404);
      expect((await listUsers(ctx.app)).users).toHaveLength(0);
    } finally {
      await ctx.jord.close();
    }
  });

  it("validates input and stays admin-only", async () => {
    const ctx = await boot();
    try {
      const noPassword = await createUser(ctx.app, {
        mode: "create",
        email: "nopass@lab.test",
      });
      expect(noPassword.status).toBe(400);

      const arrayMetadata = await createUser(ctx.app, {
        mode: "create",
        email: "meta@lab.test",
        password: "correct-horse",
        user_metadata: [1, 2],
      });
      expect(arrayMetadata.status).toBe(400);

      const badMode = await createUser(ctx.app, {
        mode: "other",
        email: "mode@lab.test",
        password: "correct-horse",
      });
      expect(badMode.status).toBe(400);

      const editorList = await ctx.app.request("/admin/auth/users", {
        headers: editor(),
      });
      expect(editorList.status).toBe(403);
      const editorCreate = await ctx.app.request("/admin/auth/users", {
        method: "POST",
        headers: editor(),
        body: JSON.stringify({
          mode: "create",
          email: "editor@lab.test",
          password: "correct-horse",
        }),
      });
      expect(editorCreate.status).toBe(403);
    } finally {
      await ctx.jord.close();
    }
  });
});
