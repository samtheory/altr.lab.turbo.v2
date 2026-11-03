import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { RealtimeBus } from "../realtime/index.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { idempotencyPrincipalKey, readBodyTextCapped } from "./middleware.js";
import { createIdempotencyStore, type IdempotencyStore } from "./store.js";

const open: TestDb[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const JSON_CT = { "content-type": "application/json" };
const ADMIN = { authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`, ...JSON_CT };
const SERVICE = { authorization: `Bearer ${AUTH.secret}`, ...JSON_CT };

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

async function boot(idempotency: IdempotencyStore) {
  const db = await openTestDb("file");
  open.push(db);
  return createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    realtime: new RealtimeBus(),
    idempotency,
  });
}

describe("idempotency hardening", () => {
  it("readBodyTextCapped stops counting past the cap and returns null", async () => {
    const chunk = new Uint8Array(600);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const req = new Request("http://x/", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readBodyTextCapped(req, 1000)).toBeNull();
    expect(await readBodyTextCapped(new Request("http://x/", { method: "POST", body: "hello" }), 1000)).toBe(
      "hello",
    );
  });

  it("a chunked body over the cap with an Idempotency-Key is 413 and never reaches the store", async () => {
    const calls: string[] = [];
    const inner = createIdempotencyStore(60_000);
    const app = await boot({
      lookup: (...args) => (calls.push("lookup"), inner.lookup(...args)),
      remember: (...args) => (calls.push("remember"), inner.remember(...args)),
    });
    const piece = new Uint8Array(512 * 1024).fill(97);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(piece);
        controller.enqueue(piece);
        controller.enqueue(piece); // 1.5 MiB > 1 MiB cap, no Content-Length
        controller.close();
      },
    });
    const res = await app.request("/api/v1/rpc/anything", {
      method: "POST",
      headers: { ...SERVICE, "Idempotency-Key": "chunked-1" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "payload_too_large" });
    expect(calls).toEqual([]);
  });

  it("anon principal keys differ per client IP and never contain the raw IP", () => {
    const anon = { kind: "anon", role: "anon" };
    const a = idempotencyPrincipalKey(anon, "203.0.113.7, 10.0.0.1");
    const b = idempotencyPrincipalKey(anon, "203.0.113.8");
    expect(a).not.toBe(b);
    expect(a).toBe(idempotencyPrincipalKey(anon, "203.0.113.7"));
    expect(a).not.toContain("203.0.113.7");
    expect(idempotencyPrincipalKey(anon, undefined)).toBe(idempotencyPrincipalKey(anon, ""));
    const user = { kind: "user", role: "user", uid: "u1" };
    expect(idempotencyPrincipalKey(user, "1.1.1.1")).toBe("user:u1");
    expect(idempotencyPrincipalKey(user, "2.2.2.2")).toBe("user:u1");
  });

  it("two anon callers (different x-forwarded-for) do not see each other's cached response", async () => {
    const app = await boot(createIdempotencyStore(60_000));
    const fn = (await (
      await app.request("/functions", {
        method: "POST",
        headers: ADMIN,
        body: JSON.stringify({ name: "e", slug: "e", steps: JSON.stringify([{ kind: "echo" }]) }),
      })
    ).json()) as { id: string };
    const api = await app.request("/custom-apis", {
      method: "POST",
      headers: ADMIN,
      body: JSON.stringify({ name: "e", method: "POST", slug: "e", function_id: fn.id }),
    });
    expect(api.status).toBe(201);
    const minted = {
      access_token: signAccessToken({
        secret: AUTH.jwtSecret!,
        iss: "jord",
        aud: "jord",
        sub: "anon",
        role: "anon",
      } as Parameters<typeof signAccessToken>[0]).token,
    };
    const anon = (ip: string) => ({
      authorization: `Bearer ${minted.access_token}`,
      ...JSON_CT,
      "x-forwarded-for": ip,
      "Idempotency-Key": "shared-key",
    });
    const call = (ip: string, args: unknown) =>
      app.request("/api/v1/rpc/e", { method: "POST", headers: anon(ip), body: JSON.stringify({ args }) });

    const first = await call("198.51.100.1", { message: "one" });
    expect(first.status).toBe(200);
    // Same caller + same key + different body => conflict (cache is active for that caller).
    expect((await call("198.51.100.1", { message: "changed" })).status).toBe(409);
    // A different anon caller with the same key does not hit that cache entry (no conflict, own result).
    const other = await call("198.51.100.2", { message: "changed" });
    expect(other.status).toBe(200);
    expect(await other.json()).toEqual({ result: { echoed: "changed", body: { message: "changed" } } });
  });
});
