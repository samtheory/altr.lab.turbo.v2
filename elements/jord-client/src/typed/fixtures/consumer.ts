/** App-like consumer of the fixture; must compile against `Database`. */
import { createClient } from "../builder.js";
import type { Database } from "./database.js";

const db = createClient<Database>({ url: "http://localhost:8787", key: "k" });

export async function titlesOf(authorName: string): Promise<string[]> {
  const { data, error } = await db
    .from("public.posts")
    .select("id,title,author:users(name)")
    .eq("published", true)
    .order("id", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return data.map((p) => `${p.title} by ${p.author?.name ?? authorName}`);
}

export async function addUser(name: string) {
  return db.from("public.users").insert({ name, score: 1 }).select("id").single();
}
