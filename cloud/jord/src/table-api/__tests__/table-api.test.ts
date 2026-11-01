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
      `SELECT op, pk, old_json, new_json FROM jord_changes WHERE table_name = ${db.ph(1)} ORDER BY seq`,
      ["notes"],
    );
    expect(rows.map((row) => [row.op, row.pk])).toEqual([
      ["insert", "1"],
      ["update", "1"],
      ["delete", "1"],
    ]);
    expect(JSON.parse(String(rows[1]!.old_json))).toMatchObject({ id: "1", title: "a" });
    expect(JSON.parse(String(rows[1]!.new_json))).toMatchObject({ id: "1", title: "b" });
    expect(events.filter((event) => event.table === "notes").map((event) => event.op)).toEqual([
      "insert",
      "update",
      "delete",
    ]);
  });

  it("rejects an unknown ?schema= with 400 on the table API and introspection", async () => {
    const { app } = await boot(backend);
    const admin = operator("admin");
    expect(
      (
        await app.request("/schema/tables", {
          method: "POST",
          headers: { ...admin, "content-type": "application/json" },
          body: JSON.stringify({ name: "notes", columns: [{ name: "title", type: "TEXT" }] }),
        })
      ).status,
    ).toBe(201);

    const table = await app.request("/api/v1/notes?schema=nope", { headers: service() });
    expect(table.status).toBe(400);
    expect(await table.json()).toMatchObject({ error: "unknown_schema" });
    expect((await app.request("/api/v1/openapi.json?schema=nope", { headers: service() })).status).toBe(
      400,
    );
    expect((await app.request("/schema/tables?schema=nope", { headers: admin })).status).toBe(400);
    expect((await app.request("/schema/tables/notes?schema=nope", { headers: admin })).status).toBe(
      400,
    );
    expect(
      (
        await app.request("/schema/tables/notes/rows?schema=nope", { headers: admin })
      ).status,
    ).toBe(400);
    const create = await app.request("/schema/tables?schema=nope", {
      method: "POST",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({ name: "other", columns: [{ name: "title", type: "TEXT" }] }),
    });
    expect(create.status).toBe(400);
    const bodySchema = await app.request("/schema/tables", {
      method: "POST",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({
        name: "other",
        schema: "nope",
        columns: [{ name: "title", type: "TEXT" }],
      }),
    });
    expect(bodySchema.status).toBe(400);

    // The default schema (explicit or implied) still works; an injection string does not.
    expect((await app.request("/api/v1/notes", { headers: service() })).status).toBe(200);
    expect(
      (await app.request('/api/v1/notes?schema=public"%3B--', { headers: service() })).status,
    ).toBe(400);
  });

  it("lists schemas on GET /schema/schemas", async () => {
    const { app, jord } = await boot(backend);
    const res = await app.request("/schema/schemas", { headers: operator("admin") });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { schemas: Array<{ name: string; readOnly: boolean }> };
    expect(body.schemas.map((s) => s.name)).toContain(jord.defaultSchema);
    if (backend === "file") {
      expect(body.schemas).toEqual([{ name: "main", readOnly: true }]);
      const tables = await app.request("/schema/tables?schema=main", { headers: operator("admin") });
      expect(tables.status).toBe(200);
    }
  });

  it.runIf(backend === "postgres")(
    "serves a non-public schema end to end (DDL, rows, RLS, table API, outbox)",
    async () => {
      const { app, db, jord } = await boot(backend);
      await db.ownerSql("CREATE SCHEMA app");
      // The runtime role only sees schemas it can USE; sync then grants DML there.
      await db.ownerSql("GRANT USAGE ON SCHEMA app TO jord_app");
      const admin = { ...operator("admin"), "content-type": "application/json" };

      const created = await app.request("/schema/tables?schema=app", {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ name: "notes", columns: [{ name: "title", type: "TEXT" }] }),
      });
      expect(created.status).toBe(201);
      expect(((await created.json()) as { table: { schema: string } }).table.schema).toBe("app");
      expect(await jord.describeTable("notes")).toBeNull();

      const rls = await app.request("/schema/tables/notes/rls?schema=app", {
        method: "PUT",
        headers: admin,
        body: JSON.stringify({ rls_enabled: true }),
      });
      expect(rls.status).toBe(200);
      expect(await rls.json()).toMatchObject({ schema: "app", rls_enabled: true });

      const list = await app.request("/schema/tables?schema=app", { headers: admin });
      expect(await list.json()).toEqual({ tables: ["notes"] });
      const schemas = (
        (await (await app.request("/schema/schemas", { headers: admin })).json()) as {
          schemas: Array<{ name: string }>;
        }
      ).schemas.map((s) => s.name);
      expect(schemas).toEqual(expect.arrayContaining(["public", "app"]));

      const json = { ...service(), "content-type": "application/json" };
      expect(
        (
          await app.request("/api/v1/notes?schema=app", {
            method: "POST",
            headers: json,
            body: JSON.stringify({ id: "1", title: "in app" }),
          })
        ).status,
      ).toBe(201);
      const fetched = await app.request("/api/v1/notes?schema=app", { headers: service() });
      expect(((await fetched.json()) as { data: unknown[] }).data).toEqual([
        { id: "1", title: "in app" },
      ]);
      // Not in public.
      expect((await app.request("/api/v1/notes", { headers: service() })).status).toBe(404);

      const rows = await app.request("/schema/tables/notes/rows?schema=app", { headers: admin });
      expect(((await rows.json()) as { rows: unknown[] }).rows).toEqual([
        { id: "1", title: "in app" },
      ]);

      const changes = await db.jord.query(
        "SELECT op, pk FROM jord_changes WHERE table_name = $1 ORDER BY seq",
        ["notes"],
      );
      expect(changes.map((row) => [row.op, row.pk])).toEqual([["insert", "1"]]);
      const tracked = await db.jord.query(
        "SELECT schema_name FROM jord_tracked_tables WHERE table_name = $1",
        ["notes"],
      );
      expect(tracked).toEqual([{ schema_name: "app" }]);

      expect(
        (await app.request("/schema/tables/notes?schema=app", { method: "DELETE", headers: admin }))
          .status,
      ).toBe(200);
    },
  );
});
