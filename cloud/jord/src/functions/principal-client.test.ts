import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";

import { LogRing } from "../jobs/log-ring.js";
import { FunctionWorkerPool, closeAllFunctionPools } from "./pool.js";
import { redactConsoleLine, boundConsoleLines } from "./invocation-log.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");

const temps: Array<{ close: () => Promise<void> }> = [];
const pools: FunctionWorkerPool[] = [];

afterEach(async () => {
  while (pools.length > 0) {
    const p = pools.pop();
    if (p) await p.close();
  }
  await closeAllFunctionPools();
  while (temps.length > 0) {
    const t = temps.pop();
    if (t) await t.close();
  }
});

async function openDb() {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const dir = await mkdtemp(path.join(tmpdir(), "jord-fn-"));
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  temps.push({
    close: async () => {
      await jord.close();
      // Windows libSQL can keep a short lock after close.
      for (let i = 0; i < 8; i++) {
        try {
          await rm(dir, { recursive: true, force: true });
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 40));
        }
      }
    },
  });
  return jord;
}

describe("invocation-log redaction", () => {
  it("redacts secret-shaped console lines", () => {
    expect(redactConsoleLine("JORD_TEST_SECRET=super-secret-value")).toContain(
      "[REDACTED]",
    );
    expect(redactConsoleLine("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")).toContain(
      "[REDACTED]",
    );
    expect(boundConsoleLines(["a", "b"]).length).toBe(2);
  });
});

describe("principal-bound client + logs (S0091)", () => {
  it("denies a limited user reading records (default deny / no god mode)", async () => {
    const jord = await openDb();
    await jord.insertRecord({ bucket: "lab", body: "secret-row" });

    const logs = new LogRing(50);
    const p = new FunctionWorkerPool({
      moduleRoots: [FIXTURES],
      maxWorkers: 1,
      timeoutMs: 5_000,
      envAllowlist: [],
    });
    pools.push(p);

    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "with-jord-select.cjs"),
      principal: { subject: "user", uid: "u-limited", role: "readonly" },
      rpc: {
        jord,
        enqueueWrite: (fn) => fn(),
      },
      logs,
      functionSlug: "read-lab",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("policy_denied");
    expect(res.status).toBe(403);

    const rows = logs.list(10, "function");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.meta).toMatchObject({
      kind: "function_invoke",
      status: "denied",
      functionSlug: "read-lab",
    });
    expect(JSON.stringify(rows[0]?.meta)).not.toMatch(/secret-row/);
  });

  it("allows a service principal to select through the same client", async () => {
    const jord = await openDb();
    await jord.insertRecord({ bucket: "lab", body: "ok" });

    const p = new FunctionWorkerPool({
      moduleRoots: [FIXTURES],
      maxWorkers: 1,
      timeoutMs: 5_000,
    });
    pools.push(p);

    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "with-jord-select.cjs"),
      principal: { subject: "service", uid: null, role: "admin" },
      rpc: {
        jord,
        enqueueWrite: (fn) => fn(),
      },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result).toMatchObject({
      bucket: "lab",
      count: 1,
    });
  });

  it("writes an invocation log with redacted console capture", async () => {
    const logs = new LogRing(50);
    const p = new FunctionWorkerPool({
      moduleRoots: [FIXTURES],
      maxWorkers: 1,
      timeoutMs: 5_000,
    });
    pools.push(p);

    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "with-console.cjs"),
      input: { n: 1 },
      principal: { subject: "operator", uid: "op1", role: "admin" },
      logs,
      functionSlug: "noisy",
    });

    expect(res.ok).toBe(true);
    const rows = logs.list(5, "function");
    expect(rows).toHaveLength(1);
    const meta = rows[0]?.meta as {
      status: string;
      console: string[];
      durationMs: number;
    };
    expect(meta.status).toBe("ok");
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(meta.console.some((l) => l.includes("start invoke"))).toBe(true);
    expect(JSON.stringify(meta.console)).not.toMatch(/super-secret-value/);
    expect(JSON.stringify(meta.console)).toMatch(/\[REDACTED/);
  });

  it("exposes no admin/SQL ops on the RPC allowlist", async () => {
    const { isFunctionRpcOp } = await import("./principal-client.js");
    expect(isFunctionRpcOp("admin.sql")).toBe(false);
    expect(isFunctionRpcOp("table.select")).toBe(true);
    expect(isFunctionRpcOp("blob.sign")).toBe(true);
  });
});
