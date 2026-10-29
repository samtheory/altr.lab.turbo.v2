import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/index.js";
import { createWriteQueue } from "../queue.js";
import {
  isHttpLogSkippedPath,
  resolveHttpLogEnabled,
  resolveRequestId,
  type HttpRequestLog,
} from "./request-log.js";

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

describe("request-log helpers", () => {
  it("skips /health and /health/*", () => {
    expect(isHttpLogSkippedPath("/health")).toBe(true);
    expect(isHttpLogSkippedPath("/health/live")).toBe(true);
    expect(isHttpLogSkippedPath("/health/ready")).toBe(true);
    expect(isHttpLogSkippedPath("/api/v1/records")).toBe(false);
  });

  it("JORD_HTTP_LOG=0 disables; default is on", () => {
    expect(resolveHttpLogEnabled({})).toBe(true);
    expect(resolveHttpLogEnabled({ JORD_HTTP_LOG: "0" })).toBe(false);
    expect(resolveHttpLogEnabled({ JORD_HTTP_LOG: "false" })).toBe(false);
    expect(resolveHttpLogEnabled({ JORD_HTTP_LOG: "1" })).toBe(true);
  });

  it("reuses a short valid x-request-id; otherwise mints UUID", () => {
    expect(resolveRequestId("abc-123")).toBe("abc-123");
    expect(resolveRequestId("has spaces")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(resolveRequestId("x".repeat(65))).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("structured JSON request logs (S0035)", () => {
  it("emits one parseable JSON line with expected keys; no Authorization echo", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-httplog-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const lines: HttpRequestLog[] = [];
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: TEST_AUTH,
      httpLog: (line) => lines.push(line),
    });

    try {
      const res = await app.request("/api/v1/records", {
        headers: {
          Authorization: `Bearer ${TEST_AUTH.secret}`,
          "x-request-id": "req-s0035-1",
        },
      });
      expect(res.status).toBe(200);

      expect(lines).toHaveLength(1);
      const line = lines[0]!;
      expect(line).toMatchObject({
        level: "info",
        msg: "http",
        requestId: "req-s0035-1",
        method: "GET",
        path: "/api/v1/records",
        status: 200,
        principal: "service",
      });
      expect(typeof line.ms).toBe("number");
      expect(line.ms).toBeGreaterThanOrEqual(0);

      const serialized = JSON.stringify(line);
      expect(serialized).not.toContain("Authorization");
      expect(serialized).not.toContain("Bearer");
      expect(serialized).not.toContain(TEST_AUTH.secret);
    } finally {
      await jord.close();
    }
  });

  it("does not log /health/* probes", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-httplog-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const lines: HttpRequestLog[] = [];
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: TEST_AUTH,
      httpLog: (line) => lines.push(line),
    });

    try {
      expect((await app.request("/health/live")).status).toBe(200);
      expect((await app.request("/health/ready")).status).toBe(200);
      expect((await app.request("/health")).status).toBe(200);
      expect(lines).toHaveLength(0);
    } finally {
      await jord.close();
    }
  });

  it("JORD_HTTP_LOG=0 disables emission", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-httplog-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const lines: HttpRequestLog[] = [];
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: TEST_AUTH,
      env: { JORD_HTTP_LOG: "0" },
      httpLog: (line) => lines.push(line),
    });

    try {
      const res = await app.request("/api/v1/records", {
        headers: { Authorization: `Bearer ${TEST_AUTH.secret}` },
      });
      expect(res.status).toBe(200);
      expect(lines).toHaveLength(0);
    } finally {
      await jord.close();
    }
  });

  it("4xx stays info; 5xx is error level", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-httplog-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const lines: HttpRequestLog[] = [];
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: TEST_AUTH,
      httpLog: (line) => lines.push(line),
    });

    try {
      const unauthorized = await app.request("/api/v1/records");
      expect(unauthorized.status).toBe(401);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        level: "info",
        status: 401,
        principal: "none",
        msg: "http",
      });

      const serialized = JSON.stringify(lines[0]);
      expect(serialized).not.toContain("Authorization");
    } finally {
      await jord.close();
    }
  });
});
