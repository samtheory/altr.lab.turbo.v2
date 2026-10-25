import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { createCorsMiddleware } from "./cors.js";
import { createJsonBodyLimitMiddleware } from "./body-limit.js";
import { createDataRateLimitMiddleware } from "./data-rate-limit.js";

describe("http hardening", () => {
  it("disallowed Origin has no Access-Control-Allow-Origin on GET /health", async () => {
    const app = new Hono();
    app.use("*", createCorsMiddleware(["https://allowed.example"]));
    app.get("/health", (c) => c.json({ ok: true }));

    const res = await app.request("/health", {
      headers: { Origin: "https://evil.example" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("allowed Origin gets Access-Control-Allow-Origin", async () => {
    const app = new Hono();
    const origin = "https://allowed.example";
    app.use("*", createCorsMiddleware([origin]));
    app.get("/health", (c) => c.json({ ok: true }));

    const res = await app.request("/health", {
      headers: { Origin: origin },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("body over Content-Length returns 413", async () => {
    const maxBytes = 1024;
    const app = new Hono();
    app.use("*", createJsonBodyLimitMiddleware(maxBytes));
    app.post("/records", (c) => c.json({ ok: true }));

    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(maxBytes + 1),
      },
      body: "{}",
    });

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "payload_too_large" });
  });

  it("data rate limit trips after maxHits+1 on /records", async () => {
    const maxHits = 3;
    const app = new Hono();
    app.use(
      "*",
      createDataRateLimitMiddleware({ maxHits, windowMs: 60_000 }),
    );
    app.get("/records", (c) => c.json({ ok: true }));

    const headers = { "x-forwarded-for": "203.0.113.10" };

    for (let i = 0; i < maxHits; i++) {
      const res = await app.request("/records", { headers });
      expect(res.status).toBe(200);
    }

    const blocked = await app.request("/records", { headers });
    expect(blocked.status).toBe(429);
    await expect(blocked.json()).resolves.toEqual({
      error: "too_many_requests",
    });
  });
});
