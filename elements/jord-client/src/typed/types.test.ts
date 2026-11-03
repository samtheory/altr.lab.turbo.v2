import { describe, expect, expectTypeOf, it } from "vitest";
import { createClient } from "./builder.js";
import type { SelectError } from "./types.js";
import type { Database } from "./fixtures/database.js";

const db = createClient<Database>({
  url: "http://x",
  key: "k",
  fetch: async () => new Response('{"data":[]}'),
});
const posts = db.from("public.posts");
const users = db.from("public.users");

// Compile-time assertions only; the bodies are never executed.
function typeCases() {
  // ---- result typing ----
  async function results() {
    const all = await posts.select();
    if (!all.error) expectTypeOf(all.data[0]!.title).toBeString();
    const star = await posts.select("*");
    if (!star.error) expectTypeOf(star.data[0]!.published).toBeBoolean();

    const cols = await posts.select("id,title");
    if (!cols.error) {
      expectTypeOf(cols.data[0]).toEqualTypeOf<{ id: number; title: string }>();
    }

    const emb = await posts.select("id,author:users(name)");
    if (!emb.error) {
      expectTypeOf(emb.data[0]!.author).toEqualTypeOf<{ name: string } | null>();
    }
    const star2 = await posts.select("*,author(*)");
    if (!star2.error) {
      expectTypeOf(star2.data[0]!.author!.score).toBeNumber();
      expectTypeOf(star2.data[0]!.title).toBeString();
    }
    const many = await users.select("id,posts(id,title)");
    if (!many.error) {
      expectTypeOf(many.data[0]!.posts).toEqualTypeOf<{ id: number; title: string }[]>();
    }
    const one = await posts.select("id").single();
    if (!one.error) expectTypeOf(one.data).toEqualTypeOf<{ id: number }>();
    const maybe = await posts.select("id").maybeSingle();
    if (!maybe.error) expectTypeOf(maybe.data).toEqualTypeOf<{ id: number } | null>();

    const ins = await posts.insert({ author_id: 1, title: "t" });
    if (!ins.error) expectTypeOf(ins.data[0]!.id).toBeNumber();
    const ins2 = await posts.insert({ author_id: 1, title: "t" }).select("id").single();
    if (!ins2.error) expectTypeOf(ins2.data).toEqualTypeOf<{ id: number }>();
    await posts.insert([{ author_id: 1, title: "a" }, { author_id: 2, title: "b" }]);
    await posts.update({ title: "x" }).eq("id", 1);
    await posts.delete().eq("id", 1);
    await db.from("posts").select("id"); // public shorthand
  }

  // ---- valid filters ----
  posts.select().eq("id", 1).neq("title", "a").gt("id", 1).gte("id", 1).lt("id", 2).lte("id", 2);
  posts.select().in("id", [1, 2]).like("title", "a%").ilike("title", "a%").is("body", null);
  posts.select().or([["id", "eq", 1], ["title", "like", "a%"], ["id", "in", [1, 2]]]);
  posts.select().order("title", { ascending: false }).limit(5).range(0, 4).cursor("").count();
  users.select().eq("meta", { any: "json" });

  // ---- invalid calls: each @ts-expect-error must be genuinely required ----
  // @ts-expect-error wrong column name
  posts.select().eq("nope", 1);
  // @ts-expect-error wrong value type
  posts.select().eq("id", "1");
  // @ts-expect-error gt on boolean
  posts.select().gt("published", true);
  // @ts-expect-error gt on json column
  users.select().gt("meta", 1);
  // @ts-expect-error in() needs the column type
  posts.select().in("id", ["a"]);
  // @ts-expect-error like on a number column
  posts.select().like("id", "1%");
  // @ts-expect-error order on unknown column
  posts.select().order("nope");
  // @ts-expect-error limit must be a number
  posts.select().limit("5");
  // @ts-expect-error range must be numbers
  posts.select().range("0", 5);
  // @ts-expect-error or condition: wrong value type
  posts.select().or([["id", "eq", "x"]]);
  // @ts-expect-error or condition: unknown column
  posts.select().or([["nope", "eq", 1]]);
  // @ts-expect-error unknown table
  db.from("public.nope");
  // @ts-expect-error missing required column (title)
  posts.insert({ author_id: 1 });
  // @ts-expect-error wrong type on insert
  posts.insert({ author_id: "1", title: "t" });
  // @ts-expect-error extra column on insert
  posts.insert({ author_id: 1, title: "t", extra: true });
  // @ts-expect-error extra column on insert batch
  posts.insert([{ author_id: 1, title: "t", extra: true }]);
  // @ts-expect-error wrong update value type
  posts.update({ title: 5 });
  // @ts-expect-error unknown column in select
  posts.select("id,nope");
  // @ts-expect-error bad embed relation
  posts.select("id,writer(name)");
  // @ts-expect-error bad column inside embed
  posts.select("id,author:users(nope)");
  // @ts-expect-error nested embeds are unsupported
  users.select("id,posts(id,author(name))");
  // @ts-expect-error mutation select validated too
  posts.insert({ author_id: 1, title: "t" }).select("nope");
  return results;
}

describe("typed builder: types", () => {
  it("fixture type cases compile (checked by tsc)", () => {
    expect(typeof typeCases).toBe("function");
  });

  it("invalid select strings resolve to SelectError, not any", async () => {
    // @ts-expect-error argument rejected, but the result type is still an error type
    const bad = posts.select("id,nope");
    const res = await bad;
    if (!res.error) {
      expectTypeOf(res.data[0]).toEqualTypeOf<
        SelectError<"unknown column 'nope'">
      >();
    }
    const dynamic = (s: string) => posts.select(s);
    const r = await dynamic("id");
    if (!r.error) {
      expectTypeOf(r.data[0]).not.toBeAny();
      expectTypeOf(r.data[0]).toEqualTypeOf<
        SelectError<"select must be a string literal to be typed">
      >();
    }
  });
});
