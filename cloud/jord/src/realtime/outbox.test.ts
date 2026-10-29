import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../testing/harness.js";
import { createOutbox, sanitizeRowForOutbox } from "./outbox.js";
import { RealtimeBus, type JordChangeEvent } from "./index.js";
import { CommitWatermark } from "./watermark.js";

const open: TestDb[] = [];
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
  while (open.length > 0) await open.pop()?.close();
});

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  const realtime = new RealtimeBus();
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    realtime,
  });
  return { app, jord: db.jord, db, realtime };
}

function admin(): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  };
}

const json = { "content-type": "application/json" };

function deferred() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release };
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

  it("an abandoned (rolled back) seq stops holding the watermark", () => {
    const w = new CommitWatermark();
    w.begin(1);
    w.begin(2);
    w.complete(2);
    w.abandon(1);
    expect(w.hasInFlight()).toBe(false);
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

describe("S0031 single outbox writer", () => {
  it("no source file outside realtime/outbox.ts inserts into jord_changes", async () => {
    const roots = [
      fileURLToPath(new URL("..", import.meta.url)),
      fileURLToPath(new URL("../../../../elements/jord/src", import.meta.url)),
    ];
    const hits: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== "dist") await walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
        if (/INSERT\s+INTO\s+jord_changes/i.test(await readFile(full, "utf8"))) {
          hits.push(path.relative(roots[0]!, full).replaceAll("\\", "/"));
        }
      }
    };
    for (const root of roots) await walk(root);
    expect(hits).toEqual(["realtime/outbox.ts"]);
  });
});

describe.each(TEST_BACKENDS)("S0023 / S0031 outbox CDC (%s)", (backend) => {
  it("writes the outbox on the API path and fans out in queue order", async () => {
    const { app, jord } = await boot(backend);
    const outbox = createOutbox(jord);
    expect(await outbox.isTracked("records")).toBe(true);

    for (let i = 0; i < 2; i += 1) {
      const res = await app.request("/records", {
        method: "POST",
        headers: { ...admin(), ...json },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(res.status).toBe(201);
    }

    const rows = await outbox.listAfter(0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]!.seq).toBeLessThan(rows[1]!.seq);
    expect(rows.every((row) => row.tableName === "records")).toBe(true);
  });

  it("returns 410 with a resync hint when since is past retention", async () => {
    const { app, jord } = await boot(backend);
    const created = await app.request("/records", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ bucket: "lab", body: "{}" }),
    });
    expect(created.status).toBe(201);
    await createOutbox(jord).prune({ days: 0, rows: 0 });

    const res = await app.request("/realtime?table=records&since=1", {
      headers: admin(),
    });
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ error: "gone", hint: "resync" });
  });

  it("jord.transaction commits the data row and the outbox row together, or neither", async () => {
    const { jord, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE tx_notes (id TEXT PRIMARY KEY, title TEXT)");
    const outbox = createOutbox(jord);
    await outbox.setTracked("tx_notes", true);
    const ph = db.ph;

    const write = (id: string, fail: boolean) =>
      jord.transaction(async () => {
        await jord.query(`INSERT INTO tx_notes (id, title) VALUES (${ph(1)}, ${ph(2)})`, [id, id]);
        const change = await outbox.appendChange({ tableName: "tx_notes", op: "insert", pk: id, newRow: { id } });
        if (fail) throw new Error("crash after outbox insert");
        return change;
      });

    const ok = await write("ok", false);
    await outbox.settle(ok!.seq, true);
    await expect(write("boom", true)).rejects.toThrow("crash after outbox insert");

    expect(await jord.query("SELECT id FROM tx_notes ORDER BY id")).toEqual([{ id: "ok" }]);
    expect((await outbox.listAfter(0, { table: "tx_notes" })).map((row) => row.pk)).toEqual(["ok"]);
  });

  it("a failing outbox insert rolls back the API write and publishes nothing", async () => {
    const { app, db, realtime } = await boot(backend);
    const created = await app.request("/schema/tables", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ name: "notes", columns: [{ name: "title", type: "TEXT" }] }),
    });
    expect(created.status).toBe(201);
    await db.ownerSql(
      backend === "postgres"
        ? `CREATE FUNCTION jord_t_boom() RETURNS trigger LANGUAGE plpgsql AS $$
           BEGIN
             IF NEW.pk = 'boom' THEN RAISE EXCEPTION 'outbox down'; END IF;
             RETURN NEW;
           END $$`
        : `CREATE TRIGGER jord_t_boom BEFORE INSERT ON jord_changes
           WHEN NEW.pk = 'boom'
           BEGIN SELECT RAISE(ABORT, 'outbox down'); END`,
    );
    if (backend === "postgres") {
      await db.ownerSql(
        "CREATE TRIGGER jord_t_boom BEFORE INSERT ON jord_changes FOR EACH ROW EXECUTE FUNCTION jord_t_boom()",
      );
    }
    const events: JordChangeEvent[] = [];
    const unsubscribe = realtime.trySubscribe((event) => events.push(event))!;

    const studio = await app.request("/schema/tables/notes/rows", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ values: { id: "boom", title: "lost" } }),
    });
    expect(studio.status).toBeGreaterThanOrEqual(500);
    const api = await app.request("/api/v1/notes", {
      method: "POST",
      headers: { authorization: `Bearer ${AUTH.secret}`, ...json },
      body: JSON.stringify({ id: "boom", title: "lost" }),
    });
    expect(api.status).toBeGreaterThanOrEqual(500);

    const fine = await app.request("/schema/tables/notes/rows", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ values: { id: "fine", title: "kept" } }),
    });
    expect(fine.status).toBe(201);
    unsubscribe();

    expect(await db.ddl.query("SELECT id FROM notes ORDER BY id")).toEqual([{ id: "fine" }]);
    expect(
      (await db.ddl.query("SELECT pk FROM jord_changes WHERE table_name = 'notes' ORDER BY seq")).map(
        (row) => row.pk,
      ),
    ).toEqual(["fine"]);
    expect(events.filter((event) => event.table === "notes").map((event) => event.id)).toEqual(["fine"]);
  });

  it("does not emit for an untracked table", async () => {
    const { app, jord } = await boot(backend);
    const created = await app.request("/schema/tables", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ name: "notes", columns: [{ name: "title", type: "TEXT" }] }),
    });
    expect(created.status).toBe(201);
    const outbox = createOutbox(jord);
    // Create auto-tracks; turn capture off to prove opt-out.
    await app.request("/schema/tables/notes/track", {
      method: "PUT",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ tracked: false }),
    });
    const insert = await app.request("/schema/tables/notes/rows", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ values: { id: "1", title: "hi" } }),
    });
    expect(insert.status).toBe(201);
    expect(await outbox.listAfter(0, { table: "notes" })).toEqual([]);

    await app.request("/schema/tables/notes/track", {
      method: "PUT",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ tracked: true }),
    });
    const insert2 = await app.request("/schema/tables/notes/rows", {
      method: "POST",
      headers: { ...admin(), ...json },
      body: JSON.stringify({ values: { id: "2", title: "tracked" } }),
    });
    expect(insert2.status).toBe(201);
    expect((await outbox.listAfter(0, { table: "notes" })).length).toBe(1);
  });

  it.runIf(backend === "postgres")(
    "a higher seq committing first is not readable past a lower in-flight seq",
    async () => {
      const { jord } = await boot(backend);
      const outbox = createOutbox(jord);
      const lowAppended = deferred();
      const lowMayCommit = deferred();

      let lowSeq = 0;
      const low = jord.transaction(async () => {
        const row = await outbox.appendChange({ tableName: "records", op: "insert", pk: "low", newRow: { id: "low" } });
        lowSeq = row!.seq;
        lowAppended.release();
        await lowMayCommit.gate;
        return row!;
      });
      await lowAppended.gate;

      const high = await jord.transaction(async () => {
        const row = await outbox.appendChange({ tableName: "records", op: "insert", pk: "high", newRow: { id: "high" } });
        return row!;
      });
      await outbox.settle(high.seq, true);
      expect(high.seq).toBeGreaterThan(lowSeq);

      const committedMax = await jord.query("SELECT MAX(seq) AS n FROM jord_changes");
      expect(Number(committedMax[0]!.n)).toBe(high.seq);
      expect(await outbox.readableWatermark()).toBe(lowSeq - 1);
      expect((await outbox.listAfter(0)).map((row) => row.pk)).not.toContain("high");

      lowMayCommit.release();
      await outbox.settle((await low).seq, true);
      expect(await outbox.readableWatermark()).toBe(high.seq);
      expect((await outbox.listAfter(0)).map((row) => row.pk)).toEqual(["low", "high"]);
    },
  );
});
