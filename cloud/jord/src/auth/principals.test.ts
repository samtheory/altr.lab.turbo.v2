import path from "node:path";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { serve } from "@hono/node-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { createJordApp } from "../app.js";
import { routeAllowed } from "./access.js";
import type { JordAuthConfig } from "./config.js";
import { ConsoleMailer } from "./mailer.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { Principal } from "./principal.js";
import { tokenFromMail } from "./routes.js";
import {
  resetRawBearerWarning,
  resolvePrincipal,
  signSessionToken,
} from "./token.js";
import {
  ANON_TTL_SEC,
  CURRENT_KID,
  PREVIOUS_KID,
  signAccessToken,
  signJwt,
  verifyJwt,
} from "./jwt.js";
import { createWriteQueue } from "../queue.js";

const temps: string[] = [];

const JWT = "jwt-current-secret";
const JWT_PREV = "jwt-previous-secret";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: JWT_PREV,
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

async function boot(auth: JordAuthConfig = AUTH) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-auth-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const mailer = new ConsoleMailer();
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth,
    mailer,
  });
  return { app, jord, mailer, auth };
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe("principal resolution", () => {
  it("HMAC session token is an operator and is not a user", () => {
    const token = signSessionToken("editor", AUTH.secret);
    const resolved = resolvePrincipal(token, AUTH);
    expect(resolved?.principal.kind).toBe("operator");
    expect(resolved?.principal.role).toBe("editor");
    expect(resolved?.principal.kind).not.toBe("user");
  });

  it("legacy admin mode maps the raw secret to the default operator role", () => {
    resetRawBearerWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const auth: JordAuthConfig = { ...AUTH, legacyMode: "admin", defaultRole: "editor" };
    const resolved = resolvePrincipal(auth.secret, auth);
    expect(resolved?.principal).toMatchObject({
      kind: "operator",
      role: "editor",
    });
    expect(warn.mock.calls.some((call) => String(call[0]).includes("deprecated"))).toBe(
      true,
    );
    expect(warn.mock.calls.some((call) => String(call[0]).includes(auth.secret))).toBe(
      false,
    );
    warn.mockRestore();
  });

  it("legacy service mode maps the raw secret to service_role", () => {
    resetRawBearerWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resolved = resolvePrincipal(AUTH.secret, AUTH);
    expect(resolved?.principal).toMatchObject({
      kind: "service",
      role: "service_role",
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("pins HS256, rejects alg none, and verifies both kids", () => {
    const now = 1_700_000_000_000;
    const current = signAccessToken({
      secret: JWT,
      iss: "jord",
      aud: "jord",
      sub: "user-1",
      role: "user",
      nowMs: now,
      kid: CURRENT_KID,
    });
    const previous = signAccessToken({
      secret: JWT_PREV,
      iss: "jord",
      aud: "jord",
      sub: "user-1",
      role: "user",
      nowMs: now,
      kid: PREVIOUS_KID,
    });
    const keys = [
      { kid: CURRENT_KID, secret: JWT },
      { kid: PREVIOUS_KID, secret: JWT_PREV },
    ];
    expect(verifyJwt(current.token, { keys, iss: "jord", aud: "jord", nowMs: now })?.sub).toBe(
      "user-1",
    );
    expect(
      verifyJwt(previous.token, { keys, iss: "jord", aud: "jord", nowMs: now })?.role,
    ).toBe("user");
    expect(current.token.split(".").length).toBe(3);
    const header = Buffer.from(current.token.split(".")[0]!, "base64url").toString("utf8");
    expect(header).toContain("HS256");
    expect(header).toContain(CURRENT_KID);

    const none = signJwt({
      claims: {
        iss: "jord",
        aud: "jord",
        sub: "user-1",
        role: "user",
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + 60,
      },
      secret: JWT,
    }).replace(
      /^[^.]+\./,
      `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT", kid: CURRENT_KID })).toString("base64url")}.`,
    );
    expect(verifyJwt(none, { keys, iss: "jord", aud: "jord", nowMs: now })).toBeNull();
    expect(resolvePrincipal(none, AUTH, now)).toBeNull();
  });
});

describe("route matrix", () => {
  const operator = (role: string): Principal => ({
    kind: "operator",
    role,
    claims: {},
  });
  const service: Principal = { kind: "service", role: "service_role", claims: {} };
  const user: Principal = { kind: "user", uid: "u1", role: "user", claims: {} };
  const anon: Principal = { kind: "anon", role: "anon", claims: {} };

  it("matches the groups that exist today and denies the table API", () => {
    expect(routeAllowed(operator("admin"), "GET", "/health")).toBe(true);
    expect(routeAllowed(operator("readonly"), "GET", "/records")).toBe(true);
    expect(routeAllowed(operator("editor"), "POST", "/records")).toBe(true);
    expect(routeAllowed(operator("editor"), "POST", "/schema/tables")).toBe(false);
    expect(routeAllowed(operator("admin"), "POST", "/schema/tables")).toBe(true);
    expect(routeAllowed(service, "POST", "/schema/tables/notes/rows")).toBe(true);
    expect(routeAllowed(operator("editor"), "GET", "/jobs")).toBe(false);
    expect(routeAllowed(operator("readonly"), "GET", "/jobs")).toBe(true);
    expect(routeAllowed(operator("admin"), "POST", "/auth/anon-key")).toBe(true);
    expect(routeAllowed(operator("editor"), "POST", "/auth/anon-key")).toBe(false);
    expect(routeAllowed(service, "POST", "/records")).toBe(true);
    expect(routeAllowed(service, "POST", "/schema/tables")).toBe(false);
    expect(routeAllowed(service, "GET", "/jobs")).toBe(false);
    expect(routeAllowed(service, "POST", "/auth/anon-key")).toBe(false);
    expect(routeAllowed(user, "GET", "/records")).toBe(true);
    expect(routeAllowed(user, "POST", "/schema/tables/notes/rows")).toBe(true);
    expect(routeAllowed(anon, "DELETE", "/schema/tables/notes/rows/1")).toBe(true);
    expect(routeAllowed(user, "POST", "/schema/tables")).toBe(false);
    expect(routeAllowed(user, "PUT", "/schema/tables/records/rls")).toBe(false);
    expect(routeAllowed(user, "GET", "/jobs")).toBe(false);
    expect(routeAllowed(user, "POST", "/policies")).toBe(false);
    expect(routeAllowed(user, "GET", "/blobs/buckets")).toBe(false);
    expect(routeAllowed(user, "GET", "/vectors/namespaces")).toBe(false);
    expect(routeAllowed(user, "GET", "/logs")).toBe(false);
    expect(routeAllowed(user, "POST", "/functions")).toBe(false);
    expect(routeAllowed(user, "GET", "/realtime")).toBe(true);
    expect(routeAllowed(anon, "GET", "/realtime/ws")).toBe(true);
    expect(routeAllowed(user, "GET", "/auth/me")).toBe(true);
    expect(routeAllowed(anon, "POST", "/x/echo")).toBe(true);
    expect(routeAllowed(operator("readonly"), "POST", "/x/echo")).toBe(false);
    expect(routeAllowed(user, "GET", "/api/v1/records")).toBe(true);
    expect(routeAllowed(service, "GET", "/api/v1/records")).toBe(true);
  });
});

describe("passwords", () => {
  it("stores N/r/p/maxmem and compares with a timing-safe verify", async () => {
    const hash = await hashPassword("correct-horse");
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
    expect(await verifyPassword("wrong-horse", hash)).toBe(false);
  });
});

describe("auth routes", () => {
  it("signup and reset do not reveal whether the email exists", async () => {
    const ctx = await boot();
    try {
      const first = await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse" }),
      });
      const second = await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse" }),
      });
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({ ok: true });
      expect(second.status).toBe(200);
      expect(await second.json()).toEqual({ ok: true });
      expect(ctx.mailer.sent.filter((m) => m.subject.includes("Confirm"))).toHaveLength(1);

      const unknown = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@lab.test", password: "correct-horse" }),
      });
      const wrong = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "not-the-password" }),
      });
      expect(unknown.status).toBe(401);
      expect(await unknown.json()).toEqual(await wrong.json());

      const recoverMissing = await ctx.app.request("/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@lab.test" }),
      });
      const recoverKnown = await ctx.app.request("/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test" }),
      });
      expect(recoverMissing.status).toBe(200);
      expect(await recoverMissing.json()).toEqual(await recoverKnown.json());
    } finally {
      await ctx.jord.close();
    }
  });

  it("confirms, signs in, rotates refresh, and revokes the family on reuse", async () => {
    const ctx = await boot();
    try {
      await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse" }),
      });
      const confirmBody = ctx.mailer.sent[0]?.text ?? "";
      expect(confirmBody.startsWith("confirm:")).toBe(true);
      const confirmed = await ctx.app.request("/auth/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: tokenFromMail(confirmBody, "confirm") }),
      });
      expect(confirmed.status).toBe(200);

      const signed = await ctx.app.request("/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse" }),
      });
      expect(signed.status).toBe(200);
      const session = (await signed.json()) as {
        access_token: string;
        refresh_token: string;
      };
      const me = await ctx.app.request("/auth/me", {
        headers: bearer(session.access_token),
      });
      expect(me.status).toBe(200);
      const meBody = (await me.json()) as { kind: string; uid: string | null; role: string };
      expect(meBody.kind).toBe("user");
      expect(meBody.role).toBe("user");
      expect(meBody.uid).toBeTruthy();

      const denied = await ctx.app.request("/records?bucket=lab", {
        headers: bearer(session.access_token),
      });
      expect(denied.status).toBe(403);

      const refreshed = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      expect(refreshed.status).toBe(200);
      const next = (await refreshed.json()) as { refresh_token: string };
      expect(next.refresh_token).not.toBe(session.refresh_token);

      const reused = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      expect(reused.status).toBe(401);
      expect(await reused.json()).toEqual({ error: "refresh_reused" });

      const familyDead = await ctx.app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: next.refresh_token }),
      });
      expect(familyDead.status).toBe(401);
    } finally {
      await ctx.jord.close();
    }
  });

  it("console mailer carries reset bodies and anon keys are admin-only", async () => {
    const ctx = await boot();
    try {
      await ctx.app.request("/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test", password: "correct-horse" }),
      });
      await ctx.app.request("/auth/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenFromMail(ctx.mailer.sent[0]?.text ?? "", "confirm"),
        }),
      });
      await ctx.app.request("/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ada@lab.test" }),
      });
      const resetMail = ctx.mailer.sent.find((m) => m.subject.includes("Reset"));
      expect(resetMail?.text.startsWith("reset:")).toBe(true);
      const reset = await ctx.app.request("/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenFromMail(resetMail?.text ?? "", "reset"),
          password: "new-password",
        }),
      });
      expect(reset.status).toBe(200);

      const admin = signSessionToken("admin", AUTH.secret);
      const editor = signSessionToken("editor", AUTH.secret);
      const minted = await ctx.app.request("/auth/anon-key", {
        method: "POST",
        headers: bearer(admin),
      });
      expect(minted.status).toBe(200);
      const anon = (await minted.json()) as { access_token: string; expires_in: number };
      expect(anon.expires_in).toBe(ANON_TTL_SEC);
      const me = await ctx.app.request("/auth/me", {
        headers: bearer(anon.access_token),
      });
      expect(await me.json()).toMatchObject({ kind: "anon", role: "anon", uid: null });

      const editorDenied = await ctx.app.request("/auth/anon-key", {
        method: "POST",
        headers: bearer(editor),
      });
      expect(editorDenied.status).toBe(403);
      const serviceDenied = await ctx.app.request("/auth/anon-key", {
        method: "POST",
        headers: bearer(AUTH.secret),
      });
      expect(serviceDenied.status).toBe(403);

      const tableApi = await ctx.app.request("/api/v1/records", {
        headers: bearer(admin),
      });
      expect(tableApi.status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("closes an SSE stream after the access JWT exp", async () => {
    const ctx = await boot();
    try {
      const access = signAccessToken({
        secret: JWT,
        iss: "jord",
        aud: "jord",
        sub: "user-1",
        role: "user",
        ttlSec: 1,
      });
      const stream = await ctx.app.request("/realtime?table=lab_notes", {
        headers: {
          Accept: "text/event-stream",
          ...bearer(access.token),
        },
      });
      expect(stream.status).toBe(200);
      const reader = stream.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const started = Date.now();
      while (Date.now() - started < 4000) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        if (buf.includes("token_expired")) break;
      }
      expect(buf).toContain("token_expired");
      await reader.cancel();
    } finally {
      await ctx.jord.close();
    }
  });

  it("closes a websocket after the access JWT exp", async () => {
    const ctx = await boot();
    const server = serve({
      fetch: ctx.app.fetch,
      port: 0,
      hostname: "127.0.0.1",
    });
    ctx.app.injectWebSocket(server);
    await new Promise<void>((resolve) => {
      if (server.address()) resolve();
      else server.once("listening", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    const access = signAccessToken({
      secret: JWT,
      iss: "jord",
      aud: "jord",
      sub: "user-1",
      role: "user",
      ttlSec: 1,
    });
    try {
      const code = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("ws expiry timeout")), 4000);
        const ws = new WebSocket(
          `ws://127.0.0.1:${addr.port}/realtime/ws?table=lab_notes`,
          { headers: bearer(access.token) },
        );
        ws.on("close", (closeCode) => {
          clearTimeout(timer);
          resolve(closeCode);
        });
        ws.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      expect(code).toBe(4401);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await ctx.jord.close();
    }
  });
});
