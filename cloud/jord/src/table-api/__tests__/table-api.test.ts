import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../../app.js";
import type { JordAuthConfig } from "../../auth/config.js";
import { signAccessToken } from "../../auth/jwt.js";
import { signSessionToken } from "../../auth/token.js";
import { createWriteQueue } from "../../queue.js";
import { RealtimeBus, type JordChangeEvent } from "../../realtime/index.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../../testing/harness.js";
import { compileSelect } from "../sql.js";
import { parseTableQuery } from "../query.js";
import { tableFetch } from "@altr/jord-client";

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

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function service(): Record<string, string> {
  return bearer(AUTH.secret);
}

function operator(role: "admin" | "editor" | "readonly"): Record<string, string> {
  return bearer(signSessionToken(role, AUTH.secret));
}

function user(): Record<string, string> {
  return bearer(
    signAccessToken({
      secret: JWT,
      iss: "jord",
      aud: "jord",
      sub: "user-1",
      role: "user",
    }).token,
  );
}

describe.each(TEST_BACKENDS)("S0022 table API (%s)", (backend) => {
  it("rejects caps, unfiltered writes, and non-service all=true", async () => {
    const { app, db } = await boot(backend);
    const created = await app.request("/schema/tables", {
      method: "POST",
      headers: { ...operator("admin"), "content-type": "application/json" },
      body: JSON.stringify({
        name: "notes",
        columns: [{ name: "title", type: "TEXT" }],
      }),
    });
    expect(created.status).toBe(201);

    const cap = await app.request("/api/v1/notes?limit=1001", { headers: service() });
    expect(cap.status).toBe(400);
    const wide = await app.request(
      "/api/v1/notes?title=in.(" + Array.from({ length: 101 }, (_, i) => `v${i}`).join(",") + ")",
      { headers: service() },
    );
    expect(wide.status).toBe(400);

    const bare = await app.request("/api/v1/notes", {
      method: "PATCH",
      headers: { ...operator("admin"), "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(bare.status).toBe(400);

    const allOp = await app.request("/api/v1/notes?all=true", {
      method: "DELETE",
      headers: operator("admin"),
    });
    expect(allOp.status).toBe(403);

    const allUser = await app.request("/api/v1/notes?all=true", {
      method: "PATCH",
      headers: { ...user(), "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(allUser.status).toBe(403);

    await db.ownerSql("CREATE TABLE loose (note TEXT)");
    const noKey = await app.request("/api/v1/loose?note=eq.x", {
      method: "DELETE",
      headers: service(),
    });
    expect(noKey.status).toBe(400);

    const denied = await app.request("/api/v1/notes", { headers: user() });
    expect(denied.status).toBe(403);
  });

  it("coerces filters, lowers ilike, returns rows, and plans a null count", async () => {
    const { app, jord } = await boot(backend);
    expect(
      (
        await app.request("/schema/tables", {
          method: "POST",
          headers: { ...operator("admin"), "content-type": "application/json" },
          body: JSON.stringify({
            name: "notes",
            columns: [
              { name: "title", type: "TEXT" },
              { name: "n", type: "INTEGER" },
            ],
          }),
        })
      ).status,
    ).toBe(201);

    const inserted = await tableFetch(
      async (input, init) => {
        const url = new URL(String(input));
        return app.request(`${url.pathname}${url.search}`, init);
      },
      "http://jord.local/api/v1/notes",
      {
        method: "POST",
        headers: {
          ...service(),
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({ id: "1", title: "Hello", n: 2 }),
      },
    );
    expect(inserted.status).toBe(201);
    expect(inserted.body).toMatchObject({ data: { id: "1", title: "Hello", n: 2 } });

    await app.request("/api/v1/notes", {
      method: "POST",
      headers: { ...service(), "content-type": "application/json" },
      body: JSON.stringify({ id: "2", title: "Other", n: 9 }),
    });

    const info = await jord.describeTable("notes");
    expect(info).not.toBeNull();
    const parsed = parseTableQuery(info!, new URLSearchParams("title=ilike.hello%"), undefined);
    const sql = compileSelect(info!, parsed, "libsql").sql;
    expect(sql).toContain("lower(");
    expect(sql).not.toContain("hello");

    const listed = await app.request("/api/v1/notes?title=ilike.hello%&n=gte.2", {
      headers: { ...service(), prefer: "count=planned" },
    });
    expect(listed.status).toBe(200);
    expect(listed.headers.get("preference-applied")).toBe("count=planned");
    const body = (await listed.json()) as { data: Array<{ id: string }>; count: number | null };
    expect(body.count).toBeNull();
    expect(body.data.map((row) => row.id)).toEqual(["1"]);

    const exact = await app.request("/api/v1/notes", {
      headers: { ...service(), prefer: "count=exact" },
    });
    expect(exact.headers.get("preference-applied")).toBe("count=exact");
    expect(((await exact.json()) as { count: number }).count).toBe(2);

    const wiped = await app.request("/api/v1/notes?all=true", {
      method: "DELETE",
      headers: service(),
    });
    expect(wiped.status).toBe(200);
  });

  it("round-trips a composite primary key", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql(
      "CREATE TABLE pair (a TEXT NOT NULL, b TEXT NOT NULL, note TEXT, PRIMARY KEY (a, b))",
    );
    const created = await app.request("/api/v1/pair", {
      method: "POST",
      headers: {
        ...service(),
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({ a: "a1", b: "b1", note: "one" }),
    });
    expect(created.status).toBe(201);
    const patched = await app.request("/api/v1/pair?pk=a1&pk=b1", {
      method: "PATCH",
      headers: { ...service(), "content-type": "application/json", prefer: "return=representation" },
      body: JSON.stringify({ note: "two" }),
    });
    expect(patched.status).toBe(200);
    const body = (await patched.json()) as { data: Array<{ note: string }> };
    expect(body.data[0]?.note).toBe("two");
  });

  it("serves OpenAPI from introspection", async () => {
    const { app } = await boot(backend);
    const res = await app.request("/api/v1/openapi.json", { headers: service() });
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; info: { description: string } };
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info.description).toContain("count=exact");
    expect(doc.info.description).toContain("lower(column)");
  });

  it("writes jord_changes and fans out jord.change for POST, PATCH, and DELETE", async () => {
    const { app, db, realtime } = await boot(backend);
    const events: JordChangeEvent[] = [];
    realtime.trySubscribe((event) => events.push(event));
    const json = { ...service(), "content-type": "application/json" };
    expect(
      (
        await app.request("/schema/tables", {
          method: "POST",
          headers: { ...operator("admin"), "content-type": "application/json" },
          body: JSON.stringify({ name: "notes", columns: [{ name: "title", type: "TEXT" }] }),
        })
      ).status,
    ).toBe(201);

    expect(
      (await app.request("/api/v1/notes", { method: "POST", headers: json, body: JSON.stringify({ id: "1", title: "a" }) }))
        .status,
    ).toBe(201);
    expect(
      (await app.request("/api/v1/notes?id=eq.1", { method: "PATCH", headers: json, body: JSON.stringify({ title: "b" }) }))
        .status,
    ).toBe(200);
    expect((await app.request("/api/v1/notes?id=eq.1", { method: "DELETE", headers: json })).status).toBe(200);

    const rows = await db.jord.query(
      `SELECT op, pk, new_json FROM jord_changes WHERE table_name = ${db.ph(1)} ORDER BY seq`,
      ["notes"],
    );
    expect(rows.map((row) => [row.op, row.pk])).toEqual([
      ["insert", "1"],
      ["update", "1"],
      ["delete", "1"],
    ]);
    expect(JSON.parse(String(rows[1]!.new_json))).toMatchObject({ id: "1", title: "b" });
    expect(events.filter((event) => event.table === "notes").map((event) => event.op)).toEqual([
      "insert",
      "update",
      "delete",
    ]);
  });
});
