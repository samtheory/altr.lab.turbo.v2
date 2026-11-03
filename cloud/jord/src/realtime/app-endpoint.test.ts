import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";

import { createAesGcmSecretPort } from "@altr/jord";
import { serve } from "@hono/node-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { ConsoleMailer } from "../auth/mailer.js";
import { signSessionToken } from "../auth/token.js";
import type { HttpRequestLog } from "../http/request-log.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import {
  rowMatchesFilters,
  sendWithBackpressure,
  warnIfMultiProject,
} from "./app-endpoint.js";
import { RealtimeBus } from "./bus.js";

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

const open: TestDb[] = [];
const servers: Array<{ close: (cb: () => void) => void }> = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const ws of sockets.splice(0)) ws.terminate();
  while (servers.length > 0) {
    const s = servers.pop()!;
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  while (open.length > 0) await open.pop()?.close();
});

const json = { "content-type": "application/json" };
const adminHeaders = () => ({
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  ...json,
});
const userToken = (sub: string) =>
  signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub, role: "user" }).token;

type Keys = { id: string; slug: string; pub: string; sec: string; bar: string };

async function boot(
  opts: { env?: Record<string, string>; recheckMs?: number; bus?: RealtimeBus } = {},
) {
  const db = await openTestDb("file");
  open.push(db);
  const httpLines: HttpRequestLog[] = [];
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
    secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
    projectConnectTest: async () => ({ ok: true }),
    projectBaseline: async () => undefined,
    env: { ...process.env, JORD_HTTP_LOG: "1", ...(opts.env ?? {}) },
    httpLog: (line) => httpLines.push(line),
    realtimeRecheckMs: opts.recheckMs,
    ...(opts.bus ? { realtime: opts.bus } : {}),
  });
  const admin = adminHeaders();
  const call = async (method: string, path: string, body?: unknown, expected?: number) => {
    const res = await app.request(path, {
      method,
      headers: admin,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (expected != null) expect(res.status, `${method} ${path}`).toBe(expected);
    return res;
  };

  async function project(slug: string): Promise<Keys> {
    const res = await call(
      "POST",
      "/admin/projects",
      { slug, engine: "libsql-file", target: "./data/project.db" },
      201,
    );
    const body = (await res.json()) as {
      project: { id: string };
      publishable_key: string;
      secret_key: string;
      barrier_key: string;
    };
    return {
      id: body.project.id,
      slug,
      pub: body.publishable_key,
      sec: body.secret_key,
      bar: body.barrier_key,
    };
  }

  for (const name of ["lab_notes", "public_notes"]) {
    await call(
      "POST",
      "/schema/tables",
      {
        name,
        columns: [
          { name: "title", type: "TEXT" },
          { name: "owner_id", type: "TEXT" },
        ],
      },
      201,
    );
    await call("PUT", `/schema/tables/${name}/rls`, { rls_enabled: true, owner_column: "owner_id" }, 200);
  }
  await call(
    "POST",
    "/policies",
    {
      name: "own",
      table_name: "lab_notes",
      operation: "select",
      effect: "allow",
      rules: JSON.stringify([{ kind: "owner_eq", config: { column: "owner_id" } }]),
    },
    201,
  );
  await call(
    "POST",
    "/policies",
    {
      name: "open",
      table_name: "public_notes",
      operation: "select",
      effect: "allow",
      rules: JSON.stringify([{ kind: "always" }]),
    },
    201,
  );
  const insert = (table: string, id: string, owner: string, title = id) =>
    call("POST", `/schema/tables/${table}/rows`, { values: { id, title, owner_id: owner } }, 201);
  const update = (table: string, id: string, values: Record<string, unknown>) =>
    call("PATCH", `/schema/tables/${table}/rows/${id}`, { values }, 200);
  const remove = (table: string, id: string) => call("DELETE", `/schema/tables/${table}/rows/${id}`, undefined, 200);

  for (const t of ["lab_notes", "public_notes"]) {
    await insert(t, "n1", "user-1");
    await insert(t, "n2", "user-2");
  }

  const main = await project("shop");
  const other = await project("other");

  const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" });
  app.injectWebSocket(server);
  await new Promise<void>((resolve) => {
    if (server.address()) resolve();
    else server.once("listening", () => resolve());
  });
  servers.push(server as unknown as { close: (cb: () => void) => void });
  const port = (server.address() as AddressInfo).port;
  return { app, db, port, main, other, insert, update, remove, call, httpLines };
}

type Client = {
  ws: WebSocket;
  msgs: Array<Record<string, unknown>>;
  closed: Promise<{ code: number; reason: string }>;
};

async function connect(
  port: number,
  slug: string,
  headers: Record<string, string>,
  query = "",
): Promise<Client | { status: number; body: string }> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/p/${slug}/realtime${query}`, { headers });
  sockets.push(ws);
  const msgs: Array<Record<string, unknown>> = [];
  ws.on("message", (data) => msgs.push(JSON.parse(String(data)) as Record<string, unknown>));
  const closed = new Promise<{ code: number; reason: string }>((resolve) =>
    ws.on("close", (code, reason) => resolve({ code, reason: String(reason) })),
  );
  return new Promise((resolve, reject) => {
    ws.on("unexpected-response", (_req, res) => resolve({ status: res.statusCode ?? 0, body: "" }));
    ws.on("error", (err) => {
      if (!String(err.message).includes("Unexpected server response")) reject(err);
    });
    ws.on("open", async () => {
      await waitFor(msgs, (m) => m.type === "ready");
      resolve({ ws, msgs, closed });
    });
  });
}

function asClient(c: Client | { status: number }): Client {
  if ("status" in c) throw new Error(`refused ${c.status}`);
  return c;
}

async function waitFor(
  msgs: Array<Record<string, unknown>>,
  pred: (m: Record<string, unknown>) => boolean,
  ms = 2000,
): Promise<Record<string, unknown>> {
  const until = Date.now() + ms;
  for (;;) {
    const hit = msgs.find(pred);
    if (hit) return hit;
    if (Date.now() > until) throw new Error(`timeout; got ${JSON.stringify(msgs)}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const changes = (c: Client) => c.msgs.filter((m) => m.type === "jord.change");

/** Apply a snapshot + deltas into an id → row map. */
function replay(msgs: Array<Record<string, unknown>>): Map<string, Record<string, unknown>> {
  const state = new Map<string, Record<string, unknown>>();
  for (const m of msgs) {
    if (m.type === "snapshot") {
      for (const row of m.rows as Array<Record<string, unknown>>) state.set(String(row.id), row);
    } else if (m.type === "jord.change") {
      if (m.op === "delete") state.delete(String(m.id));
      else state.set(String(m.id), m.row as Record<string, unknown>);
    }
  }
  return state;
}

const pick = (state: Map<string, Record<string, unknown>>) =>
  Object.fromEntries(
    [...state.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, r]) => [id, { title: r.title, owner_id: r.owner_id }]),
  );

describe("S0084 handshake: key handling", () => {
  it("rejects every privileged credential with 401 secret_key_not_allowed", async () => {
    const { app, main } = await boot();
    const path = `/p/${main.slug}/realtime?table=public_notes`;
    const cases: Array<Record<string, string>> = [
      { "x-jord-key": main.sec },
      { apikey: main.bar },
      { "x-jord-key": AUTH.secret },
      { "x-jord-key": signSessionToken("admin", AUTH.secret) },
      { "x-jord-key": main.pub, authorization: `Bearer ${AUTH.secret}` },
      { "x-jord-key": main.pub, authorization: `Bearer ${signSessionToken("readonly", AUTH.secret)}` },
      { "x-jord-key": main.pub, authorization: `Bearer ${main.sec}` },
    ];
    for (const headers of cases) {
      const res = await app.request(path, { headers });
      expect(res.status, JSON.stringify(Object.keys(headers))).toBe(401);
      expect(((await res.json()) as { error: string }).error).toBe("secret_key_not_allowed");
    }
    // Secret in the query string, even on SSE, is refused as secret first.
    const q = await app.request(`/p/${main.slug}/realtime?table=public_notes&apikey=${main.sec}`);
    expect(q.status).toBe(401);
    expect(((await q.json()) as { error: string }).error).toBe("secret_key_not_allowed");
  });

  it("secret key on the WebSocket ?apikey= upgrade is refused before upgrade", async () => {
    const { port, main } = await boot();
    expect(await connect(port, main.slug, {}, `?apikey=${main.sec}`)).toMatchObject({ status: 401 });
  });

  it("missing/unknown key 401, wrong project 403, query key on SSE 400", async () => {
    const { app, main, other } = await boot();
    const path = `/p/${main.slug}/realtime?table=public_notes`;
    const missing = await app.request(path);
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: "missing_key" });
    const unknown = await app.request(path, { headers: { "x-jord-key": "jord_pub_nope" } });
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toMatchObject({ error: "invalid_key" });
    const wrong = await app.request(path, { headers: { "x-jord-key": other.pub } });
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toMatchObject({ error: "wrong_project" });
    const viaQuery = await app.request(`${path}&apikey=${main.pub}`);
    expect(viaQuery.status).toBe(400);
    expect(await viaQuery.json()).toMatchObject({ error: "apikey_query_ws_only" });
    const badJwt = await app.request(path, {
      headers: { "x-jord-key": main.pub, authorization: "Bearer a.b.c" },
    });
    expect(badJwt.status).toBe(401);
  });

  it("archived project: open socket closes 4410; revoked key then gets 401 invalid_key", async () => {
    const { app, port, main, call } = await boot({ recheckMs: 80 });
    const live = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    await call("DELETE", `/admin/projects/${main.id}`, undefined, 200);
    expect(await live.closed).toEqual({ code: 4410, reason: "project_unavailable" });
    // Archive deletes keys: the old key is just an invalid key now (the key
    // is validated before any project status is reported).
    const res = await app.request(`/p/${main.slug}/realtime?table=public_notes`, {
      headers: { "x-jord-key": main.pub },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "invalid_key" });
  });

  it("review #4: bad key gets identical 401 for archived, active and unknown slugs (no status oracle)", async () => {
    const { app, main, other, call } = await boot();
    await call("DELETE", `/admin/projects/${main.id}`, undefined, 200);
    const probe = async (slug: string) => {
      const res = await app.request(`/p/${slug}/realtime?table=public_notes`, {
        headers: { "x-jord-key": "jord_pub_garbage" },
      });
      return { status: res.status, body: await res.json() };
    };
    const archived = await probe(main.slug);
    const active = await probe(other.slug);
    const unknown = await probe("no-such-project");
    expect(archived.status).toBe(401);
    expect(archived).toEqual(unknown);
    expect(active).toEqual(unknown);
    expect(JSON.stringify(archived.body)).not.toMatch(/archived|status/);
    // A VALID key for another project still gets 403 wrong_project, even on
    // the archived slug.
    const wrong = await app.request(`/p/${main.slug}/realtime?table=public_notes`, {
      headers: { "x-jord-key": other.pub },
    });
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toMatchObject({ error: "wrong_project" });
  });

  it("review #6: service-role / admin-role JWTs are 401 secret_key_not_allowed, not invalid_token", async () => {
    const { app, main } = await boot();
    const path = `/p/${main.slug}/realtime?table=public_notes`;
    for (const role of ["service_role", "admin", "operator", "service"]) {
      const jwt = signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub: "svc", role }).token;
      const variants: Array<Record<string, string>> = [
        { "x-jord-key": main.pub, authorization: `Bearer ${jwt}` },
        { "x-jord-key": jwt },
      ];
      for (const headers of variants) {
        const res = await app.request(path, { headers });
        expect(res.status, role).toBe(401);
        expect(((await res.json()) as { error: string }).error, role).toBe("secret_key_not_allowed");
      }
    }
    // An end-user JWT is still accepted.
    const ok = await app.request(path, {
      headers: { "x-jord-key": main.pub, authorization: `Bearer ${userToken("user-1")}` },
    });
    expect(ok.status).toBe(200);
    await ok.body?.cancel();
  });

  it("query-param key never reaches request logs", async () => {
    const { port, main, httpLines } = await boot();
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((k) =>
      vi.spyOn(console, k).mockImplementation(() => undefined),
    );
    const c = asClient(await connect(port, main.slug, {}, `?apikey=${main.pub}`));
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await waitFor(c.msgs, (m) => m.type === "snapshot");
    expect(await connect(port, main.slug, {}, `?apikey=${main.sec}`)).toMatchObject({ status: 401 });
    const logged = JSON.stringify(httpLines) + JSON.stringify(spies.map((s) => s.mock.calls));
    expect(httpLines.some((l) => l.path === `/p/${main.slug}/realtime`)).toBe(true);
    expect(logged).not.toContain(main.pub);
    expect(logged).not.toContain(main.sec);
    expect(logged).not.toContain("apikey=");
  });
});

describe("S0084 subscribe: snapshot + deltas", () => {
  it("snapshot then ordered deltas replay to the same state as a fresh snapshot", async () => {
    const { port, main, insert, update, remove } = await boot();
    const a = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    expect(a.msgs[0]).toMatchObject({ type: "ready", project: "shop", principal: "anon" });
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    const snap = await waitFor(a.msgs, (m) => m.type === "snapshot");
    expect(snap).toMatchObject({ table: "public_notes", pk: ["id"], truncated: false });
    expect((snap.rows as unknown[]).length).toBe(2);
    const cursor = Number(snap.cursor);

    await insert("public_notes", "n3", "user-1");
    await update("public_notes", "n1", { title: "renamed" });
    await remove("public_notes", "n2");
    await insert("lab_notes", "n9", "user-1"); // other table: never delivered
    await waitFor(a.msgs, (m) => m.type === "jord.change" && m.op === "delete");
    await settle(100);

    const deltas = changes(a);
    expect(deltas.map((d) => [d.op, d.id])).toEqual([
      ["insert", "n3"],
      ["update", "n1"],
      ["delete", "n2"],
    ]);
    const seqs = deltas.map((d) => Number(d.seq));
    expect(seqs[0]).toBeGreaterThan(cursor);
    expect([...seqs].sort((x, y) => x - y)).toEqual(seqs);
    expect(deltas.every((d) => d.table === "public_notes")).toBe(true);

    const fresh = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    fresh.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await waitFor(fresh.msgs, (m) => m.type === "snapshot");
    expect(pick(replay(a.msgs))).toEqual(pick(replay(fresh.msgs)));
    expect(pick(replay(a.msgs))).toEqual({
      n1: { title: "renamed", owner_id: "user-1" },
      n3: { title: "n3", owner_id: "user-1" },
    });

    // Resume from the original cursor: catch-up yields the same deltas.
    const resumed = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    resumed.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes", since: cursor }));
    await waitFor(resumed.msgs, (m) => m.type === "jord.change" && m.op === "delete");
    expect(resumed.msgs.find((m) => m.type === "subscribed")).toMatchObject({ cursor });
    expect(changes(resumed).map((d) => d.seq)).toEqual(seqs);
  });

  it("SSE fallback streams snapshot then deltas", async () => {
    const { port, main, insert } = await boot();
    const ctrl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/p/${main.slug}/realtime?table=public_notes`, {
      headers: { "x-jord-key": main.pub },
      signal: ctrl.signal,
    });
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    let text = "";
    const readUntil = async (needle: string) => {
      const until = Date.now() + 2000;
      while (!text.includes(needle) && Date.now() < until) {
        const { value, done } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
    };
    await readUntil("event: snapshot");
    await insert("public_notes", "n5", "user-2");
    await readUntil('"id":"n5"');
    ctrl.abort();
    expect(text).toContain("event: snapshot");
    expect(text).toMatch(/event: jord\.change\ndata: .*"op":"insert".*"id":"n5"/);
  });

  it("filter narrows snapshot and deltas; a row leaving the filter arrives as delete", async () => {
    const { port, main, insert, update } = await boot();
    const a = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes", filter: { owner_id: "eq.user-1" } }));
    const snap = await waitFor(a.msgs, (m) => m.type === "snapshot");
    expect((snap.rows as Array<{ id: string }>).map((r) => r.id)).toEqual(["n1"]);
    await insert("public_notes", "n3", "user-2"); // not matching → skipped
    await update("public_notes", "n1", { owner_id: "user-2" }); // leaves the filter
    await waitFor(a.msgs, (m) => m.type === "jord.change");
    await settle(100);
    expect(changes(a).map((d) => [d.op, d.id, d.row])).toEqual([["delete", "n1", null]]);
  });
});

describe("S0084 policy at delivery", () => {
  it("denied table → 403 (same body as a missing table) and no rows", async () => {
    const { app, port, main } = await boot();
    const h = { "x-jord-key": main.pub };
    const denied = await app.request(`/p/${main.slug}/realtime?table=lab_notes`, { headers: h });
    const missing = await app.request(`/p/${main.slug}/realtime?table=no_such_table`, { headers: h });
    expect(denied.status).toBe(403);
    expect(missing.status).toBe(403);
    const db = (await denied.json()) as Record<string, unknown>;
    const mb = (await missing.json()) as Record<string, unknown>;
    expect(db).toEqual({ error: "policy_denied", operation: "select", table: "lab_notes" });
    expect({ ...mb, table: "lab_notes" }).toEqual(db);
    const reserved = await app.request(`/p/${main.slug}/realtime?table=jord_users`, { headers: h });
    expect(reserved.status).toBe(403);

    const a = asClient(await connect(port, main.slug, h));
    a.ws.send(JSON.stringify({ type: "subscribe", table: "lab_notes" }));
    const err = await waitFor(a.msgs, (m) => m.type === "error");
    expect(err).toMatchObject({ status: 403, error: "policy_denied" });
    expect(a.msgs.some((m) => m.type === "snapshot" || m.type === "jord.change")).toBe(false);
  });

  it("anon vs user: owner policy shows each user only its rows; others skipped silently", async () => {
    const { port, main, insert, update } = await boot();
    const u1 = asClient(
      await connect(port, main.slug, { "x-jord-key": main.pub, authorization: `Bearer ${userToken("user-1")}` }),
    );
    expect(u1.msgs[0]).toMatchObject({ principal: "user" });
    u1.ws.send(JSON.stringify({ type: "subscribe", table: "lab_notes" }));
    const snap = await waitFor(u1.msgs, (m) => m.type === "snapshot");
    expect((snap.rows as Array<{ id: string }>).map((r) => r.id)).toEqual(["n1"]);

    await insert("lab_notes", "n3", "user-2");
    await update("lab_notes", "n2", { title: "theirs" });
    await insert("lab_notes", "n4", "user-1");
    await waitFor(u1.msgs, (m) => m.type === "jord.change" && m.id === "n4");
    await settle(100);
    expect(changes(u1).map((d) => d.id)).toEqual(["n4"]);
    expect(JSON.stringify(u1.msgs)).not.toContain("user-2");

    const anon = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    anon.ws.send(JSON.stringify({ type: "subscribe", table: "lab_notes" }));
    expect(await waitFor(anon.msgs, (m) => m.type === "error")).toMatchObject({ status: 403 });
  });
});

describe("S0084 cursor + caps", () => {
  it("cursor older than retention → 409 resync_required (WS frame and SSE status)", async () => {
    const { app, db, port, main, insert } = await boot();
    for (const id of ["a1", "a2", "a3", "a4"]) await insert("public_notes", id, "user-1");
    const rows = await db.jord.query("SELECT MAX(seq) AS n FROM jord_changes");
    const max = Number(rows[0]?.n);
    await db.jord.query("DELETE FROM jord_changes WHERE seq < ?", [max - 1]);

    const res = await app.request(`/p/${main.slug}/realtime?table=public_notes&since=1`, {
      headers: { "x-jord-key": main.pub },
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "resync_required" });

    const a = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes", since: 1 }));
    expect(await waitFor(a.msgs, (m) => m.type === "error")).toMatchObject({
      status: 409,
      error: "resync_required",
    });
    // Same socket can re-subscribe without since and get a snapshot.
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await waitFor(a.msgs, (m) => m.type === "snapshot");
  });

  it("transient DB error while checking a resume cursor is a retryable 500, never resync_required", async () => {
    const { db, port, main } = await boot();
    const a = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    const real = db.jord.query.bind(db.jord);
    vi.spyOn(db.jord, "query").mockImplementation(async (sql: string, args?: Array<string | number | null>) => {
      if (String(sql).includes("MIN(seq)")) throw new Error("SQLITE_BUSY");
      return real(sql, args);
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes", since: 1 }));
    const err = await waitFor(a.msgs, (m) => m.type === "error");
    expect(err).toMatchObject({ status: 500, error: "subscribe_failed" });
    expect(JSON.stringify(a.msgs)).not.toContain("resync_required");
  });

  it("one subscription per connection; filter complexity + operator caps", async () => {
    const { port, main } = await boot();
    const a = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    a.ws.send(
      JSON.stringify({
        type: "subscribe",
        table: "public_notes",
        filter: { id: "eq.1", title: "eq.2", owner_id: "eq.3", created: "eq.4", x: "eq.5" },
      }),
    );
    expect(await waitFor(a.msgs, (m) => m.type === "error")).toMatchObject({ status: 400, error: "cap_exceeded" });
    a.msgs.length = 0;
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes", filter: { title: "like.%x%" } }));
    expect(await waitFor(a.msgs, (m) => m.type === "error")).toMatchObject({ status: 400, error: "bad_filter" });
    a.msgs.length = 0;
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await waitFor(a.msgs, (m) => m.type === "snapshot");
    a.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    expect(await waitFor(a.msgs, (m) => m.type === "error")).toMatchObject({
      status: 409,
      error: "already_subscribed",
    });
  });

  it("per-IP connection cap → 429; per-socket message flood closes 4429", async () => {
    const { port, main } = await boot({ env: { JORD_REALTIME_APP_MAX_PER_IP: "2" } });
    const h = { "x-jord-key": main.pub };
    const a = asClient(await connect(port, main.slug, h));
    asClient(await connect(port, main.slug, h));
    expect(await connect(port, main.slug, h)).toMatchObject({ status: 429 });
    for (let i = 0; i < 40; i++) a.ws.send(JSON.stringify({ type: "ping" }));
    expect(await a.closed).toEqual({ code: 4429, reason: "rate_limited" });
    await settle(50);
    asClient(await connect(port, main.slug, h)); // slot released on close
  });

  it("handshake attempts are rate limited per IP", async () => {
    const { app, main } = await boot({ env: { JORD_REALTIME_APP_CONNECT_RATE: "3" } });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await app.request(`/p/${main.slug}/realtime?table=nope`, {
        headers: { "x-jord-key": main.pub },
      });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([403, 403, 403, 429, 429]);
  });
});

/** Hold every `describeTable` (called inside subscribe planning) until released. */
function gatePlan(db: TestDb) {
  const orig = db.jord.describeTable.bind(db.jord);
  let open!: () => void;
  const gate = new Promise<void>((r) => {
    open = r;
  });
  let calls = 0;
  vi.spyOn(db.jord, "describeTable").mockImplementation(async (table: string) => {
    calls += 1;
    await gate;
    return orig(table);
  });
  return {
    release: () => open(),
    calls: () => calls,
    waitCalls: async (n: number) => {
      const until = Date.now() + 2000;
      while (calls < n) {
        if (Date.now() > until) throw new Error(`plan not reached (${calls}/${n})`);
        await new Promise((r) => setTimeout(r, 5));
      }
    },
  };
}

describe("review #1: subscription leak / cap bypass", () => {
  it("(a) close while plan is pending: nothing subscribes on the bus", async () => {
    const bus = new RealtimeBus();
    const { db, port, main } = await boot({ bus });
    const c = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    const baseline = bus.size;
    const g = gatePlan(db);
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await g.waitCalls(1);
    c.ws.close();
    await c.closed;
    await settle(50);
    g.release();
    await settle(150);
    expect(bus.size).toBe(baseline);
  });

  it("(b) subscribe → unsubscribe → subscribe while the first plan is pending: one subscriber, no leak", async () => {
    const bus = new RealtimeBus();
    const { db, port, main } = await boot({ bus });
    const c = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    const baseline = bus.size;
    const g = gatePlan(db);
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await g.waitCalls(1);
    // A second subscribe while one is pending is refused (pending counts).
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    expect(await waitFor(c.msgs, (m) => m.type === "error")).toMatchObject({
      status: 409,
      error: "already_subscribed",
    });
    c.ws.send(JSON.stringify({ type: "unsubscribe" }));
    await waitFor(c.msgs, (m) => m.type === "unsubscribed");
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    await g.waitCalls(2);
    g.release();
    await waitFor(c.msgs, (m) => m.type === "snapshot");
    await settle(150);
    expect(c.msgs.filter((m) => m.type === "snapshot")).toHaveLength(1);
    expect(bus.size).toBe(baseline + 1);
    c.ws.close();
    await c.closed;
    await settle(50);
    expect(bus.size).toBe(baseline);
  });

  it("30 rapid subscribe/close cycles leave no subscribers", async () => {
    const bus = new RealtimeBus();
    const { db, port, main } = await boot({ bus });
    const baseline = bus.size;
    const g = gatePlan(db);
    for (let i = 0; i < 30; i++) {
      const c = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
      c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
      c.ws.close();
      await c.closed;
    }
    await settle(50);
    g.release();
    await settle(200);
    expect(bus.size).toBe(baseline);
  });
});

describe("review #3: snapshot size cap + backpressure", () => {
  it("snapshot over maxSnapshotBytes is truncated (truncated:true), never oversized", async () => {
    const cap = 4096;
    const { port, main, insert } = await boot({
      env: { JORD_REALTIME_APP_MAX_SNAPSHOT_BYTES: String(cap) },
    });
    await insert("public_notes", "n3", "user-1", "x".repeat(cap * 2));
    await insert("public_notes", "n4", "user-1");
    const c = asClient(await connect(port, main.slug, { "x-jord-key": main.pub }));
    c.ws.send(JSON.stringify({ type: "subscribe", table: "public_notes" }));
    const snap = await waitFor(c.msgs, (m) => m.type === "snapshot");
    expect(snap.truncated).toBe(true);
    expect((snap.rows as Array<{ id: string }>).map((r) => r.id)).toEqual(["n1", "n2"]);
    expect(JSON.stringify(snap.rows).length).toBeLessThanOrEqual(cap);
  });

  it("a congested socket is closed 1013 instead of queueing", () => {
    const sent: string[] = [];
    const closed: Array<[number | undefined, string | undefined]> = [];
    const ws = {
      raw: { bufferedAmount: 0 },
      send: (d: string) => sent.push(d),
      close: (code?: number, reason?: string) => closed.push([code, reason]),
    };
    expect(sendWithBackpressure(ws, { type: "a" }, 1024)).toBe(true);
    ws.raw.bufferedAmount = 2048;
    expect(sendWithBackpressure(ws, { type: "b" }, 1024)).toBe(false);
    expect(sent).toEqual([JSON.stringify({ type: "a" })]);
    expect(closed).toEqual([[1013, "backpressure"]]);
  });
});

describe("review #5a: shared-database warning", () => {
  it("warns when more than one active project exists", async () => {
    const { db } = await boot(); // boot creates "shop" + "other"
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await warnIfMultiProject(db.jord)).toBe(true);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/share ONE database/);
  });
});

describe("rowMatchesFilters", () => {
  it("mirrors SQL null semantics and numeric compare", () => {
    const f = (op: string, values: Array<string | number | null>, extra = {}) =>
      [{ column: "n", op, values, ...extra }] as never;
    expect(rowMatchesFilters({ n: 5 }, f("gt", [3]))).toBe(true);
    expect(rowMatchesFilters({ n: "5" }, f("lte", [5]))).toBe(true);
    expect(rowMatchesFilters({ n: null }, f("neq", [1]))).toBe(false);
    expect(rowMatchesFilters({ n: null }, f("is", [], { isNull: true }))).toBe(true);
    expect(rowMatchesFilters({ n: "b" }, f("in", ["a", "b"]))).toBe(true);
    expect(rowMatchesFilters({ n: "b" }, f("eq", [null]))).toBe(false);
  });
});
