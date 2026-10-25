import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { JordClient, tableFetch } from "./index.js";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("jord-client", () => {
  it("refreshes once after 401 and retries with the new access token", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse(200, { access_token: "access-2", refresh_token: "refresh-2" });
      }
      const auth = new Headers(init?.headers).get("authorization");
      if (auth === "Bearer access-1") return jsonResponse(401, { error: "unauthorized" });
      return jsonResponse(200, { data: [] });
    };
    const seen: Array<string | null> = [];
    const client = new JordClient({
      baseUrl: "http://jord.local/",
      fetch: fetchImpl,
      tokens: { accessToken: "access-1", refreshToken: "refresh-1" },
      onTokens: (tokens) => seen.push(tokens?.accessToken ?? null),
    });

    const res = await client.from("notes").select("title=eq.Hello");
    expect(res.status).toBe(200);
    expect(calls).toEqual([
      "GET http://jord.local/api/v1/notes?title=eq.Hello",
      "POST http://jord.local/auth/refresh",
      "GET http://jord.local/api/v1/notes?title=eq.Hello",
    ]);
    expect(seen).toEqual(["access-2"]);
  });

  it("shares one refresh across overlapping 401s", async () => {
    let refreshes = 0;
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshes += 1;
        await gate;
        return jsonResponse(200, { access_token: "access-2", refresh_token: "refresh-2" });
      }
      const auth = new Headers(init?.headers).get("authorization");
      if (auth !== "Bearer access-2") return jsonResponse(401, { error: "unauthorized" });
      return jsonResponse(200, { ok: true });
    };
    const client = new JordClient({
      baseUrl: "http://jord.local",
      fetch: fetchImpl,
      tokens: { accessToken: "access-1", refreshToken: "refresh-1" },
    });
    const pending = Promise.all([client.request("/records"), client.request("/records")]);
    await Promise.resolve();
    release();
    const [a, b] = await pending;
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refreshes).toBe(1);
  });

  it("surfaces refresh reuse as signed-out and does not retry", async () => {
    const calls: string[] = [];
    const reasons: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).endsWith("/auth/refresh")) {
        return jsonResponse(401, { error: "refresh_reused" });
      }
      return jsonResponse(401, { error: "unauthorized" });
    };
    const client = new JordClient({
      baseUrl: "http://jord.local",
      fetch: fetchImpl,
      tokens: { accessToken: "access-1", refreshToken: "refresh-1" },
      onTokens: (_tokens, reason) => {
        if (reason) reasons.push(reason);
      },
    });

    await expect(client.request("/api/v1/notes")).rejects.toMatchObject({
      name: "JordSignedOutError",
      reason: "refresh_reused",
    });
    expect(reasons).toEqual(["refresh_reused"]);
    expect(calls.filter((call) => call.startsWith("GET"))).toHaveLength(1);
    expect(calls.filter((call) => call.startsWith("POST"))).toHaveLength(1);
  });

  it("resumes realtime with since and returns resync on 410", async () => {
    const urls: string[] = [];
    const events: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("since=4")) {
        return jsonResponse(410, { error: "gone", hint: "resync", floor: 9 });
      }
      return sseResponse(['event: jord.change\ndata: {"seq":3,"table":"notes"}\n\n']);
    };
    const client = new JordClient({
      baseUrl: "http://jord.local",
      fetch: fetchImpl,
      tokens: { accessToken: "access-1", refreshToken: null },
    });

    const live = await client.subscribe({
      table: "notes",
      since: 2,
      onEvent: (message) => events.push(message.event),
    });
    expect(live.status).toBe("live");
    expect(events).toEqual(["jord.change"]);
    expect(urls[0]).toBe("http://jord.local/realtime?table=notes&since=2");

    const expired = await client.subscribe({
      table: "notes",
      since: 4,
      onEvent: () => events.push("should-not-run"),
    });
    expect(expired).toEqual({
      status: "resync",
      body: { error: "gone", hint: "resync", floor: 9 },
    });
    expect(events).toEqual(["jord.change"]);
  });

  it("does not depend on @altr/jord", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@altr/jord"]).toBeUndefined();
    expect(pkg.devDependencies?.["@altr/jord"]).toBeUndefined();
  });

  it("reads preference-applied without an engine import", async () => {
    const result = await tableFetch(
      async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "preference-applied": "count=planned" },
        }),
      "http://jord.local/api/v1/notes",
    );
    expect(result).toEqual({
      status: 200,
      body: { data: [] },
      preferApplied: "count=planned",
    });
  });
});
