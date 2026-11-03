import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../../app.js";
import type { JordAuthConfig } from "../../auth/config.js";
import { createWriteQueue } from "../../queue.js";
import { RealtimeBus } from "../../realtime/index.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../../testing/harness.js";

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
const H = { authorization: `Bearer ${AUTH.secret}` };

afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

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

type Page = { data: Array<Record<string, unknown>>; next_cursor: string | null; has_more: boolean };

describe.each(TEST_BACKENDS)("S0079 keyset pagination (%s)", (backend) => {
  it("walks pages with inserts and deletes between pages: no dupes, no gaps", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE items (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)");
    for (let i = 1; i <= 10; i++) {
      await db.ownerSql(`INSERT INTO items (id, n) VALUES (${i * 10}, ${i})`);
    }
    const seen: number[] = [];
    let cursor = "";
    let pages = 0;
    for (;;) {
      const res = await app.request(`/api/v1/items?limit=3&cursor=${encodeURIComponent(cursor)}`, { headers: H });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Page;
      seen.push(...body.data.map((r) => Number(r.id)));
      pages += 1;
      if (pages === 1) {
        // insert before the cursor (must not shift later pages) and after it (must appear)
        await db.ownerSql("INSERT INTO items (id, n) VALUES (5, 0)");
        await db.ownerSql("INSERT INTO items (id, n) VALUES (105, 11)");
        await db.ownerSql("DELETE FROM items WHERE id = 40");
      }
      if (!body.has_more) {
        expect(body.next_cursor).toBeNull();
        break;
      }
      cursor = body.next_cursor!;
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual([10, 20, 30, 50, 60, 70, 80, 90, 100, 105]);
  });

  it("orders by a non-unique column with PK tiebreak and desc direction", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE scores (id INTEGER PRIMARY KEY, s INTEGER NOT NULL)");
    for (let i = 1; i <= 9; i++) await db.ownerSql(`INSERT INTO scores (id, s) VALUES (${i}, ${i % 3})`);
    const ids: number[] = [];
    let cursor = "";
    for (;;) {
      const res = await app.request(
        `/api/v1/scores?order=s.desc&select=id&limit=2&cursor=${encodeURIComponent(cursor)}`,
        { headers: H },
      );
      const body = (await res.json()) as Page;
      for (const r of body.data) {
        expect(Object.keys(r)).toEqual(["id"]);
        ids.push(Number(r.id));
      }
      if (!body.has_more) break;
      cursor = body.next_cursor!;
    }
    expect(ids).toEqual([2, 5, 8, 1, 4, 7, 3, 6, 9]);
  });

  it("walks a composite primary key", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE pairs (a INTEGER NOT NULL, b INTEGER NOT NULL, PRIMARY KEY (a, b))");
    for (const a of [1, 2, 3]) for (const b of [1, 2, 3]) {
      await db.ownerSql(`INSERT INTO pairs (a, b) VALUES (${a}, ${b})`);
    }
    const keys: string[] = [];
    let cursor = "";
    for (;;) {
      const res = await app.request(`/api/v1/pairs?limit=4&cursor=${encodeURIComponent(cursor)}`, { headers: H });
      const body = (await res.json()) as Page;
      keys.push(...body.data.map((r) => `${r.a}${r.b}`));
      if (!body.has_more) break;
      cursor = body.next_cursor!;
    }
    expect(keys).toEqual(["11", "12", "13", "21", "22", "23", "31", "32", "33"]);
  });

  it("rejects forged, tampered, mismatched cursors and bad inputs with 400", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE items (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)");
    for (let i = 1; i <= 5; i++) await db.ownerSql(`INSERT INTO items (id, n) VALUES (${i}, ${i})`);
    const first = (await (await app.request("/api/v1/items?limit=2&cursor=", { headers: H })).json()) as Page;
    const good = first.next_cursor!;
    const get = (q: string) => app.request(`/api/v1/items?${q}`, { headers: H });

    const forgedBody = Buffer.from(
      JSON.stringify({ t: "items", s: "", o: ["id.asc"], v: ["1; DROP TABLE items"] }),
    ).toString("base64url");
    for (const bad of ["garbage", `${forgedBody}.AAAA`, `${good.split(".")[0]}.AAAA`, `x${good}`]) {
      const res = await get(`cursor=${encodeURIComponent(bad)}`);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("bad_cursor");
    }
    // valid signature but different order than the request -> rejected
    expect((await get(`order=n.desc&cursor=${encodeURIComponent(good)}`)).status).toBe(400);
    // offset + cursor, and limit cap
    expect((await get(`offset=1&cursor=${encodeURIComponent(good)}`)).status).toBe(400);
    expect((await get("limit=1001&cursor=")).status).toBe(400);
    // table untouched, good cursor still works
    expect((await get(`limit=2&cursor=${encodeURIComponent(good)}`)).status).toBe(200);
  });

  it("keeps offset paging unchanged", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE items (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)");
    for (let i = 1; i <= 5; i++) await db.ownerSql(`INSERT INTO items (id, n) VALUES (${i}, ${i})`);
    const res = await app.request("/api/v1/items?order=id.asc&limit=2&offset=2", { headers: H });
    const body = (await res.json()) as Record<string, unknown> & { data: Array<{ id: number }> };
    expect(body.data.map((r) => Number(r.id))).toEqual([3, 4]);
    expect("next_cursor" in body).toBe(false);
  });

  it("a text key that spells 'null' does not stop pagination", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE tags (name TEXT PRIMARY KEY)");
    for (const n of ["a", "null", "z"]) await db.ownerSql(`INSERT INTO tags (name) VALUES ('${n}')`);
    const first = (await (await app.request("/api/v1/tags?limit=2&cursor=", { headers: H })).json()) as Page;
    expect(first.data.map((r) => r.name)).toEqual(["a", "null"]);
    const next = await app.request(`/api/v1/tags?limit=2&cursor=${encodeURIComponent(first.next_cursor!)}`, { headers: H });
    expect(((await next.json()) as Page).data.map((r) => r.name)).toEqual(["z"]);
  });

  it("refuses a nullable order column up front instead of dropping NULL rows", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE maybe (id INTEGER PRIMARY KEY, n INTEGER)");
    await db.ownerSql("INSERT INTO maybe (id, n) VALUES (1, NULL)");
    const res = await app.request("/api/v1/maybe?limit=1&cursor=&order=n.asc", { headers: H });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "nullable_order" });
  });
});
