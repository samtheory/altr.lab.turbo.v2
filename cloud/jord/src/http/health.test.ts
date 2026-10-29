import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl, type JordDriverPort } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/index.js";
import { LogRing } from "../jobs/index.js";
import { createWriteQueue, type WriteQueue } from "../queue.js";
import { checkReady, healthLiveBody } from "./health.js";

const TEST_AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const temps: string[] = [];

async function rmTempDir(dir: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM") throw err;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
}

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

async function openFileApp() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-health-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const enqueueWrite = createWriteQueue();
  const app = createJordApp({
    jord,
    enqueueWrite,
    auth: TEST_AUTH,
  });
  return { app, jord, enqueueWrite };
}

describe("health probes (S0034)", () => {
  it("GET /health/live returns 200 without touching auth or DB metadata", async () => {
    expect(healthLiveBody()).toEqual({ ok: true });

    const { app, jord } = await openFileApp();
    try {
      const res = await app.request("/health/live");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    } finally {
      await jord.close();
    }
  });

  it("GET /health stays a live+dialect alias for existing callers", async () => {
    const { app, jord } = await openFileApp();
    try {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        ok: true,
        dialect: jord.dialect,
        urlScheme: jord.urlScheme,
        vectorBackend: jord.vectorBackend,
      });
    } finally {
      await jord.close();
    }
  });

  it("GET /health/ready returns 200 on a healthy fixture", async () => {
    const { app, jord } = await openFileApp();
    try {
      const res = await app.request("/health/ready");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    } finally {
      await jord.close();
    }
  });

  it("GET /health/ready returns 503 when the DB ping fails", async () => {
    const { jord } = await openFileApp();
    const broken = new Proxy(jord, {
      get(target, prop, receiver) {
        if (prop === "query") {
          return async () => {
            throw new Error("simulated db down");
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as JordDriverPort;
    const brokenApp = createJordApp({
      jord: broken,
      enqueueWrite: createWriteQueue(),
      auth: TEST_AUTH,
      logs: new LogRing(),
    });
    try {
      const res = await brokenApp.request("/health/ready");
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.reasons.db).toMatch(/simulated db down/);
      expect(body.reasons.migrations).toMatch(/simulated db down/);
    } finally {
      await jord.close();
    }
  });

  it("checkReady reports a non-finite write queue", async () => {
    const { jord } = await openFileApp();
    try {
      const badQueue = Object.assign(
        async <T>(fn: () => Promise<T>) => fn(),
        {
          drain: async () => undefined,
          pending: () => Number.NaN,
        },
      ) as WriteQueue;
      const result = await checkReady({ jord, enqueueWrite: badQueue });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reasons.queue).toMatch(/finite/i);
      }
    } finally {
      await jord.close();
    }
  });
});
