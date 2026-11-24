import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { FunctionWorkerPool, closeAllFunctionPools } from "./pool.js";
import { buildWorkerEnv, clampPoolConfig } from "./pool-limits.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");

const pools: FunctionWorkerPool[] = [];

function pool(partial: ConstructorParameters<typeof FunctionWorkerPool>[0] = {}) {
  const p = new FunctionWorkerPool({
    moduleRoots: [FIXTURES],
    maxWorkers: 1,
    maxQueued: 4,
    timeoutMs: 2_000,
    maxOldGenerationSizeMb: 32,
    recycleAfterInvocations: 100,
    envAllowlist: ["JORD_FUNC_ALLOW"],
    ...partial,
  });
  pools.push(p);
  return p;
}

afterEach(async () => {
  while (pools.length > 0) {
    const p = pools.pop();
    if (p) await p.close();
  }
  await closeAllFunctionPools();
  delete process.env.JORD_TEST_SECRET;
  delete process.env.JORD_FUNC_ALLOW;
});

describe("pool-limits", () => {
  it("clamps timeout and memory to hard caps", () => {
    const c = clampPoolConfig({ timeoutMs: 999_999, maxOldGenerationSizeMb: 9_999 });
    expect(c.timeoutMs).toBe(60_000);
    expect(c.maxOldGenerationSizeMb).toBe(512);
  });

  it("buildWorkerEnv copies allowlist and omits secrets", () => {
    const env = buildWorkerEnv(["JORD_FUNC_ALLOW"], {
      JORD_FUNC_ALLOW: "yes",
      JORD_TEST_SECRET: "s3cr3t",
      PATH: process.env.PATH ?? "/usr/bin",
      SYSTEMROOT: process.env.SYSTEMROOT,
    });
    expect(env.JORD_FUNC_ALLOW).toBe("yes");
    expect(env.JORD_TEST_SECRET).toBeUndefined();
  });
});

describe("FunctionWorkerPool (S0090)", () => {
  it("runs a user module and returns JSON", async () => {
    const p = pool();
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "echo.cjs"),
      input: { hello: "jord" },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result).toEqual(
      expect.objectContaining({ echoed: { hello: "jord" } }),
    );
  });

  it("kills an infinite loop at the configured timeout", async () => {
    const p = pool({ timeoutMs: 400 });
    const started = Date.now();
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "loop.cjs"),
      timeoutMs: 400,
    });
    const elapsed = Date.now() - started;
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("function_timeout");
    expect(res.status).toBe(504);
    expect(elapsed).toBeGreaterThanOrEqual(350);
    expect(elapsed).toBeLessThan(5_000);
  }, 15_000);

  it("enforces the memory cap on an allocation bomb", async () => {
    const p = pool({
      maxOldGenerationSizeMb: 16,
      timeoutMs: 10_000,
    });
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "oom.cjs"),
      timeoutMs: 10_000,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    // OOM may surface as function_oom or function_crashed depending on V8/OS;
    // either way the worker must die and not hang the pool.
    expect(["function_oom", "function_crashed", "function_timeout"]).toContain(
      res.code,
    );
  }, 30_000);

  it("recovers and serves the next call after a timeout kill", async () => {
    const p = pool({ timeoutMs: 400, maxWorkers: 1 });
    const timedOut = await p.invoke({
      modulePath: path.join(FIXTURES, "loop.cjs"),
      timeoutMs: 400,
    });
    expect(timedOut.ok).toBe(false);
    if (!timedOut.ok) expect(timedOut.code).toBe("function_timeout");

    const next = await p.invoke({
      modulePath: path.join(FIXTURES, "echo.cjs"),
      input: { after: "timeout" },
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.result).toEqual(
      expect.objectContaining({ echoed: { after: "timeout" } }),
    );
  }, 20_000);

  it("does not expose process.env secrets to the worker", async () => {
    process.env.JORD_TEST_SECRET = "must-not-leak";
    process.env.JORD_FUNC_ALLOW = "visible";
    const p = pool({ envAllowlist: ["JORD_FUNC_ALLOW"] });
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "env-probe.cjs"),
      input: { key: "JORD_TEST_SECRET" },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result).toEqual({
      has: false,
      value: null,
      allowlisted: "visible",
    });
  });

  it("denies modules outside moduleRoots", async () => {
    const p = pool({ moduleRoots: [FIXTURES] });
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "..", "runner.ts"),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("function_module_denied");
  });

  it("maps a thrown handler error to function_crashed", async () => {
    const p = pool();
    const res = await p.invoke({
      modulePath: path.join(FIXTURES, "throw.cjs"),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("function_crashed");
    expect(res.message).toMatch(/deliberate handler crash/);
  });

  it("leaves built-in step runner importable (unaffected)", async () => {
    const { runFunction, BUILTIN_STEP_KINDS } = await import("./index.js");
    expect(BUILTIN_STEP_KINDS).toContain("echo");
    expect(typeof runFunction).toBe("function");
  });
});
