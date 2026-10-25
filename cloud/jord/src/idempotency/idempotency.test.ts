import { describe, expect, it } from "vitest";

import { hashBodyText } from "./middleware.js";
import { createIdempotencyStore } from "./store.js";

describe("idempotency store", () => {
  it("miss then remember then hit returns same status/body", () => {
    const store = createIdempotencyStore(60_000);
    const key = "req-1";
    const principal = "user:alice";
    const bodyHash = hashBodyText('{"x":1}');

    expect(store.lookup(key, principal, bodyHash)).toEqual({ kind: "miss" });

    store.remember(key, principal, bodyHash, {
      status: 201,
      body: { id: "abc" },
    });

    expect(store.lookup(key, principal, bodyHash)).toEqual({
      kind: "hit",
      status: 201,
      body: { id: "abc" },
    });
  });

  it("same key different body → conflict", () => {
    const store = createIdempotencyStore(60_000);
    const key = "req-2";
    const principal = "operator:admin";
    const firstHash = hashBodyText('{"a":1}');
    const secondHash = hashBodyText('{"a":2}');

    store.remember(key, principal, firstHash, {
      status: 200,
      body: { ok: true },
    });

    expect(store.lookup(key, principal, secondHash)).toEqual({
      kind: "conflict",
    });
  });

  it("TTL expiry: remember then miss after TTL", async () => {
    const store = createIdempotencyStore(10);
    const key = "req-3";
    const principal = "user:bob";
    const bodyHash = hashBodyText("");

    store.remember(key, principal, bodyHash, {
      status: 204,
      body: null,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(store.lookup(key, principal, bodyHash)).toEqual({ kind: "miss" });
  });
});
