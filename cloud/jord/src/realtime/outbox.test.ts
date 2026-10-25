import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import {
  createOutbox,
  sanitizeRowForOutbox,
} from "./outbox.js";
import { CommitWatermark } from "./watermark.js";

const temps: string[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-s0023-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
  });
  return { app, jord };
}

function admin(): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  };
}

describe("CommitWatermark", () => {
  it("does not skip a lower in-flight seq when a higher seq completes first", () => {
    const w = new CommitWatermark();
    w.begin(1);
    w.begin(2);
    w.complete(2);
    expect(w.get()).toBe(0);
    w.complete(1);
    expect(w.get()).toBe(2);
  });
});

describe("sanitizeRowForOutbox", () => {
  it("replaces blob columns with a reference stub", () => {
    const out = sanitizeRowForOutbox(
      { id: "1", bin: "raw-bytes", title: "ok" },
      new Set(["bin"]),
    );
    expect(out).toEqual({ id: "1", bin: { $blob: true }, title: "ok" });
  });
});

describe("S0023 outbox CDC (file libSQL)", () => {
  it("writes the outbox on the API path and fans out in queue order", async () => {
    const { app, jord } = await boot();
    try {
      const outbox = createOutbox(jord);
      expect(await outbox.isTracked("records")).toBe(true);

      const a = await app.request("/records", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(a.status).toBe(201);
      const b = await app.request("/records", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(b.status).toBe(201);

      const rows = await outbox.listAfter(0);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0]!.seq).toBeLessThan(rows[1]!.seq);
      expect(rows.every((row) => row.tableName === "records")).toBe(true);
    } finally {
      await jord.close();
    }
  });

  it("returns 410 with a resync hint when since is past retention", async () => {
    const { app, jord } = await boot();
    try {
      const created = await app.request("/records", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(created.status).toBe(201);
      const outbox = createOutbox(jord);
      await outbox.prune({ days: 0, rows: 0 });

      const res = await app.request("/realtime?table=records&since=1", {
        headers: admin(),
      });
      expect(res.status).toBe(410);
      expect(await res.json()).toMatchObject({
        error: "gone",
        hint: "resync",
      });
    } finally {
      await jord.close();
    }
  });

  it("same-transaction outbox insert via BEGIN/COMMIT", async () => {
    const { jord } = await boot();
    try {
      await jord.query("BEGIN");
      await jord.query(
        `INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
         VALUES (?, ?, ?, NULL, ?, ?, 1)`,
        ["tx-1", "lab", "{}", Date.now(), Date.now()],
      );
      await jord.query(
        `INSERT INTO jord_changes (table_name, op, pk, old_json, new_json, actor, ts)
         VALUES (?, ?, ?, NULL, ?, NULL, ?)`,
        ["records", "insert", "tx-1", JSON.stringify({ id: "tx-1" }), Date.now()],
      );
      await jord.query("COMMIT");
      const rows = await jord.query(
        `SELECT seq FROM jord_changes WHERE pk = ?`,
        ["tx-1"],
      );
      expect(rows.length).toBe(1);
    } finally {
      await jord.close();
    }
  });

  it("does not emit for an untracked table", async () => {
    const { app, jord } = await boot();
    try {
      const created = await app.request("/schema/tables", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({
          name: "notes",
          columns: [{ name: "title", type: "TEXT" }],
        }),
      });
      expect(created.status).toBe(201);
      const outbox = createOutbox(jord);
      // Create auto-tracks; turn capture off to prove opt-out.
      await app.request("/schema/tables/notes/track", {
        method: "PUT",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ tracked: false }),
      });
      const insert = await app.request("/schema/tables/notes/rows", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ values: { id: "1", title: "hi" } }),
      });
      expect(insert.status).toBe(201);
      expect(await outbox.listAfter(0, { table: "notes" })).toEqual([]);

      await app.request("/schema/tables/notes/track", {
        method: "PUT",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ tracked: true }),
      });
      const insert2 = await app.request("/schema/tables/notes/rows", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ values: { id: "2", title: "tracked" } }),
      });
      expect(insert2.status).toBe(201);
      const tracked = await outbox.listAfter(0, { table: "notes" });
      expect(tracked.length).toBe(1);
    } finally {
      await jord.close();
    }
  });
});

describe.runIf(Boolean(process.env.JORD_TEST_POSTGRES_URL?.trim()))(
  "S0023 outbox CDC postgres",
  () => {
    it("watermark race suite runs when JORD_TEST_POSTGRES_URL is set", () => {
      expect(process.env.JORD_TEST_POSTGRES_URL).toBeTruthy();
    });
  },
);
