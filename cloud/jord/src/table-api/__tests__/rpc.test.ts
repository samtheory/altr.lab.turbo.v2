import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../../app.js";
import type { JordAuthConfig } from "../../auth/config.js";
import { signAccessToken } from "../../auth/jwt.js";
import { signSessionToken } from "../../auth/token.js";
import { createWriteQueue } from "../../queue.js";
import { RealtimeBus } from "../../realtime/index.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../../testing/harness.js";

const open: TestDb[] = [];
const JWT = "jwt-current-secret";
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const JSON_CT = { "content-type": "application/json" };
const SERVICE = { ...bearer(AUTH.secret), ...JSON_CT };
const operator = (role: "admin" | "editor" | "readonly") => ({
  ...bearer(signSessionToken(role, AUTH.secret)),
  ...JSON_CT,
});
const USER = {
  ...bearer(signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub: "user-1", role: "user" }).token),
  ...JSON_CT,
};

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    realtime: new RealtimeBus(),
  });
  return { app, db };
}

type App = Awaited<ReturnType<typeof boot>>["app"];

/** Defines a function; `expose` also registers an enabled `POST /x/:slug` custom API for it. */
async function defineFn(app: App, slug: string, steps: unknown[], enabled = true, expose = true) {
  const res = await app.request("/functions", {
    method: "POST",
    headers: operator("admin"),
    body: JSON.stringify({ name: slug, slug, steps: JSON.stringify(steps), enabled }),
  });
  expect(res.status).toBe(201);
  const fn = (await res.json()) as { id: string };
  if (expose) await exposeFn(app, slug, fn.id);
  return fn.id;
}

async function exposeFn(app: App, slug: string, functionId: string, apiEnabled = true) {
  const res = await app.request("/custom-apis", {
    method: "POST",
    headers: operator("admin"),
    body: JSON.stringify({ name: slug, method: "POST", slug, function_id: functionId, enabled: apiEnabled }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function rpc(app: App, fn: string, body: unknown, headers: Record<string, string>) {
  const res = await app.request(`/api/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  // The outer route gate (routeAllowed) answers some 403s as plain text.
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { res, body: parsed as { result?: unknown; error?: { code: string; message: string } } };
}

describe.each(TEST_BACKENDS)("S0080 RPC (%s)", (backend) => {
  it("invokes a registered function with args as the step body", async () => {
    const { app } = await boot(backend);
    await defineFn(app, "hello", [{ kind: "echo" }]);
    const r = await rpc(app, "hello", { args: { message: "hi", n: 1 } }, USER);
    expect(r.res.status).toBe(200);
    expect(r.body).toEqual({ result: { echoed: "hi", body: { message: "hi", n: 1 } } });
    const noArgs = await rpc(app, "hello", {}, USER);
    expect(noArgs.body).toEqual({ result: { echoed: "echo", body: {} } });
  });

  it("unknown function is 404; bad bodies are 400; oversize is 413", async () => {
    const { app } = await boot(backend);
    await defineFn(app, "hello", [{ kind: "echo" }]);
    expect((await rpc(app, "nope", { args: {} }, USER)).res.status).toBe(404);
    expect((await rpc(app, "nope", { args: {} }, USER)).body).toEqual({ error: "unknown_function" });
    expect((await rpc(app, "bad%20slug", { args: {} }, USER)).res.status).toBe(404);
    for (const body of [[1], { args: [1] }, { args: "x" }, { args: {}, extra: 1 }, "not json"]) {
      const r = await rpc(app, "hello", body, USER);
      expect(r.res.status, JSON.stringify(body)).toBe(400);
      expect(["bad_body", "bad_args"]).toContain(r.body.error?.code);
    }
    const big = { args: { message: "x".repeat(1024 * 1024) } };
    expect((await rpc(app, "hello", big, USER)).res.status).toBe(413);
  });

  it("binds the caller's principal: user denied by step policy, service allowed, readonly operator forbidden", async () => {
    const { app, db } = await boot(backend);
    await defineFn(app, "count-lab", [{ kind: "records_count", config: { bucket: "lab" } }]);
    await db.jord.insertRecord({ bucket: "lab", body: "x" });

    // A user is NOT run as service: the records step evaluates policies for the user (default deny).
    const user = await rpc(app, "count-lab", { args: {} }, USER);
    expect(user.res.status).toBe(403);
    expect(user.body.error).toEqual({ code: "policy_denied", message: "policy denied" });

    const service = await rpc(app, "count-lab", { args: {} }, SERVICE);
    expect(service.res.status).toBe(200);
    expect(service.body.result).toMatchObject({ bucket: "lab", count: 1 });

    // Write steps use the caller's step role: a user (readonly role) cannot insert.
    await defineFn(app, "add-lab", [{ kind: "records_insert", config: { bucket: "lab" } }]);
    const userWrite = await rpc(app, "add-lab", { args: { body: "y" } }, USER);
    expect(userWrite.res.status).toBe(403);
    expect((await db.jord.listRecordsByBucket("lab")).length).toBe(1);

    // Same allowsInvoke gate as /x/:slug: readonly operators cannot invoke.
    expect((await rpc(app, "count-lab", { args: {} }, operator("readonly"))).res.status).toBe(403);
    expect((await rpc(app, "count-lab", { args: {} }, operator("editor"))).res.status).toBe(200);
  });

  it("a disabled function is not run", async () => {
    const { app } = await boot(backend);
    await defineFn(app, "off", [{ kind: "echo" }], false);
    const r = await rpc(app, "off", { args: {} }, SERVICE);
    expect(r.res.status).toBe(503);
    expect(r.body.error?.code).toBe("function_disabled");
  });

  it("user/anon may only call functions exposed by an enabled POST /x/:slug custom API", async () => {
    const { app } = await boot(backend);
    const hiddenId = await defineFn(app, "hidden", [{ kind: "echo" }], true, false);
    const missing = await rpc(app, "nope", { args: {} }, USER);
    expect(missing.res.status).toBe(404);

    // Registered function without a custom API: identical body to a missing function.
    const hidden = await rpc(app, "hidden", { args: {} }, USER);
    expect(hidden.res.status).toBe(404);
    expect(hidden.body).toEqual({ error: "unknown_function" });
    expect(hidden.body).toEqual(missing.body);
    // Service and operator admin may call any enabled function; execution is still the caller's.
    expect((await rpc(app, "hidden", { args: {} }, SERVICE)).res.status).toBe(200);
    expect((await rpc(app, "hidden", { args: {} }, operator("admin"))).res.status).toBe(200);
    // Editor operators are not admins.
    expect((await rpc(app, "hidden", { args: {} }, operator("editor"))).res.status).toBe(404);

    // A custom API on another verb (GET) does not expose it either; POST does; disabling hides it again.
    const getApi = await app.request("/custom-apis", {
      method: "POST",
      headers: operator("admin"),
      body: JSON.stringify({ name: "g", method: "GET", slug: "hidden", function_id: hiddenId }),
    });
    expect(getApi.status).toBe(201);
    expect((await rpc(app, "hidden", { args: {} }, USER)).res.status).toBe(404);
    const apiId = await exposeFn(app, "hidden", hiddenId);
    expect((await rpc(app, "hidden", { args: {} }, USER)).res.status).toBe(200);
    const off = await app.request(`/custom-apis/${apiId}`, {
      method: "PATCH",
      headers: operator("admin"),
      body: JSON.stringify({ enabled: false }),
    });
    expect(off.status).toBe(200);
    expect((await rpc(app, "hidden", { args: {} }, USER)).body).toEqual({ error: "unknown_function" });
    expect((await rpc(app, "hidden", { args: {} }, SERVICE)).res.status).toBe(200);
  });

  it("the JORD_CUSTOM_API_DISABLED kill switch hides the function from user callers", async () => {
    const prev = process.env.JORD_CUSTOM_API_DISABLED;
    process.env.JORD_CUSTOM_API_DISABLED = "killed";
    try {
      const { app } = await boot(backend);
      await defineFn(app, "killed", [{ kind: "echo" }]);
      await defineFn(app, "alive", [{ kind: "echo" }]);
      expect((await rpc(app, "killed", { args: {} }, USER)).body).toEqual({ error: "unknown_function" });
      expect((await rpc(app, "alive", { args: {} }, USER)).res.status).toBe(200);
      expect((await rpc(app, "killed", { args: {} }, SERVICE)).res.status).toBe(200);
    } finally {
      if (prev === undefined) delete process.env.JORD_CUSTOM_API_DISABLED;
      else process.env.JORD_CUSTOM_API_DISABLED = prev;
    }
  });

  it("is listed in OpenAPI with the bulk path", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT)");
    const doc = (await (await app.request("/api/v1/openapi.json", { headers: SERVICE })).json()) as {
      paths: Record<string, unknown>;
    };
    expect(doc.paths["/api/v1/rpc/{fn}"]).toBeDefined();
    expect(doc.paths["/api/v1/notes/bulk"]).toBeDefined();
  });
});
