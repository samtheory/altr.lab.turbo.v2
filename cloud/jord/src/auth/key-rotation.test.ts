import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createAesGcmSecretPort,
  createJordClient,
  fsPathToFileUrl,
  type AesGcmSecretPort,
  type JordDriverPort,
} from "@altr/jord";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createJordApp } from "../app.js";
import { verifyProjectKey } from "../projects/registry.js";
import { createWriteQueue } from "../queue.js";
import type { JordAuthConfig } from "./config.js";
import { signAccessToken } from "./jwt.js";
import { signSessionToken } from "./token.js";

const HOUR = 3600_000;
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "env-jwt-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const temps: string[] = [];
const jords: JordDriverPort[] = [];

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(async () => {
  vi.useRealTimers();
  while (jords.length > 0) await jords.pop()?.close();
  while (temps.length > 0) {
    const d = temps.pop();
    if (d) await rm(d, { recursive: true, force: true }).catch(() => undefined);
  }
});

/** Arm to make the next `remaining` matching `query` calls throw. */
type Fault = { pattern: RegExp; remaining: number };

function faultyJord(real: JordDriverPort, fault: Fault): JordDriverPort {
  return new Proxy(real, {
    get(target, prop) {
      if (prop === "query") {
        return async (sql: string, args?: Array<string | number | null>) => {
          if (fault.remaining > 0 && fault.pattern.test(sql)) {
            fault.remaining -= 1;
            throw new Error("injected failure");
          }
          return target.query(sql, args);
        };
      }
      const value = Reflect.get(target, prop, target) as unknown;
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

async function boot(
  withSecrets = true,
  opts: { auth?: JordAuthConfig; reuse?: JordDriverPort } = {},
) {
  let real = opts.reuse;
  if (!real) {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-keyrot-"));
    temps.push(dir);
    real = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    jords.push(real);
  }
  const fault: Fault = { pattern: /$^/, remaining: 0 };
  const jord = faultyJord(real, fault);
  const secrets: AesGcmSecretPort | null = withSecrets
    ? createAesGcmSecretPort({ masterKey: randomBytes(32) })
    : null;
  const dir = temps[temps.length - 1] as string;
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: opts.auth ?? AUTH,
    secrets,
    blobsRoot: path.join(dir, "blobs"),
    blobSigningSecret: "blob-base-secret",
    env: { JORD_PUBLIC_BASE_URL: "http://127.0.0.1:8787" } as NodeJS.ProcessEnv,
    projectConnectTest: async () => ({ ok: true }),
    projectBaseline: async () => undefined,
  });
  return { app, jord: real, fault };
}
type Ctx = Awaited<ReturnType<typeof boot>>;

function admin(): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
    "content-type": "application/json",
  };
}
function post(ctx: Ctx, url: string, body?: unknown, headers = admin()) {
  return ctx.app.request(url, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function signupUser(ctx: Ctx): Promise<string> {
  await ctx.app.request("/admin/auth/settings", {
    method: "PATCH",
    headers: admin(),
    body: JSON.stringify({ autoconfirm: true }),
  });
  await ctx.app.request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "k@lab.test", password: "correct-horse" }),
  });
  const res = await ctx.app.request("/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "k@lab.test", password: "correct-horse" }),
  });
  const { access_token } = (await res.json()) as { access_token: string };
  const part = access_token.split(".")[1] ?? "";
  return (
    JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      sub: string;
    }
  ).sub;
}

/** Long-lived user token so JWT expiry cannot mask key expiry. */
function userToken(secret: string, sub: string, kid = "current"): string {
  return signAccessToken({
    secret,
    iss: "jord",
    aud: "jord",
    sub,
    role: "user",
    ttlSec: 5 * 24 * 3600,
    kid,
  }).token;
}

async function me(ctx: Ctx, token: string): Promise<number> {
  return (
    await ctx.app.request("/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    })
  ).status;
}

async function signedUrl(ctx: Ctx, key: string): Promise<string> {
  const res = await post(ctx, `/blobs/lab/objects/${encodeURIComponent(key)}/sign`, {
    intent: "download",
    ttl_seconds: 3600,
  });
  expect(res.status).toBe(200);
  return ((await res.json()) as { url: string }).url.replace(
    /^https?:\/\/[^/]+/,
    "",
  );
}

async function putObject(ctx: Ctx, key: string) {
  const res = await ctx.app.request(
    `/blobs/lab/objects/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: { ...admin(), "content-type": "text/plain" },
      body: "hello",
    },
  );
  expect(res.status).toBe(200);
}

async function createProject(ctx: Ctx) {
  const res = await post(ctx, "/admin/projects", {
    slug: "drill",
    engine: "libsql-file",
    target: "./data/drill.db",
  });
  expect(res.status).toBe(201);
  return (await res.json()) as {
    project: { id: string };
    secret_key: string;
    publishable_key: string;
  };
}

async function auditText(ctx: Ctx): Promise<string> {
  const rows = await ctx.jord.query(
    "SELECT source, message, meta_json FROM jord_logs WHERE source IN ('auth.jwt','storage.keys','projects.keys')",
  );
  return JSON.stringify(rows);
}

describe("S0093 JWT key set", () => {
  it("keeps old tokens valid in the overlap, then rejects them", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    const oldTok = userToken(AUTH.jwtSecret as string, sub);
    expect(await me(ctx, oldTok)).toBe(200);

    const rot = await post(ctx, "/admin/auth/jwt/rotate", {
      overlap_seconds: 3600,
    });
    expect(rot.status).toBe(200);
    const text = await rot.text();
    expect(text).not.toContain(AUTH.jwtSecret as string);
    expect(JSON.parse(text).key.previous.expiresAt).toBeGreaterThan(Date.now());

    expect(await me(ctx, oldTok)).toBe(200); // inside overlap
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 2 * HOUR);
    expect(await me(ctx, oldTok)).toBe(401); // previous expired
  });

  it("revoke_previous drops the old key at once; bare rotate keeps legacy", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    const oldTok = userToken(AUTH.jwtSecret as string, sub);
    await post(ctx, "/admin/auth/jwt/rotate", {
      overlap_seconds: 3600,
      revoke_previous: true,
    });
    expect(await me(ctx, oldTok)).toBe(401);

    const ctx2 = await boot();
    const sub2 = await signupUser(ctx2);
    const t2 = userToken(AUTH.jwtSecret as string, sub2);
    await post(ctx2, "/admin/auth/jwt/rotate", { overlap_seconds: 3600 });
    expect(await me(ctx2, t2)).toBe(200);
    const rev = await post(ctx2, "/admin/auth/jwt/revoke-previous");
    expect(rev.status).toBe(200);
    expect(await me(ctx2, t2)).toBe(401);
  });

  it("rotate requires operator admin", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    const user = {
      authorization: `Bearer ${userToken(AUTH.jwtSecret as string, sub)}`,
      "content-type": "application/json",
    };
    const res = await post(ctx, "/admin/auth/jwt/rotate", {}, user);
    expect(res.status).toBe(403);
  });
});

describe("S0093 blob HMAC key set", () => {
  it("verifies old URLs in the overlap, fails after, new URLs work", async () => {
    const ctx = await boot();
    await putObject(ctx, "a.txt");
    const oldUrl = await signedUrl(ctx, "a.txt");
    expect((await ctx.app.request(oldUrl)).status).toBe(200);

    const rot = await post(ctx, "/admin/storage/keys/rotate", {
      overlap_seconds: 7200,
    });
    expect(rot.status).toBe(200);
    const rotText = await rot.text();
    expect(rotText).not.toContain("blob-base-secret");

    expect((await ctx.app.request(oldUrl)).status).toBe(200); // previous key
    const newUrl = await signedUrl(ctx, "a.txt"); // signed with current
    expect(newUrl).not.toBe(oldUrl);
    expect((await ctx.app.request(newUrl)).status).toBe(200);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * HOUR);
    // old URL is also past its own 1 h TTL; re-sign with the new key instead
    // of relying on TTL alone: forge an unexpired URL under the OLD key.
    const { signLocalParams } = await import("../storage/hmac.js");
    const exp = Date.now() + HOUR;
    const forged = new URL(`http://x${newUrl}`);
    forged.searchParams.set("X-Jord-Expires", String(exp));
    forged.searchParams.set(
      "X-Jord-Signature",
      signLocalParams("blob-base-secret", {
        bucket: "lab",
        key: "a.txt",
        method: "GET",
        expiresAt: exp,
      }),
    );
    expect(
      (await ctx.app.request(forged.pathname + forged.search)).status,
    ).toBe(403);
    const fresh = await (async () => {
      const res = await post(ctx, "/blobs/lab/objects/a.txt/sign", {
        intent: "download",
      });
      return ((await res.json()) as { url: string }).url.replace(
        /^https?:\/\/[^/]+/,
        "",
      );
    })();
    expect((await ctx.app.request(fresh)).status).toBe(200);
  });

  it("revoke_previous and revoke-previous are immediate", async () => {
    const ctx = await boot();
    await putObject(ctx, "b.txt");
    const oldUrl = await signedUrl(ctx, "b.txt");
    await post(ctx, "/admin/storage/keys/rotate", { revoke_previous: true });
    expect((await ctx.app.request(oldUrl)).status).toBe(403);

    const url2 = await signedUrl(ctx, "b.txt");
    await post(ctx, "/admin/storage/keys/rotate", { overlap_seconds: 3600 });
    expect((await ctx.app.request(url2)).status).toBe(200);
    expect((await post(ctx, "/admin/storage/keys/revoke-previous")).status).toBe(
      200,
    );
    expect((await ctx.app.request(url2)).status).toBe(403);
  });

  it("requires operator admin and a master key", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    const user = {
      authorization: `Bearer ${userToken(AUTH.jwtSecret as string, sub)}`,
      "content-type": "application/json",
    };
    expect((await post(ctx, "/admin/storage/keys/rotate", {}, user)).status).toBe(
      403,
    );
    const noKey = await boot(false);
    expect((await post(noKey, "/admin/storage/keys/rotate", {})).status).toBe(503);
  });
});

describe("S0093 project keys", () => {
  it("old key verifies in the overlap, fails after; revoke is immediate", async () => {
    const ctx = await boot();
    const created = await createProject(ctx);
    const id = created.project.id;
    expect(await verifyProjectKey(ctx, created.secret_key)).toMatchObject({
      slot: "current",
    });

    const rot = await post(ctx, `/admin/projects/${id}/rotate-keys`, {
      overlap_seconds: 3600,
    });
    expect(rot.status).toBe(200);
    const body = (await rot.json()) as { secret_key: string };
    expect(body.secret_key).not.toBe(created.secret_key);

    expect(await verifyProjectKey(ctx, created.secret_key)).toMatchObject({
      slot: "previous",
    });
    expect(await verifyProjectKey(ctx, body.secret_key)).toMatchObject({
      slot: "current",
    });
    expect(
      await verifyProjectKey(ctx, created.secret_key, Date.now() + 2 * HOUR),
    ).toBeNull();

    // Secret never shows up in reads after creation / rotation.
    const get = await ctx.app.request(`/admin/projects/${id}`, {
      headers: admin(),
    });
    const getText = await get.text();
    expect(getText).not.toContain(body.secret_key);
    expect(getText).not.toContain(created.secret_key);

    const r2 = await post(ctx, `/admin/projects/${id}/rotate-keys`, {
      overlap_seconds: 3600,
    });
    const k2 = (await r2.json()) as { publishable_key: string };
    expect(await verifyProjectKey(ctx, body.secret_key)).not.toBeNull();
    await post(ctx, `/admin/projects/${id}/revoke-previous-keys`);
    expect(await verifyProjectKey(ctx, body.secret_key)).toBeNull();
    expect(await verifyProjectKey(ctx, k2.publishable_key)).not.toBeNull();

    const r3 = await post(ctx, `/admin/projects/${id}/rotate-keys`, {
      revoke_previous: true,
    });
    expect(r3.status).toBe(200);
    expect(await verifyProjectKey(ctx, k2.publishable_key)).toBeNull();
  });

  it("rotate requires operator admin", async () => {
    const ctx = await boot();
    const created = await createProject(ctx);
    const sub = await signupUser(ctx);
    const user = {
      authorization: `Bearer ${userToken(AUTH.jwtSecret as string, sub)}`,
      "content-type": "application/json",
    };
    const res = await post(
      ctx,
      `/admin/projects/${created.project.id}/rotate-keys`,
      {},
      user,
    );
    expect(res.status).toBe(403);
  });
});

describe("S0093 drill: all three key types", () => {
  it("overlap, fast-forward past it, new credentials work, audit is clean", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    await putObject(ctx, "d.txt");
    const created = await createProject(ctx);

    const oldJwt = userToken(AUTH.jwtSecret as string, sub);
    const oldUrl = await signedUrl(ctx, "d.txt");
    const oldKey = created.secret_key;

    const jwtRot = await (
      await post(ctx, "/admin/auth/jwt/rotate", { overlap_seconds: 7200 })
    ).text();
    const blobRot = await (
      await post(ctx, "/admin/storage/keys/rotate", { overlap_seconds: 7200 })
    ).text();
    const projRot = await post(
      ctx,
      `/admin/projects/${created.project.id}/rotate-keys`,
      { overlap_seconds: 7200 },
    );
    const newKey = ((await projRot.json()) as { secret_key: string }).secret_key;

    // Within overlap: old still good.
    expect(await me(ctx, oldJwt)).toBe(200);
    expect((await ctx.app.request(oldUrl)).status).toBe(200);
    expect(await verifyProjectKey(ctx, oldKey)).not.toBeNull();

    // Past overlap: old rejected, new works.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * HOUR);
    expect(await me(ctx, oldJwt)).toBe(401);
    expect(await verifyProjectKey(ctx, oldKey)).toBeNull();
    expect(await verifyProjectKey(ctx, newKey)).not.toBeNull();
    const freshUrl = await signedUrl(ctx, "d.txt");
    expect((await ctx.app.request(freshUrl)).status).toBe(200);
    const signin = await ctx.app.request("/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "k@lab.test", password: "correct-horse" }),
    });
    const { access_token } = (await signin.json()) as { access_token: string };
    expect(await me(ctx, access_token)).toBe(200);

    // Audit rows exist for each rotation and carry no secret material.
    const audit = await auditText(ctx);
    expect(audit).toContain("jwt key rotated");
    expect(audit).toContain("blob signing key rotated");
    expect(audit).toContain("project keys rotated");
    for (const secret of [
      AUTH.jwtSecret as string,
      "blob-base-secret",
      oldKey,
      newKey,
      created.publishable_key,
    ]) {
      expect(audit).not.toContain(secret);
      expect(jwtRot).not.toContain(secret);
      expect(blobRot).not.toContain(secret);
    }
  });
});

async function jwtInfo(ctx: Ctx) {
  const res = await ctx.app.request("/admin/auth/jwt", { headers: admin() });
  expect(res.status).toBe(200);
  return ((await res.json()) as { key: Record<string, unknown> }).key as {
    source: string;
    fingerprint: string | null;
    available: boolean;
    previous: {
      fingerprint: string | null;
      expiresAt: number | null;
      source: string;
    } | null;
    previousRevoked: boolean;
  };
}

async function blobFingerprint(ctx: Ctx): Promise<string> {
  const res = await ctx.app.request("/admin/storage/keys", { headers: admin() });
  return ((await res.json()) as { key: { fingerprint: string } }).key.fingerprint;
}

function signinToken(ctx: Ctx): Promise<Response> {
  return Promise.resolve(
    ctx.app.request("/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "k@lab.test", password: "correct-horse" }),
    }),
  );
}

describe("S0093 security review regressions", () => {
  it("1: JWT rotate is atomic; a failed second statement leaves the old key set intact", async () => {
    const ctx = await boot();
    await signupUser(ctx);
    expect((await post(ctx, "/admin/auth/jwt/rotate", {})).status).toBe(200);
    const before = await jwtInfo(ctx);
    const tok = (
      (await (await signinToken(ctx)).json()) as { access_token: string }
    ).access_token;
    expect(await me(ctx, tok)).toBe(200);

    // The second statement inside the rotate transaction fails.
    ctx.fault.pattern = /UPDATE jord_auth_settings/;
    ctx.fault.remaining = 1;
    const rot = await post(ctx, "/admin/auth/jwt/rotate", { overlap_seconds: 3600 });
    expect(rot.status).toBe(503);

    const after = await jwtInfo(ctx);
    expect(after.fingerprint).toBe(before.fingerprint);
    expect(after.previous).toBeNull();
    expect(await me(ctx, tok)).toBe(200);
    const row = await ctx.jord.query(
      "SELECT previous_sealed FROM jord_key_sets WHERE id = 'jwt'",
    );
    expect(row[0]?.previous_sealed ?? null).toBeNull();
  });

  it("1: blob rotate failure keeps the old key; project rotate/archive roll back", async () => {
    const ctx = await boot();
    await putObject(ctx, "atomic.txt");
    const url = await signedUrl(ctx, "atomic.txt");
    const fp = await blobFingerprint(ctx);
    ctx.fault.pattern = /INSERT INTO jord_key_sets/;
    ctx.fault.remaining = 1;
    expect((await post(ctx, "/admin/storage/keys/rotate", {})).status).toBe(503);
    expect((await ctx.app.request(url)).status).toBe(200);
    expect(await blobFingerprint(ctx)).toBe(fp);

    const created = await createProject(ctx);
    ctx.fault.pattern = /INSERT INTO jord_project_keys/;
    ctx.fault.remaining = 1;
    const rot = await post(ctx, `/admin/projects/${created.project.id}/rotate-keys`, {
      overlap_seconds: 3600,
    });
    expect(rot.status).not.toBe(200);
    expect(await verifyProjectKey(ctx, created.secret_key)).toMatchObject({
      slot: "current",
    });
    expect(
      await ctx.jord.query("SELECT id FROM jord_project_key_previous"),
    ).toHaveLength(0);

    ctx.fault.pattern = /UPDATE jord_projects/;
    ctx.fault.remaining = 1;
    const del = await ctx.app.request(`/admin/projects/${created.project.id}`, {
      method: "DELETE",
      headers: admin(),
    });
    expect(del.status).not.toBe(200);
    expect(await verifyProjectKey(ctx, created.secret_key)).not.toBeNull();
  });

  it("2: an unsealable stored JWT key fails closed (no env verify, 503 on issuance)", async () => {
    const ctx = await boot();
    await signupUser(ctx);
    expect((await post(ctx, "/admin/auth/jwt/rotate", {})).status).toBe(200);

    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      // Same database, different master key: the stored key cannot be unsealed.
      const peer = await boot(true, { reuse: ctx.jord });
      const envTok = userToken(AUTH.jwtSecret as string, "someone");
      expect(await me(peer, envTok)).toBe(401);
      expect((await signinToken(peer)).status).toBe(503);
      expect((await jwtInfo(peer)).available).toBe(false);
      expect(err).toHaveBeenCalled();
    } finally {
      err.mockRestore();
    }
  });

  it("2: a key-set read error is not 'no row': env key refused until a read succeeds", async () => {
    const ctx = await boot();
    const sub = await signupUser(ctx);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const peer = await boot(true, { reuse: ctx.jord });
      peer.fault.pattern = /FROM jord_key_sets/;
      peer.fault.remaining = 1_000;
      const envTok = userToken(AUTH.jwtSecret as string, sub);
      expect(await me(peer, envTok)).toBe(401);
      expect((await signinToken(peer)).status).toBe(503);

      peer.fault.remaining = 0;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.now() + 6_000);
      expect(await me(peer, envTok)).toBe(200); // confirmed "no row" → env
    } finally {
      err.mockRestore();
    }
  });

  it("2: an unsealable stored blob key fails closed", async () => {
    const ctx = await boot();
    await putObject(ctx, "fc.txt");
    expect(
      (await post(ctx, "/admin/storage/keys/rotate", { overlap_seconds: 0 })).status,
    ).toBe(200);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const peer = await boot(true, { reuse: ctx.jord });
      const { signLocalParams } = await import("../storage/hmac.js");
      const exp = Date.now() + HOUR;
      const sig = signLocalParams("blob-base-secret", {
        bucket: "lab",
        key: "fc.txt",
        method: "GET",
        expiresAt: exp,
      });
      const envUrl =
        `/blobs/signed/lab/objects/fc.txt?X-Jord-Algorithm=JORD1-HMAC-SHA256` +
        `&X-Jord-Expires=${exp}&X-Jord-SignedHeaders=host&X-Jord-Signature=${sig}`;
      expect((await peer.app.request(envUrl)).status).toBe(403);
      const sign = await post(peer, "/blobs/lab/objects/fc.txt/sign", {
        intent: "download",
      });
      expect(sign.status).toBe(503);
    } finally {
      err.mockRestore();
    }
  });

  it("3: revoke-previous also disables JORD_JWT_SECRET_PREVIOUS and reports it", async () => {
    const auth = { ...AUTH, jwtSecretPrevious: "env-prev-secret" };
    const ctx = await boot(true, { auth });
    const sub = await signupUser(ctx);
    const prevTok = userToken("env-prev-secret", sub, "previous");
    expect(await me(ctx, prevTok)).toBe(200);
    expect((await jwtInfo(ctx)).previous).toMatchObject({
      source: "env",
      expiresAt: null,
    });

    const rev = await post(ctx, "/admin/auth/jwt/revoke-previous");
    expect(rev.status).toBe(200);
    const key = (
      (await rev.json()) as { key: { previous: unknown; previousRevoked: boolean } }
    ).key;
    expect(key.previous).toBeNull();
    expect(key.previousRevoked).toBe(true);
    expect(await me(ctx, prevTok)).toBe(401);

    const blobRev = await post(ctx, "/admin/storage/keys/revoke-previous");
    expect(blobRev.status).toBe(200);
    expect(
      ((await blobRev.json()) as { key: { previousRevoked: boolean } }).key
        .previousRevoked,
    ).toBe(true);
  });

  it("4: explicit overlap_seconds 0 means no overlap for blob and project keys", async () => {
    const ctx = await boot();
    await putObject(ctx, "z.txt");
    const url = await signedUrl(ctx, "z.txt");
    const rot = await post(ctx, "/admin/storage/keys/rotate", { overlap_seconds: 0 });
    expect(rot.status).toBe(200);
    expect(((await rot.json()) as { key: { previous: unknown } }).key.previous).toBeNull();
    expect((await ctx.app.request(url)).status).toBe(403);

    // Omitted = 2 h default for blob.
    const t0 = Date.now();
    const rot2 = await post(ctx, "/admin/storage/keys/rotate", {});
    const exp = (
      (await rot2.json()) as { key: { previous: { expiresAt: number } } }
    ).key.previous.expiresAt;
    expect(exp).toBeGreaterThanOrEqual(t0 + 2 * HOUR);
    expect(exp).toBeLessThan(t0 + 2 * HOUR + 60_000);

    const created = await createProject(ctx);
    const p = await post(ctx, `/admin/projects/${created.project.id}/rotate-keys`, {
      overlap_seconds: 0,
    });
    expect(
      ((await p.json()) as { previous_expires_at: unknown }).previous_expires_at,
    ).toBeNull();
    expect(await verifyProjectKey(ctx, created.secret_key)).toBeNull();
  });

  it("5: anon keys verify within the overlap only; rotate reports anon_keys_affected", async () => {
    const ctx = await boot();
    await ctx.app.request("/admin/auth/settings", {
      method: "PATCH",
      headers: admin(),
      body: JSON.stringify({ anonymous_enabled: true }),
    });
    const anonRes = await post(ctx, "/auth/anon-key");
    expect(anonRes.status).toBe(200);
    const anon = ((await anonRes.json()) as { access_token: string }).access_token;
    const before = await me(ctx, anon);
    expect(before).not.toBe(401);

    const rot = await post(ctx, "/admin/auth/jwt/rotate", { overlap_seconds: 3600 });
    const body = (await rot.json()) as {
      anon_keys_affected: boolean;
      anon_keys_valid_until: number;
      key: { previous: { expiresAt: number } };
    };
    expect(body.anon_keys_affected).toBe(true);
    expect(body.anon_keys_valid_until).toBe(body.key.previous.expiresAt);
    expect(await me(ctx, anon)).toBe(before); // inside overlap
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 2 * HOUR);
    expect(await me(ctx, anon)).toBe(401); // overlap over: reissue required
  });

  it("6: fingerprints are keyed by the server token and stable across restarts", async () => {
    const { createHash } = await import("node:crypto");
    const { createFingerprinter } = await import("./key-sets.js");
    const ctx = await boot();
    const fp = (await jwtInfo(ctx)).fingerprint;
    expect(fp).toMatch(/^[0-9a-f]{12}$/);
    expect(fp).toBe(createFingerprinter(AUTH.secret)(AUTH.jwtSecret as string));
    expect(fp).not.toBe(
      createHash("sha256").update(AUTH.jwtSecret as string).digest("hex").slice(0, 12),
    );
    const again = await boot(true, { reuse: ctx.jord });
    expect((await jwtInfo(again)).fingerprint).toBe(fp);
    expect(createFingerprinter("other-token")(AUTH.jwtSecret as string)).not.toBe(fp);
  });

  it("7: key lookup logs a missing overlap table once per minute and stays closed", async () => {
    const { findProjectKeyByHash, resetKeyLookupLogState } = await import(
      "../projects/key-lookup.js"
    );
    const ctx = await boot();
    await ctx.jord.query("DROP TABLE jord_project_key_previous");
    resetKeyLookupLogState();
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const hash = "ab".repeat(32);
      expect(await findProjectKeyByHash(ctx.jord, hash)).toBeNull();
      expect(await findProjectKeyByHash(ctx.jord, hash)).toBeNull();
      const lines = err.mock.calls.filter((c) =>
        String(c[0]).includes("table_missing"),
      );
      expect(lines).toHaveLength(1);
    } finally {
      err.mockRestore();
    }
  });
});
