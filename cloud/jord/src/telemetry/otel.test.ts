import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import type { HttpRequestLog } from "../http/request-log.js";
import { createWriteQueue } from "../queue.js";
import { createLocalStorageAdapter } from "../storage/local.js";
import {
  initTelemetry,
  instrumentStorage,
  resolveOtelEnabled,
  shutdownTelemetry,
} from "./index.js";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const admin = {
  authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
  "content-type": "application/json",
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

beforeEach(async () => {
  await shutdownTelemetry();
});

afterEach(async () => {
  await shutdownTelemetry();
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rmTempDir(dir);
  }
});

describe("OTel env (S0039)", () => {
  it("is off by default; 1/true/on enable", () => {
    expect(resolveOtelEnabled({})).toBe(false);
    expect(resolveOtelEnabled({ JORD_OTEL_ENABLED: "0" })).toBe(false);
    expect(resolveOtelEnabled({ JORD_OTEL_ENABLED: "1" })).toBe(true);
    expect(resolveOtelEnabled({ JORD_OTEL_ENABLED: "true" })).toBe(true);
    expect(resolveOtelEnabled({ JORD_OTEL_ENABLED: "on" })).toBe(true);
  });
});

describe("OTel span tree (S0039)", () => {
  it("one SQL write request yields jord.http → jord.write → jord.sql; storage span has no secrets", async () => {
    const exporter = new InMemorySpanExporter();
    initTelemetry({
      spanExporter: exporter,
      httpAutoInstrument: false,
      env: { JORD_OTEL_ENABLED: "1" },
    });

    const dir = await mkdtemp(path.join(tmpdir(), "jord-otel-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const lines: HttpRequestLog[] = [];
    const storage = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: "otel-test-hmac-secret",
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage,
      blobSigningSecret: "otel-test-hmac-secret",
      httpLog: (line) => lines.push(line),
    });

    try {
      const res = await app.request("/sql/execute", {
        method: "POST",
        headers: {
          ...admin,
          "x-request-id": "req-otel-s0039",
        },
        body: JSON.stringify({
          sql: "INSERT INTO records (id, bucket, body, version, created_at, updated_at) VALUES ('otel-1','lab','{}',1,1,1)",
          readOnly: false,
        }),
      });
      expect(res.status).toBe(200);

      // Storage span via the same wrapper createJordApp uses (no PII attrs).
      await instrumentStorage(storage).putObject(
        "lab",
        "otel.bin",
        new Uint8Array([1, 2, 3]),
        "application/octet-stream",
      );

      // Allow SimpleSpanProcessor to finish.
      await new Promise((r) => setTimeout(r, 20));

      const spans = exporter.getFinishedSpans();
      const names = spans.map((s) => s.name);
      expect(names).toContain("jord.http");
      expect(names).toContain("jord.write");
      expect(names).toContain("jord.sql");
      expect(names).toContain("jord.storage");

      const http = spans.find(
        (s) =>
          s.name === "jord.http" &&
          s.attributes["http.route"] === "/sql/execute",
      );
      expect(http).toBeTruthy();
      expect(http!.attributes["jord.request_id"]).toBe("req-otel-s0039");

      const write = spans.find((s) => s.name === "jord.write");
      expect(write).toBeTruthy();
      expect(write!.attributes["jord.write.kind"]).toBe("sql.execute");
      expect(typeof write!.attributes["jord.write.wait_ms"]).toBe("number");
      expect(write!.parentSpanContext?.spanId).toBe(http!.spanContext().spanId);

      const sql = spans.find((s) => s.name === "jord.sql");
      expect(sql).toBeTruthy();
      expect(sql!.attributes["jord.sql.kind"]).toBe("execute");
      // Nested under write (which is under http).
      expect(sql!.parentSpanContext?.spanId).toBe(write!.spanContext().spanId);

      const attrKeys = spans.flatMap((s) => Object.keys(s.attributes));
      expect(attrKeys).not.toContain("db.statement");
      expect(attrKeys).not.toContain("db.query.text");
      expect(attrKeys.some((k) => /param|sql\.text|statement/i.test(k))).toBe(
        false,
      );

      const dumped = JSON.stringify(
        spans.map((s) => ({ name: s.name, attributes: s.attributes })),
      );
      expect(dumped).not.toMatch(/INSERT INTO/i);
      expect(dumped).not.toContain("otel-test-hmac-secret");
      expect(dumped).not.toContain(AUTH.secret);
      expect(dumped).not.toContain(AUTH.jwtSecret);

      expect(lines.length).toBeGreaterThanOrEqual(1);
      const sqlLog = lines.find((l) => l.path === "/sql/execute");
      expect(sqlLog?.requestId).toBe("req-otel-s0039");
      expect(sqlLog?.traceId).toBe(http!.spanContext().traceId);
    } finally {
      await jord.close();
    }
  });

  it("does not start when disabled — suite stays noop", async () => {
    const handle = initTelemetry({
      env: {},
      httpAutoInstrument: false,
    });
    expect(handle.enabled).toBe(false);

    const exporter = new InMemorySpanExporter();
    // Still off without forced exporter / env.
    const processor = new SimpleSpanProcessor(exporter);
    void processor;

    const dir = await mkdtemp(path.join(tmpdir(), "jord-otel-off-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
    });
    try {
      const res = await app.request("/api/v1/records", {
        headers: { Authorization: `Bearer ${AUTH.secret}` },
      });
      expect(res.status).toBe(200);
      expect(exporter.getFinishedSpans()).toHaveLength(0);
    } finally {
      await jord.close();
    }
  });
});
