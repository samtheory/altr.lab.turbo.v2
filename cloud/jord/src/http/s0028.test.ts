import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";

const temps: string[] = [];

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: "jwt-previous-secret",
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot(env: NodeJS.ProcessEnv = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-s0028-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const enqueueWrite = createWriteQueue();
  const app = createJordApp({
    jord,
    enqueueWrite,
    auth: AUTH,
    env: {
      ...env,
      JORD_CORS_ORIGINS: env.JORD_CORS_ORIGINS ?? "https://studio.example",
    },
  });
  return { app, jord, enqueueWrite, auth: AUTH };
}

function adminHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
    "content-type": "application/json",
    ...extra,
  };
}

describe("S0028 HTTP hardening", () => {
  it("does not set Access-Control-Allow-Origin for a disallowed Origin", async () => {
    const ctx = await boot();
    try {
      const res = await ctx.app.request("/health", {
        headers: { Origin: "https://evil.example" },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    } finally {
      await ctx.jord.close();
    }
  });

  it("sets Access-Control-Allow-Origin for an allowed Origin", async () => {
    const ctx = await boot();
    try {
      const res = await ctx.app.request("/health", {
        headers: { Origin: "https://studio.example" },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://studio.example",
      );
    } finally {
      await ctx.jord.close();
    }
  });

  it("returns 413 when Content-Length exceeds the JSON body cap", async () => {
    const ctx = await boot({ JORD_MAX_JSON_BYTES: "64" });
    try {
      const res = await ctx.app.request("/records", {
        method: "POST",
        headers: {
          ...adminHeaders(),
          "content-length": "128",
        },
        body: JSON.stringify({
          bucket: "lab",
          body: "x".repeat(100),
        }),
      });
      expect(res.status).toBe(413);
      expect(await res.json()).toMatchObject({ error: "payload_too_large" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("drains the write queue so a queued write finishes before drain resolves", async () => {
    const ctx = await boot();
    try {
      let finished = false;
      const write = ctx.enqueueWrite(async () => {
        await new Promise((r) => setTimeout(r, 40));
        finished = true;
        return "ok";
      });
      await ctx.enqueueWrite.drain();
      expect(finished).toBe(true);
      expect(await write).toBe("ok");
      expect(ctx.enqueueWrite.pending()).toBe(0);
    } finally {
      await ctx.jord.close();
    }
  });

  it("replays Idempotency-Key writes and conflicts on a different body", async () => {
    const ctx = await boot();
    try {
      const body = JSON.stringify({ bucket: "lab", body: "{\"n\":1}" });
      const first = await ctx.app.request("/records", {
        method: "POST",
        headers: adminHeaders({ "Idempotency-Key": "k1" }),
        body,
      });
      expect(first.status).toBe(201);
      const firstJson = await first.json();

      const replay = await ctx.app.request("/records", {
        method: "POST",
        headers: adminHeaders({ "Idempotency-Key": "k1" }),
        body,
      });
      expect(replay.status).toBe(201);
      expect(await replay.json()).toEqual(firstJson);

      const conflict = await ctx.app.request("/records", {
        method: "POST",
        headers: adminHeaders({ "Idempotency-Key": "k1" }),
        body: JSON.stringify({ bucket: "lab", body: "{\"n\":2}" }),
      });
      expect(conflict.status).toBe(409);
      expect(await conflict.json()).toMatchObject({
        error: "idempotency_conflict",
      });
    } finally {
      await ctx.jord.close();
    }
  });
});
