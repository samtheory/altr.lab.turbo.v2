import { describe, expect, it } from "vitest";
import { createClient, quoteListValue } from "./builder.js";
import type { Database } from "./fixtures/database.js";

type Call = { url: URL; init: RequestInit; headers: Headers };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function stub(respond: (call: Call) => Response | Promise<Response> = () => json({ data: [] })) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = {
      url: new URL(String(input)),
      init: init ?? {},
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  const db = createClient<Database>({ url: "http://h:1/", key: "KEY", fetch: fetchImpl });
  return { db, calls };
}

describe("typed builder: wire format", () => {
  it("builds every operator and ordering/paging params", async () => {
    const { db, calls } = stub();
    await db
      .from("public.users")
      .select("id,name")
      .eq("id", 1)
      .neq("name", "a")
      .gt("score", 2)
      .gte("score", 3)
      .lt("score", 4)
      .lte("score", 5)
      .like("name", "a%")
      .ilike("name", "B%")
      .in("id", [1, 2, 3])
      .is("meta", null)
      .is("meta", "notnull")
      .order("name", { ascending: false })
      .order("id")
      .range(10, 19);
    const u = calls[0]!.url;
    expect(u.pathname).toBe("/api/v1/users");
    const p = u.searchParams;
    expect(p.get("schema")).toBe("public");
    expect(p.get("select")).toBe("id,name");
    expect(p.getAll("id")).toEqual(["eq.1", "in.(1,2,3)"]);
    expect(p.getAll("name")).toEqual(["neq.a", "like.a%", "ilike.B%"]);
    expect(p.getAll("score")).toEqual(["gt.2", "gte.3", "lt.4", "lte.5"]);
    expect(p.getAll("meta")).toEqual(["is.null", "is.notnull"]);
    expect(p.get("order")).toBe("name.desc,id.asc");
    expect(p.get("limit")).toBe("10");
    expect(p.get("offset")).toBe("10");
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("limit(), shorthand schema, and no select param for '*'", async () => {
    const { db, calls } = stub();
    await db.from("users").select().limit(3);
    const u = calls[0]!.url;
    expect(u.searchParams.get("schema")).toBe("public");
    expect(u.searchParams.has("select")).toBe(false);
    expect(u.searchParams.get("limit")).toBe("3");
  });

  it("escapes commas, parens, quotes and unicode in values (raw URL round-trip)", async () => {
    const { db, calls } = stub();
    const nasty = `a,b (c) "q" & = # ? é 日本 😀`;
    await db.from("users").select().eq("name", nasty).like("name", "%é,日%");
    const url = calls[0]!.url;
    expect(url.search).not.toMatch(/[ "#]/);
    expect(url.search.match(/&/g)!.length).toBe(2); // schema, name, name: no stray separators
    expect(url.searchParams.getAll("name")).toEqual([`eq.${nasty}`, "like.%é,日%"]);
  });

  it("quotes list values inside in(...) and or(...)", async () => {
    expect(quoteListValue("plain")).toBe("plain");
    expect(quoteListValue("a,b")).toBe('"a,b"');
    expect(quoteListValue('say "hi"\\')).toBe('"say \\"hi\\"\\\\"');
    expect(quoteListValue("")).toBe('""');
    expect(quoteListValue("(x)")).toBe('"(x)"');

    const { db, calls } = stub();
    await db
      .from("users")
      .select()
      .in("name", ["a,b", "c)d", "é"])
      .or([
        ["name", "eq", 'x,"y"'],
        ["score", "gt", 3],
        ["name", "in", ["日本", "p(q)"]],
        ["meta", "is", null],
        ["name", "ilike", "ü%"],
      ]);
    const p = calls[0]!.url.searchParams;
    expect(p.get("name")).toBe('in.("a,b","c)d",é)');
    expect(p.get("or")).toBe(
      '(name.eq."x,\\"y\\"",score.gt.3,name.in.(日本,"p(q)"),meta.is.null,name.ilike.ü%)',
    );
  });

  it("insert/update/delete: method, body, headers, returning projection", async () => {
    const { db, calls } = stub(() => json({ data: [{ id: 7 }] }));
    const ins = await db.from("public.users").insert({ name: "n", score: 1 }).select("id").single();
    expect(ins.data).toEqual({ id: 7 });
    await db.from("public.users").update({ name: "z" }).eq("id", 7);
    await db.from("public.users").delete().eq("id", 7);
    expect(calls.map((c) => c.init.method)).toEqual(["POST", "PATCH", "DELETE"]);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ name: "n", score: 1 });
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ name: "z" });
    expect(calls[2]!.init.body).toBeUndefined();
    expect(calls[0]!.url.searchParams.get("select")).toBe("id");
    expect(calls[0]!.headers.get("prefer")).toBe("return=representation");
    expect(calls[0]!.headers.get("content-type")).toBe("application/json");
    expect(calls[1]!.url.searchParams.get("id")).toBe("eq.7");
  });

  it("sends apikey and Authorization headers", async () => {
    const { db, calls } = stub();
    await db.from("users").select().count("exact");
    expect(calls[0]!.headers.get("apikey")).toBe("KEY");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer KEY");
    expect(calls[0]!.headers.get("prefer")).toBe("count=exact");
  });

  it("sends exactly one request per await, even when awaited twice", async () => {
    const { db, calls } = stub();
    const q = db.from("users").select();
    expect(calls).toHaveLength(0);
    await q;
    await q;
    expect(calls).toHaveLength(1);
  });

  it("builder methods do not mutate the base query", async () => {
    const { db, calls } = stub();
    const base = db.from("users").select();
    await base.eq("id", 1);
    await base;
    expect(calls[1]!.url.searchParams.has("id")).toBe(false);
  });
});

describe("typed builder: results and errors", () => {
  it("returns data, count, and keyset metadata", async () => {
    const { db } = stub(() =>
      json({ data: [{ id: 1 }], count: 9, next_cursor: "c1", has_more: true }),
    );
    const r = await db.from("users").select("id").cursor("").limit(1);
    expect(r).toMatchObject({
      data: [{ id: 1 }],
      error: null,
      count: 9,
      nextCursor: "c1",
      hasMore: true,
    });
  });

  it("paginate walks cursors until has_more is false", async () => {
    const pages = [
      { data: [{ id: 1 }], count: null, next_cursor: "c1", has_more: true },
      { data: [{ id: 2 }], count: null, next_cursor: null, has_more: false },
    ];
    const { db, calls } = stub(() => json(pages.shift()));
    const seen: unknown[] = [];
    for await (const page of db.from("users").select("id").order("id").paginate({ pageSize: 1 })) {
      seen.push(page.data);
    }
    expect(seen).toEqual([[{ id: 1 }], [{ id: 2 }]]);
    expect(calls[0]!.url.searchParams.get("cursor")).toBe("");
    expect(calls[0]!.url.searchParams.get("limit")).toBe("1");
    expect(calls[1]!.url.searchParams.get("cursor")).toBe("c1");
  });

  it("single(): one row ok; zero or many -> 406 error; maybeSingle(): zero -> null", async () => {
    let rows: unknown[] = [{ id: 1 }];
    const { db } = stub(() => json({ data: rows }));
    expect((await db.from("users").select("id").single()).data).toEqual({ id: 1 });
    rows = [];
    const none = await db.from("users").select("id").single();
    expect(none.data).toBeNull();
    expect(none.error).toMatchObject({ status: 406, code: "no_rows" });
    expect(await db.from("users").select("id").maybeSingle()).toMatchObject({
      data: null,
      error: null,
    });
    rows = [{ id: 1 }, { id: 2 }];
    expect((await db.from("users").select("id").single()).error?.code).toBe("multiple_rows");
    expect((await db.from("users").select("id").maybeSingle()).error?.code).toBe("multiple_rows");
  });

  it("a server 406 resolves to error", async () => {
    const { db } = stub(() => json({ error: "not_acceptable", message: "nope" }, 406));
    const r = await db.from("users").select("id").single();
    expect(r.error).toEqual({ status: 406, code: "not_acceptable", message: "nope" });
  });

  it("maps HTTP errors without throwing", async () => {
    const { db } = stub(() => json({ error: "bad_column", message: "unknown column x" }, 400));
    const r = await db.from("users").select();
    expect(r).toMatchObject({
      data: null,
      status: 400,
      error: { status: 400, code: "bad_column", message: "unknown column x" },
    });
  });

  it("maps non-JSON error bodies and 5xx", async () => {
    const { db } = stub(() => new Response("upstream down", { status: 502 }));
    const r = await db.from("users").select();
    expect(r.error).toEqual({ status: 502, code: "http_error", message: "upstream down" });
  });

  it("maps network errors into error", async () => {
    const { db } = stub(() => {
      throw new TypeError("fetch failed");
    });
    const r = await db.from("users").select();
    expect(r.data).toBeNull();
    expect(r.error).toEqual({ status: 0, code: "network_error", message: "fetch failed" });
  });

  it("invalid builder input resolves to an error without sending a request", async () => {
    const { db, calls } = stub();
    expect((await db.from("users").select().limit(0)).error?.code).toBe("bad_request");
    expect((await db.from("users").select().range(5, 1)).error?.code).toBe("bad_request");
    expect((await db.from("users").select().eq("score", Number.NaN)).error?.code).toBe(
      "bad_request",
    );
    expect(calls).toHaveLength(0);
  });
});

describe("hardening (S0088 review)", () => {
  it("never follows redirects with credentials", async () => {
    const { db, calls } = stub();
    await db.from("public.users").select("id");
    expect(calls[0]!.init.redirect).toBe("error");
  });

  it("rejects non-identifier column, schema and table names at runtime", async () => {
    const { db, calls } = stub();
    const bad = (db.from("public.users") as any).select("id");
    expect((await bad.eq("a&role", "x")).error?.code).toBe("bad_request");
    expect((await bad.order("a,b")).error?.code).toBe("bad_request");
    expect((await bad.in("a.b", [1])).error?.code).toBe("bad_request");
    expect((await (db as any).from("public...").select("*")).error?.code).toBe("bad_request");
    expect((await (db as any).from("a/b.users").select("*")).error?.code).toBe("bad_request");
    expect(calls).toHaveLength(0);
  });

  it("paginate stops on a repeated cursor and on maxPages, and validates pageSize", async () => {
    let n = 0;
    const { db, calls } = stub(() => json({ data: [{ id: ++n }], next_cursor: "same", has_more: true }));
    const pages: unknown[] = [];
    for await (const p of (db.from("public.users").select("id") as any).paginate({ pageSize: 1 })) pages.push(p);
    expect(pages.length).toBe(2);
    expect(calls.length).toBe(2);

    let m = 0;
    const b = stub(() => json({ data: [], next_cursor: `c${++m}`, has_more: true }));
    const out: unknown[] = [];
    for await (const p of (b.db.from("public.users").select("id") as any).paginate({ maxPages: 3 })) out.push(p);
    expect(out.length).toBe(3);

    const c = stub();
    const first = await (c.db.from("public.users").select("id") as any).paginate({ pageSize: -1 }).next();
    expect(first.value.error.code).toBe("bad_request");
    expect(c.calls).toHaveLength(0);
  });
});
