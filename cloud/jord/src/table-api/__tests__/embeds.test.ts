import type { JordDriverPort } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../../app.js";
import type { JordAuthConfig } from "../../auth/config.js";
import { signAccessToken } from "../../auth/jwt.js";
import { signSessionToken } from "../../auth/token.js";
import { createWriteQueue } from "../../queue.js";
import { RealtimeBus } from "../../realtime/index.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../../testing/harness.js";
import { EMBED_MAX_PER_PARENT } from "../embeds.js";
import { parseTableQuery, TableApiError } from "../query.js";
import { compileEmbedSelect } from "../sql.js";

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

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const SERVICE = bearer(AUTH.secret);
const ADMIN = { ...bearer(signSessionToken("admin", AUTH.secret)), "content-type": "application/json" };
const asUser = (sub: string) =>
  bearer(signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub, role: "user" }).token);

type Row = Record<string, unknown>;

/** Wraps the runtime port to record every SQL statement the app sends. */
function counting(jord: JordDriverPort): { port: JordDriverPort; log: string[] } {
  const log: string[] = [];
  const port = new Proxy(jord, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (prop === "query") {
        return (sql: string, args?: unknown[]) => {
          log.push(sql);
          return (value as JordDriverPort["query"]).call(target, sql, args as never);
        };
      }
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
  return { port, log };
}

async function boot(backend: TestBackend) {
  const db = await openTestDb(backend);
  open.push(db);
  const { port, log } = counting(db.jord);
  const app = createJordApp({
    jord: port,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    realtime: new RealtimeBus(),
  });
  return { app, db, log };
}

type App = Awaited<ReturnType<typeof boot>>["app"];

async function policy(app: App, table: string, rules: unknown[]): Promise<void> {
  const res = await app.request("/policies", {
    method: "POST",
    headers: ADMIN,
    body: JSON.stringify({
      name: `${table} select`,
      table_name: table,
      operation: "select",
      effect: "allow",
      rules: JSON.stringify(rules),
    }),
  });
  expect(res.status).toBe(201);
}

async function rls(app: App, table: string): Promise<void> {
  const res = await app.request(`/schema/tables/${table}/rls`, {
    method: "PUT",
    headers: ADMIN,
    body: JSON.stringify({ rls_enabled: true, owner_column: "owner_id" }),
  });
  expect(res.status).toBe(200);
}

/**
 * users: 1 (owner user-1), 2 (owner user-2) — users read only their own row.
 * posts: owner_id scoped too, author_id → users. posts 10..14.
 * secrets: RLS on, no policies (users get 403 directly).
 */
async function seed(app: App, db: TestDb): Promise<void> {
  await db.ownerSql("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT)");
  await db.ownerSql("CREATE TABLE secrets (id INTEGER PRIMARY KEY, body TEXT, owner_id TEXT)");
  await db.ownerSql(
    "CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, owner_id TEXT, " +
      "author_id INTEGER REFERENCES users(id), secret_id INTEGER REFERENCES secrets(id))",
  );
  await db.ownerSql("INSERT INTO users (id, name, owner_id) VALUES (1, 'ann', 'user-1'), (2, 'bob', 'user-2')");
  await db.ownerSql("INSERT INTO secrets (id, body, owner_id) VALUES (1, 'top', 'user-1')");
  await db.ownerSql(
    "INSERT INTO posts (id, title, owner_id, author_id, secret_id) VALUES " +
      "(10, 'p10', 'user-1', 1, 1), (11, 'p11', 'user-1', 2, NULL), (12, 'p12', 'user-2', 1, NULL), " +
      "(13, 'p13', 'user-2', 2, NULL), (14, 'p14', 'user-1', NULL, NULL)",
  );
  for (const table of ["users", "posts", "secrets"]) await rls(app, table);
  await policy(app, "users", [{ kind: "owner_eq", config: { column: "owner_id" } }]);
  await policy(app, "posts", [{ kind: "owner_eq", config: { column: "owner_id" } }]);
}

async function getJson(app: App, path: string, headers: Record<string, string>) {
  const res = await app.request(path, { headers });
  return { res, body: (await res.json()) as { data: Row[]; error?: string; available?: string[] } };
}

describe("S0078 embed SQL (both dialects)", () => {
  const posts = {
    name: "posts",
    schema: "public",
    columns: [
      { name: "id", type: "integer", notnull: true, pk: true, dflt_value: null },
      { name: "author_id", type: "integer", notnull: false, pk: false, dflt_value: null },
      { name: "owner_id", type: "text", notnull: false, pk: false, dflt_value: null },
    ],
  };
  const scope = { scope: { anyOf: [[{ column: "owner_id", value: "u1" }]] }, columns: ["id", "author_id", "owner_id"] };

  it("postgres: $n placeholders line up with args, scope is inside the window subquery", () => {
    const compiled = compileEmbedSelect(posts, ["id"], ["author_id"], [[1], [2]], "postgres", { perParent: 100, total: 5000 }, scope);
    expect(compiled.sql).toBe(
      'SELECT "id", "author_id" FROM (SELECT "id", "author_id", ROW_NUMBER() OVER (PARTITION BY "author_id" ORDER BY "id" ASC) AS "__jord_rn"' +
        ' FROM "public"."posts" WHERE "author_id" IN ($1, $2) AND (("owner_id" = $3))) AS "__jord_embed" WHERE "__jord_rn" <= $4' +
        ' ORDER BY "author_id", "id" ASC LIMIT $5',
    );
    expect(compiled.args).toEqual([1, 2, "u1", 101, 5001]);
  });

  it("composite keys bind after the scope, in text order", () => {
    const compiled = compileEmbedSelect(posts, ["id"], ["author_id", "owner_id"], [[1, "a"], [2, "b"]], "postgres", { perParent: null, total: 10 }, scope);
    expect(compiled.sql).toBe(
      'SELECT "id", "author_id", "owner_id" FROM "public"."posts" WHERE (("owner_id" = $1)) AND' +
        ' (("author_id" = $2 AND "owner_id" = $3) OR ("author_id" = $4 AND "owner_id" = $5)) ORDER BY "id" ASC LIMIT $6',
    );
    expect(compiled.args).toEqual(["u1", 1, "a", 2, "b", 11]);
  });

  it("parse: grammar errors are 400s", () => {
    const info = { name: "posts", columns: posts.columns };
    const parse = (select: string) => parseTableQuery(info, new URLSearchParams({ select }), undefined);
    expect(parse("*,author(*)").embeds).toEqual([{ key: "author", relation: "author", columns: null }]);
    expect(parse("id,w:users(name,id)")).toMatchObject({
      select: ["id"],
      embeds: [{ key: "w", relation: "users", columns: ["name", "id"] }],
    });
    expect(parse("id,author_id").embeds).toEqual([]);
    for (const bad of ["*,a(b(*))", "*,a(", "*,a)", "*,a()", "*,a(x;y)", "*,a(*),a(*)"]) {
      expect(() => parse(bad)).toThrowError(TableApiError);
    }
  });
});

describe.each(TEST_BACKENDS)("S0078 FK embeds (%s)", (backend) => {
  it("many-to-one: two principals see only parents they can read directly; hidden parent = null", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const path = "/api/v1/posts?select=id,author(id,name)&order=id.asc";

    const one = await getJson(app, path, asUser("user-1"));
    expect(one.res.status).toBe(200);
    expect(one.body.data).toEqual([
      { id: 10, author: { id: 1, name: "ann" } },
      { id: 11, author: null }, // author 2 hidden from user-1
      { id: 14, author: null }, // NULL FK: same shape as hidden
    ]);

    const two = await getJson(app, path, asUser("user-2"));
    expect(two.body.data).toEqual([
      { id: 12, author: null },
      { id: 13, author: { id: 2, name: "bob" } },
    ]);

    // Parity: every embedded parent is in the principal's direct read of users.
    for (const [sub, result] of [["user-1", one], ["user-2", two]] as const) {
      const direct = await getJson(app, "/api/v1/users", asUser(sub));
      const directIds = new Set(direct.body.data.map((row) => row.id));
      for (const row of result.body.data) {
        const author = row.author as Row | null;
        if (author) expect(directIds.has(author.id)).toBe(true);
      }
    }

    // Service sees everything.
    const svc = await getJson(app, path, SERVICE);
    expect(svc.body.data.map((row) => (row.author as Row | null)?.id ?? null)).toEqual([1, 2, 1, 2, null]);
  });

  it("one-to-many: children are filtered by the child table's policy, not the root's", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const path = "/api/v1/users?select=id,posts(id)&order=id.asc";
    const one = await getJson(app, path, asUser("user-1"));
    expect(one.res.status).toBe(200);
    // post 12 has author 1 but belongs to user-2: omitted.
    expect(one.body.data).toEqual([{ id: 1, posts: [{ id: 10 }] }]);
    const two = await getJson(app, path, asUser("user-2"));
    expect(two.body.data).toEqual([{ id: 2, posts: [{ id: 13 }] }]);
    const svc = await getJson(app, path, SERVICE);
    expect(svc.body.data).toEqual([
      { id: 1, posts: [{ id: 10 }, { id: 12 }] },
      { id: 2, posts: [{ id: 11 }, { id: 13 }] },
    ]);
  });

  it("embedding a table the principal cannot read matches direct access (403)", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const direct = await app.request("/api/v1/secrets", { headers: asUser("user-1") });
    expect(direct.status).toBe(403);
    const embedded = await getJson(app, "/api/v1/posts?select=id,secrets(*)", asUser("user-1"));
    expect(embedded.res.status).toBe(403);
    expect(embedded.body.error).toBe("policy_denied");
    expect(JSON.stringify(embedded.body)).not.toContain("top");
    // Service can embed it.
    const svc = await getJson(app, "/api/v1/posts?select=id,secrets(body)&id=eq.10", SERVICE);
    expect(svc.body.data).toEqual([{ id: 10, secrets: { body: "top" } }]);
  });

  it("unknown relation is a 400 listing the available relations", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const res = await getJson(app, "/api/v1/posts?select=*,nope(*)", SERVICE);
    expect(res.res.status).toBe(400);
    expect(res.body.error).toBe("unknown_relation");
    expect(res.body.available).toEqual(["author", "secret", "secrets", "users"]);
    const users = await getJson(app, "/api/v1/users?select=*,nope(*)", SERVICE);
    expect(users.body.available).toEqual(["posts"]);
  });

  it("rejects nested embeds, bad embed columns, embeds on writes, and key clashes", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const status = async (path: string, init?: RequestInit) =>
      (await app.request(path, { ...init, headers: { ...SERVICE, "content-type": "application/json" } })).status;
    expect(await status("/api/v1/posts?select=*,author(*,posts(*))")).toBe(400);
    expect(await status("/api/v1/posts?select=*,author(nope)")).toBe(400);
    expect(await status("/api/v1/posts?select=*,author(*")).toBe(400);
    expect(await status("/api/v1/posts?select=*,title:users(*)")).toBe(400);
    expect(
      await status("/api/v1/posts?id=eq.10&select=*,author(*)", { method: "PATCH", body: '{"title":"x"}' }),
    ).toBe(400);
    // untouched
    const row = await getJson(app, "/api/v1/posts?id=eq.10", SERVICE);
    expect(row.body.data[0]!.title).toBe("p10");
  });

  it("aliases and column subsets; FK columns needed for matching are not leaked into output", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const res = await getJson(app, "/api/v1/posts?select=title,writer:users(name)&id=eq.10", SERVICE);
    expect(res.body.data).toEqual([{ title: "p10", writer: { name: "ann" } }]);
    const star = await getJson(app, "/api/v1/posts?select=*,author(*)&id=eq.11", SERVICE);
    expect(star.body.data[0]).toMatchObject({ id: 11, author_id: 2, author: { id: 2, name: "bob", owner_id: "user-2" } });
    // plain select unchanged
    const plain = await getJson(app, "/api/v1/posts?select=id,title&id=eq.10", SERVICE);
    expect(plain.body.data).toEqual([{ id: 10, title: "p10" }]);
  });

  it("no N+1: one embed statement regardless of parent count", async () => {
    const { app, db, log } = await boot(backend);
    await db.ownerSql("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    await db.ownerSql("CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER REFERENCES users(id))");
    const users = Array.from({ length: 40 }, (_, i) => `(${i + 1}, 'u${i + 1}')`).join(", ");
    const posts = Array.from({ length: 40 }, (_, i) => `(${i + 1}, ${i + 1})`).join(", ");
    await db.ownerSql(`INSERT INTO users (id, name) VALUES ${users}`);
    await db.ownerSql(`INSERT INTO posts (id, author_id) VALUES ${posts}`);

    const run = async (limit: number) => {
      log.length = 0;
      const res = await getJson(app, `/api/v1/posts?select=id,author(name)&order=id.asc&limit=${limit}`, SERVICE);
      expect(res.res.status).toBe(200);
      expect(res.body.data).toHaveLength(limit);
      expect(res.body.data.every((row) => (row.author as Row).name === `u${row.id}`)).toBe(true);
      return [...log];
    };
    await run(1); // warm one-time lookups (settings caches) out of the comparison
    const small = await run(2);
    const large = await run(40);
    expect(large.length).toBe(small.length);
    const embedStatements = large.filter((sql) => /FROM\s+"[^"]+"\."users"/.test(sql));
    expect(embedStatements).toHaveLength(1);

    const many = await (async () => {
      log.length = 0;
      await getJson(app, "/api/v1/users?select=id,posts(id)&limit=40", SERVICE);
      return log.filter((sql) => /FROM\s+"[^"]+"\."posts"/.test(sql));
    })();
    expect(many).toHaveLength(1);
  });

  it("caps one-to-many rows per parent and flags truncation", async () => {
    const { app, db } = await boot(backend);
    await db.ownerSql("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    await db.ownerSql("CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER REFERENCES users(id))");
    await db.ownerSql("INSERT INTO users (id, name) VALUES (1, 'a'), (2, 'b')");
    const posts = Array.from({ length: EMBED_MAX_PER_PARENT + 5 }, (_, i) => `(${i + 1}, 1)`);
    posts.push(`(${EMBED_MAX_PER_PARENT + 100}, 2)`);
    await db.ownerSql(`INSERT INTO posts (id, author_id) VALUES ${posts.join(", ")}`);
    const res = await app.request("/api/v1/users?select=id,posts(id)&order=id.asc", { headers: SERVICE });
    const body = (await res.json()) as { data: Array<{ id: number; posts: Row[] }> };
    expect(body.data[0]!.posts).toHaveLength(EMBED_MAX_PER_PARENT);
    expect(body.data[0]!.posts[0]).toEqual({ id: 1 });
    expect(body.data[1]!.posts).toEqual([{ id: EMBED_MAX_PER_PARENT + 100 }]);
    expect(res.headers.get("Jord-Embed-Truncated")).toBe("posts");
  });

  it("works with keyset and offset paging", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const first = (await (
      await app.request("/api/v1/posts?select=id,author(name)&limit=2&cursor=", { headers: SERVICE })
    ).json()) as { data: Row[]; next_cursor: string; has_more: boolean };
    expect(first.data).toEqual([
      { id: 10, author: { name: "ann" } },
      { id: 11, author: { name: "bob" } },
    ]);
    const second = (await (
      await app.request(
        `/api/v1/posts?select=id,author(name)&limit=2&cursor=${encodeURIComponent(first.next_cursor)}`,
        { headers: SERVICE },
      )
    ).json()) as { data: Row[] };
    expect(second.data).toEqual([
      { id: 12, author: { name: "ann" } },
      { id: 13, author: { name: "bob" } },
    ]);
    const offset = await getJson(app, "/api/v1/posts?select=id,author(name)&order=id.asc&limit=1&offset=4", SERVICE);
    expect(offset.body.data).toEqual([{ id: 14, author: null }]);
  });

  it("OpenAPI lists relations per table", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    const doc = (await (await app.request("/api/v1/openapi.json", { headers: SERVICE })).json()) as {
      paths: Record<string, { get: { "x-jord-relations": Array<{ names: string[]; kind: string; table: string }> } }>;
    };
    const posts = doc.paths["/api/v1/posts"]!.get["x-jord-relations"];
    expect(posts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ names: ["users", "author"], kind: "many-to-one", table: "users" }),
        expect.objectContaining({ names: ["secrets", "secret"], kind: "many-to-one", table: "secrets" }),
      ]),
    );
    const users = doc.paths["/api/v1/users"]!.get["x-jord-relations"];
    expect(users).toEqual([expect.objectContaining({ names: ["posts"], kind: "one-to-many" })]);
  });

  it("rejects prototype-ish embed aliases", async () => {
    const { app, db } = await boot(backend);
    await seed(app, db);
    for (const alias of ["__proto__", "constructor", "prototype"]) {
      const res = await getJson(app, `/api/v1/posts?select=*,${alias}:users(*)`, SERVICE);
      expect(res.res.status).toBe(400);
      expect(res.body.error).toBe("bad_select");
    }
  });
});
