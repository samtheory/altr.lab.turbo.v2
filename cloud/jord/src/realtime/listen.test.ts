import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, PG_URL, type TestDb } from "../testing/harness.js";
import { RealtimeBus, type JordChangeEvent } from "./index.js";
import {
  createOutboxListenBridge,
  parseNotifyPayload,
} from "./listen.js";
import { createOutbox } from "./outbox.js";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const open: TestDb[] = [];
const bridges: Array<{ stop: () => Promise<void> }> = [];

afterEach(async () => {
  while (bridges.length > 0) await bridges.pop()?.stop();
  while (open.length > 0) await open.pop()?.close();
});

async function ownerListenUrl(db: TestDb): Promise<string> {
  const rows = await db.ddl.query("SELECT current_database() AS n");
  const database = String(rows[0]!.n);
  const url = new URL(PG_URL);
  url.pathname = `/${database}`;
  return url.toString();
}

describe("parseNotifyPayload", () => {
  it("accepts legacy plain seq and JSON { table, seq, txid }", () => {
    expect(parseNotifyPayload("42")).toEqual({ seq: 42 });
    expect(parseNotifyPayload('{"table":"notes","seq":7,"txid":99}')).toEqual({
      table: "notes",
      seq: 7,
      txid: 99,
    });
    expect(parseNotifyPayload("")).toBeNull();
    expect(parseNotifyPayload("nope")).toBeNull();
    expect(parseNotifyPayload('{"seq":0}')).toBeNull();
  });
});

describe.runIf(Boolean(PG_URL))("S0037 LISTEN fan-out on Postgres", () => {
  it("write on instance A arrives on an SSE stream held by instance B", async () => {
    const db = await openTestDb("postgres");
    open.push(db);

    const busA = new RealtimeBus();
    const busB = new RealtimeBus();
    const appA = createJordApp({
      jord: db.jord,
      ddl: db.ddl,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      realtime: busA,
    });

    const bridge = createOutboxListenBridge({
      connectionString: await ownerListenUrl(db),
      outbox: createOutbox(db.jord),
      bus: busB,
    });
    bridges.push(bridge);
    await bridge.start();
    await new Promise((r) => setTimeout(r, 50));

    const seen: JordChangeEvent[] = [];
    const got = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("fan-out on B timed out")), 8_000);
      busB.trySubscribeFiltered({ table: "records" }, (event) => {
        seen.push(event);
        if (event.op === "insert" && event.id.startsWith("cross-")) {
          clearTimeout(t);
          resolve();
        }
      });
    });

    const token = signSessionToken("admin", AUTH.secret);
    const id = `cross-${Date.now()}`;
    const res = await appA.request("/records", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id, bucket: "lab", body: { n: 1 } }),
    });
    expect(res.status).toBe(201);

    await got;
    expect(seen.some((e) => e.id === id && e.table === "records")).toBe(true);
    await appA.stopRealtimeListen();
  });

  it("LISTEN reconnects after a forced drop and still delivers later seqs", async () => {
    const db = await openTestDb("postgres");
    open.push(db);

    const bus = new RealtimeBus();
    const outbox = createOutbox(db.jord);
    const bridge = createOutboxListenBridge({
      connectionString: await ownerListenUrl(db),
      outbox,
      bus,
      initialBackoffMs: 50,
      maxBackoffMs: 200,
    });
    bridges.push(bridge);
    await bridge.start();
    await new Promise((r) => setTimeout(r, 50));

    await db.ddl.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = current_database()
         AND pid <> pg_backend_pid()
         AND application_name = 'jord-realtime-listen'`,
    );

    await new Promise((r) => setTimeout(r, 400));

    const seen: string[] = [];
    const got = new Promise<void>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("post-reconnect delivery timed out")),
        8_000,
      );
      bus.trySubscribe((event) => {
        seen.push(event.id);
        if (event.id === "after-drop") {
          clearTimeout(t);
          resolve();
        }
      });
    });

    const app = createJordApp({
      jord: db.jord,
      ddl: db.ddl,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      realtime: new RealtimeBus(),
    });
    const token = signSessionToken("admin", AUTH.secret);
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "after-drop",
        bucket: "lab",
        body: { n: 2 },
      }),
    });
    expect(res.status).toBe(201);
    await got;
    expect(seen).toContain("after-drop");
    await app.stopRealtimeListen();
  });
});
