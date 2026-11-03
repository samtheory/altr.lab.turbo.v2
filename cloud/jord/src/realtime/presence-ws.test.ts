import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { ConsoleMailer } from "../auth/mailer.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { PresenceHub, type PresenceLimits } from "./channels.js";

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
  for (const ws of sockets.splice(0)) ws.terminate();
  while (servers.length > 0) {
    const s = servers.pop()!;
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  while (open.length > 0) await open.pop()?.close();
});

const json = { "content-type": "application/json" };
const adminAuth = () => ({
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  ...json,
});
const userToken = (sub: string, extra: { ttlSec?: number; sid?: string } = {}) =>
  signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub, role: "user", ...extra }).token;
const userAuth = (sub: string, extra: { ttlSec?: number; sid?: string } = {}) => ({
  authorization: `Bearer ${userToken(sub, extra)}`,
});

async function boot(opts: {
  policy: "none" | "owner" | "open";
  limits?: Partial<PresenceLimits>;
  recheckMs?: number;
}) {
  const db = await openTestDb("file");
  open.push(db);
  const hub = new PresenceHub({ limits: opts.limits });
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
    presence: hub,
    realtimeRecheckMs: opts.recheckMs,
  });
  const headers = adminAuth();
  expect(
    (
      await app.request("/schema/tables", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "lab_notes",
          columns: [
            { name: "title", type: "TEXT" },
            { name: "owner_id", type: "TEXT" },
          ],
        }),
      })
    ).status,
  ).toBe(201);
  expect(
    (
      await app.request("/schema/tables/lab_notes/rls", {
        method: "PUT",
        headers,
        body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
      })
    ).status,
  ).toBe(200);
  let policyId: string | null = null;
  if (opts.policy !== "none") {
    const res = await app.request("/policies", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "select",
        table_name: "lab_notes",
        operation: "select",
        effect: "allow",
        rules:
          opts.policy === "owner"
            ? JSON.stringify([{ kind: "owner_eq", config: { column: "owner_id" } }])
            : JSON.stringify([{ kind: "always" }]),
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id?: string; policy?: { id: string } };
    policyId = body.id ?? body.policy?.id ?? null;
  }
  for (const [id, owner] of [
    ["n1", "user-1"],
    ["n2", "user-2"],
  ] as const) {
    const res = await app.request("/schema/tables/lab_notes/rows", {
      method: "POST",
      headers,
      body: JSON.stringify({ values: { id, title: id, owner_id: owner } }),
    });
    expect(res.status).toBe(201);
  }
  const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" });
  app.injectWebSocket(server);
  await new Promise<void>((resolve) => {
    if (server.address()) resolve();
    else server.once("listening", () => resolve());
  });
  servers.push(server as unknown as { close: (cb: () => void) => void });
  const port = (server.address() as AddressInfo).port;
  return { app, port, hub, db, policyId };
}

type Client = {
  ws: WebSocket;
  msgs: Array<Record<string, unknown>>;
  closed: Promise<{ code: number; reason: string }>;
  key: string;
};

/** Opens a channel socket; resolves with the HTTP status when refused. */
async function join(
  port: number,
  channel: string,
  headers: Record<string, string>,
  path = "/realtime/channel",
): Promise<Client | { status: number }> {
  const qs = path === "/realtime/channel" ? `channel=${encodeURIComponent(channel)}` : `table=${channel}`;
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}?${qs}`, { headers });
  sockets.push(ws);
  const msgs: Array<Record<string, unknown>> = [];
  ws.on("message", (data) => msgs.push(JSON.parse(String(data)) as Record<string, unknown>));
  const closed = new Promise<{ code: number; reason: string }>((resolve) =>
    ws.on("close", (code, reason) => resolve({ code, reason: String(reason) })),
  );
  return new Promise((resolve, reject) => {
    ws.on("unexpected-response", (_req, res) => resolve({ status: res.statusCode ?? 0 }));
    ws.on("error", (err) => {
      if (!String(err.message).includes("Unexpected server response")) reject(err);
    });
    ws.on("open", async () => {
      if (path !== "/realtime/channel") return resolve({ ws, msgs, closed, key: "" });
      for (let i = 0; i < 50 && !msgs.some((m) => m.type === "joined"); i++) {
        await new Promise((r) => setTimeout(r, 10));
      }
      const joined = msgs.find((m) => m.type === "joined");
      resolve({ ws, msgs, closed, key: String(joined?.key ?? "") });
    });
  });
}

const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));
function asClient(c: Client | { status: number }): Client {
  if ("status" in c) throw new Error(`refused ${c.status}`);
  return c;
}

describe("presence channel join is policy-gated (S0083)", () => {
  it("denied join returns 403 and creates no membership", async () => {
    const { port, hub } = await boot({ policy: "none" });
    const res = await join(port, "lab_notes:n1", userAuth("user-1"));
    expect(res).toEqual({ status: 403 });
    expect(hub.size).toBe(0);
    expect(hub.channelCount).toBe(0);
  });

  it("row channel: owner may join own row, not another's; table-wide channel refused when row-scoped", async () => {
    const { port, hub } = await boot({ policy: "owner" });
    const mine = asClient(await join(port, "lab_notes:n1", userAuth("user-1")));
    expect(mine.key).not.toBe("");
    expect(await join(port, "lab_notes:n2", userAuth("user-1"))).toEqual({ status: 403 });
    expect(await join(port, "lab_notes:missing", userAuth("user-1"))).toEqual({ status: 403 });
    expect(await join(port, "lab_notes", userAuth("user-1"))).toEqual({ status: 403 });
    expect(await join(port, "jord_users", userAuth("user-1"))).toEqual({ status: 400 });
    expect(hub.size).toBe(1);
  });

  it("broadcast reaches the other member only; presence join/leave flows; disconnect cleans up", async () => {
    const { port, hub } = await boot({ policy: "owner" });
    const a = asClient(await join(port, "lab_notes:n1", userAuth("user-1")));
    const b = asClient(await join(port, "lab_notes:n1", adminAuth()));
    const c = asClient(await join(port, "lab_notes:n2", adminAuth()));
    a.ws.send(JSON.stringify({ type: "join", state: { name: "ada" } }));
    a.ws.send(JSON.stringify({ type: "broadcast", event: "cursor", payload: { x: 3 } }));
    await settle();
    expect(b.msgs.filter((m) => m.type === "broadcast")).toEqual([
      { type: "broadcast", channel: "lab_notes:n1", event: "cursor", payload: { x: 3 }, from: a.key },
    ]);
    expect(a.msgs.filter((m) => m.type === "broadcast")).toEqual([]);
    expect(c.msgs.filter((m) => m.type === "broadcast" || (m.type === "presence" && m.event !== "sync"))).toEqual([]);
    expect(b.msgs.some((m) => m.type === "presence" && m.event === "join" && m.key === a.key)).toBe(true);

    a.ws.close();
    await a.closed;
    await settle();
    expect(b.msgs.at(-1)).toMatchObject({ type: "presence", event: "leave", key: a.key });
    expect(hub.members("lab_notes:n1")).toEqual([]);
    expect(hub.size).toBe(2);
  });

  it("stale presence is evicted after the heartbeat timeout", async () => {
    const { port, hub } = await boot({
      policy: "open",
      limits: { heartbeatTimeoutMs: 250, sweepMs: 50 },
    });
    const a = asClient(await join(port, "lab_notes", userAuth("user-1")));
    const b = asClient(await join(port, "lab_notes", userAuth("user-2")));
    a.ws.send(JSON.stringify({ type: "join", state: {} }));
    const keepAlive = setInterval(() => b.ws.send(JSON.stringify({ type: "heartbeat" })), 60);
    try {
      const closed = await a.closed;
      expect(closed).toEqual({ code: 4408, reason: "heartbeat_timeout" });
      await settle(50);
      expect(b.msgs.some((m) => m.type === "presence" && m.event === "leave" && m.key === a.key)).toBe(true);
      expect(hub.members("lab_notes")).toEqual([]);
      expect(hub.size).toBe(1);
    } finally {
      clearInterval(keepAlive);
    }
  });

  it("drops the member when its select policy is removed (re-check)", async () => {
    const { port, hub, policyId } = await boot({ policy: "open", recheckMs: 80 });
    expect(policyId).toBeTruthy();
    const a = asClient(await join(port, "lab_notes", userAuth("user-1")));
    const del = await fetch(`http://127.0.0.1:${port}/policies/${policyId}`, {
      method: "DELETE",
      headers: adminAuth(),
    });
    expect(del.status).toBe(200);
    expect(await a.closed).toEqual({ code: 4403, reason: "access_revoked" });
    expect(hub.size).toBe(0);
  });

  it("closes with 4401 when the access token expires", async () => {
    const { port, hub } = await boot({ policy: "open" });
    // exp has 1s resolution; iat is floored, so a 1s ttl expires within ~1s.
    const a = asClient(await join(port, "lab_notes", userAuth("user-1", { ttlSec: 1 })));
    expect(await a.closed).toEqual({ code: 4401, reason: "token_expired" });
    expect(hub.size).toBe(0);
  });
});

describe("revoked sessions drop open realtime streams (S0076 follow-up)", () => {
  async function liveSessionUser(db: TestDb, app: Awaited<ReturnType<typeof boot>>["app"]) {
    const email = "ada@lab.test";
    await app.request("/auth/signup", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ email, password: "correct-horse-battery" }),
    });
    await db.jord.query("UPDATE jord_users SET email_confirmed = 1 WHERE email = ?", [email]);
    const res = await app.request("/auth/signin", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ email, password: "correct-horse-battery" }),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as { access_token: string; session_id: string };
  }

  it("presence socket and change-feed socket both close with session_revoked", async () => {
    const { app, port, db, hub } = await boot({ policy: "open", recheckMs: 80 });
    const t = await liveSessionUser(db, app);
    const headers = { authorization: `Bearer ${t.access_token}` };
    const channel = asClient(await join(port, "lab_notes", headers));
    const feed = asClient(await join(port, "lab_notes", headers, "/realtime/ws"));
    await db.jord.query("UPDATE jord_sessions SET revoked_at = ? WHERE id = ?", [
      Date.now(),
      t.session_id,
    ]);
    expect(await channel.closed).toEqual({ code: 4401, reason: "session_revoked" });
    expect(await feed.closed).toEqual({ code: 4401, reason: "session_revoked" });
    expect(hub.size).toBe(0);
    // New connections are refused by the auth middleware.
    expect(await join(port, "lab_notes", headers)).toEqual({ status: 401 });
  });
});
