import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { liveDeliveryAllowed } from "./deliver.js";
import type { JordChangeEvent } from "./types.js";

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

afterEach(async () => {
  while (servers.length > 0) {
    const s = servers.pop()!;
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  while (open.length > 0) await open.pop()?.close();
});

const adminAuth = () => ({
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
});
const userAuth = () => ({
  authorization: `Bearer ${
    signAccessToken({
      secret: JWT,
      iss: "jord",
      aud: "jord",
      sub: "user-1",
      role: "user",
    }).token
  }`,
});

async function boot(policies: "none" | "owner") {
  const db = await openTestDb("file");
  open.push(db);
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
  });
  const headers = adminAuth();
  const created = await app.request("/schema/tables", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "lab_notes",
      columns: [
        { name: "title", type: "TEXT" },
        { name: "owner_id", type: "TEXT" },
      ],
    }),
  });
  expect(created.status).toBe(201);
  const rls = await app.request("/schema/tables/lab_notes/rls", {
    method: "PUT",
    headers,
    body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
  });
  expect(rls.status).toBe(200);
  if (policies === "owner") {
    const policy = await app.request("/policies", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "owner select",
        table_name: "lab_notes",
        operation: "select",
        effect: "allow",
        rules: JSON.stringify([{ kind: "owner_eq", config: { column: "owner_id" } }]),
      }),
    });
    expect(policy.status).toBe(201);
  }
  const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" });
  app.injectWebSocket(server);
  await new Promise<void>((resolve) => {
    if (server.address()) resolve();
    else server.once("listening", () => resolve());
  });
  servers.push(server as unknown as { close: (cb: () => void) => void });
  const port = (server.address() as AddressInfo).port;
  return { app, port };
}

/** Connects, runs `act` once open, waits `settleMs`, returns raw messages. */
async function collect(
  port: number,
  headers: Record<string, string>,
  act: () => Promise<void>,
  settleMs = 900,
): Promise<string[]> {
  const messages: string[] = [];
  const ws = new WebSocket(`ws://127.0.0.1:${port}/realtime/ws?table=lab_notes`, {
    headers,
  });
  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => resolve());
    ws.on("error", reject);
  });
  ws.on("message", (data) => {
    const text = String(data);
    if (text.includes("jord.change")) messages.push(text);
  });
  await act();
  await new Promise((r) => setTimeout(r, settleMs));
  ws.close();
  return messages;
}

async function insertNote(
  app: Awaited<ReturnType<typeof boot>>["app"],
  id: string,
  owner: string,
) {
  const res = await app.request("/schema/tables/lab_notes/rows", {
    method: "POST",
    headers: adminAuth(),
    body: JSON.stringify({ values: { id, title: id, owner_id: owner } }),
  });
  expect(res.status).toBe(201);
}

describe("WebSocket realtime applies the same per-event policy as SSE (SF-1)", () => {
  it("delivers nothing to a subscriber with no select policy", async () => {
    const { app, port } = await boot("none");
    // Control: an admin operator on the same table does see the change.
    const adminMsgs = await collect(port, adminAuth(), () => insertNote(app, "a", "user-1"));
    expect(adminMsgs.some((m) => m.includes('"id":"a"'))).toBe(true);

    const userMsgs = await collect(port, userAuth(), () => insertNote(app, "b", "user-1"));
    expect(userMsgs).toEqual([]);
  });

  it("still delivers rows the caller may select, and hides the rest", async () => {
    const { app, port } = await boot("owner");
    const msgs = await collect(port, userAuth(), async () => {
      await insertNote(app, "9", "user-2");
      await insertNote(app, "8", "user-1");
    });
    expect(msgs.some((m) => m.includes('"id":"8"'))).toBe(true);
    expect(msgs.some((m) => m.includes('"id":"9"'))).toBe(false);
  });
});

describe("liveDeliveryAllowed fails closed", () => {
  const event = { type: "jord.change", table: "t", op: "insert", id: "1", seq: 7 } as JordChangeEvent;
  const row = { op: "insert", oldJson: null, newJson: "{}" };

  it("does not deliver when the outbox row is missing", async () => {
    const allowed = vi.fn(async () => true);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const ok = await liveDeliveryAllowed({ event, getBySeq: async () => null, allowed });
    expect(ok).toBe(false);
    expect(allowed).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  it("does not deliver an event without a seq", async () => {
    const ok = await liveDeliveryAllowed({
      event: { ...event, seq: undefined },
      getBySeq: async () => row,
      allowed: async () => true,
    });
    expect(ok).toBe(false);
  });

  it("does not deliver when the lookup throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = await liveDeliveryAllowed({
      event,
      getBySeq: async () => {
        throw new Error("db down");
      },
      allowed: async () => true,
    });
    expect(ok).toBe(false);
    err.mockRestore();
  });

  it("defers to the policy decision when the row exists", async () => {
    expect(
      await liveDeliveryAllowed({ event, getBySeq: async () => row, allowed: async () => true }),
    ).toBe(true);
    expect(
      await liveDeliveryAllowed({ event, getBySeq: async () => row, allowed: async () => false }),
    ).toBe(false);
  });
});
