import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../testing/harness.js";

const open: TestDb[] = [];
const dirs: string[] = [];
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
  while (dirs.length > 0) {
    await rm(dirs.pop()!, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
  });
  // `records` is tracked by migration 0004; add a second tracked table.
  await db.jord.query(
    `INSERT INTO jord_tracked_tables (table_name, tracked_at) VALUES (${db.ph(1)}, ${db.ph(2)})`,
    ["lab_notes", 1],
  );
  return { app, db };
}

const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
};

const INSERT_RECORD =
  "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('z','lab','{}',1,1,1)";

type ResyncRow = {
  seq: number;
  table_name: string;
  pk: string;
  old_json: string | null;
  new_json: string | null;
  actor: string | null;
};

async function resyncRows(db: TestDb): Promise<ResyncRow[]> {
  const rows = await db.jord.query(
    `SELECT seq, table_name, pk, old_json, new_json, actor FROM jord_changes
     WHERE op = 'resync' ORDER BY seq ASC`,
  );
  return rows.map((row) => ({
    seq: Number(row.seq),
    table_name: String(row.table_name),
    pk: String(row.pk),
    old_json: row.old_json == null ? null : String(row.old_json),
    new_json: row.new_json == null ? null : String(row.new_json),
    actor: row.actor == null ? null : String(row.actor),
  }));
}

function execute(app: ReturnType<typeof createJordApp>, sql: string, readOnly: boolean) {
  return app.request("/sql/execute", {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ sql, readOnly }),
  });
}

async function readSseUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  pattern: string,
  ms: number,
): Promise<string> {
  const decoder = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + ms;
  while (Date.now() < deadline && !buf.includes(pattern)) {
    const remaining = Math.max(1, deadline - Date.now());
    const chunk = await Promise.race([
      reader.read(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining)),
    ]);
    if (chunk === null || chunk.done) break;
    buf += decoder.decode(chunk.value, { stream: true });
  }
  return buf;
}

function sseEvents(buf: string): Array<Record<string, unknown>> {
  return buf
    .split("\n\n")
    .filter((block) => block.includes("event: jord.change"))
    .map((block) => {
      const data = block
        .split("\n")
        .find((line) => line.startsWith("data:"))!
        .slice(5)
        .trim();
      return JSON.parse(data) as Record<string, unknown>;
    });
}

async function waitFor<T>(fn: () => Promise<T | null>, ms: number): Promise<T | null> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const value = await fn();
    if (value != null) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

describe.each(TEST_BACKENDS)("B4 table-level resync (%s)", (backend) => {
  it("a console write emits one op:resync per tracked table, live on SSE", async () => {
    const { app, db } = await boot(backend);
    const stream = await app.request("/realtime?table=lab_notes", {
      headers: { Accept: "text/event-stream", authorization: admin.authorization },
    });
    expect(stream.status).toBe(200);
    const reader = stream.body!.getReader();

    const write = await execute(app, INSERT_RECORD, false);
    expect(write.status).toBe(200);

    const buf = await readSseUntil(reader, '"op":"resync"', 3000);
    await reader.cancel();
    const live = sseEvents(buf);
    expect(live).toHaveLength(1);
    expect(live[0]).toMatchObject({
      type: "jord.change",
      table: "lab_notes",
      op: "resync",
      id: "",
      dialect: db.jord.dialect,
    });
    expect(typeof live[0]!.seq).toBe("number");

    const rows = await resyncRows(db);
    expect(rows.map((row) => row.table_name)).toEqual(["lab_notes", "records"]);
    for (const row of rows) {
      expect(row.seq).toBeGreaterThan(0);
      expect(row.pk).toBe("");
      expect(row.old_json).toBeNull();
      expect(row.new_json).toBeNull();
      expect(JSON.parse(row.actor!)).toMatchObject({ kind: "operator", role: "admin" });
    }
  });

  it("a read-only query emits nothing", async () => {
    const { app, db } = await boot(backend);
    const read = await execute(app, "SELECT id FROM records", true);
    expect(read.status).toBe(200);
    expect(await resyncRows(db)).toEqual([]);
  });

  it("a failed write emits nothing", async () => {
    const { app, db } = await boot(backend);
    const failed = await execute(app, "INSERT INTO no_such_table (x) VALUES (1)", false);
    expect(failed.status).toBe(400);
    expect(await resyncRows(db)).toEqual([]);
  });

  it("a console write with no tracked tables emits nothing", async () => {
    const { app, db } = await boot(backend);
    await db.jord.query("DELETE FROM jord_tracked_tables");
    const write = await execute(app, INSERT_RECORD, false);
    expect(write.status).toBe(200);
    expect(await resyncRows(db)).toEqual([]);
  });

  it("since= resume replays the resync row, also past an id filter", async () => {
    const { app, db } = await boot(backend);
    const write = await execute(app, INSERT_RECORD, false);
    expect(write.status).toBe(200);
    const [records] = (await resyncRows(db)).filter((row) => row.table_name === "records");
    expect(records).toBeDefined();

    const stream = await app.request("/realtime?table=records&since=0&id=other", {
      headers: { Accept: "text/event-stream", authorization: admin.authorization },
    });
    expect(stream.status).toBe(200);
    const reader = stream.body!.getReader();
    const buf = await readSseUntil(reader, '"op":"resync"', 3000);
    await reader.cancel();
    const replayed = sseEvents(buf).filter((event) => event.op === "resync");
    expect(replayed).toHaveLength(1);
    expect(replayed[0]).toMatchObject({ table: "records", id: "", seq: records!.seq });
  });

  it.runIf(backend === "file")("a migrate-wizard apply emits nothing (source is only read)", async () => {
    const { app, db } = await boot(backend);
    const dir = await mkdtemp(path.join(tmpdir(), "jord-b4-target-"));
    dirs.push(dir);
    const started = await app.request("/migrate/jobs", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ targetUrl: fsPathToFileUrl(path.join(dir, "target.db")) }),
    });
    expect(started.status).toBe(201);
    const { job } = (await started.json()) as { job: { id: string } };

    const finished = await waitFor(async () => {
      const res = await app.request(`/migrate/jobs/${job.id}`, { headers: admin });
      const body = (await res.json()) as { job: { status: string; errorText: string | null } };
      return body.job.status === "done" || body.job.status === "error" ? body.job : null;
    }, 10_000);
    expect(finished).toMatchObject({ status: "done", errorText: null });

    expect(await resyncRows(db)).toEqual([]);
  });
});
