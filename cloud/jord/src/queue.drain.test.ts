import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWriteQueue,
  resetLibsqlWriteConcurrencyWarningForTests,
  resolveWriteConcurrency,
} from "./queue.js";

afterEach(() => {
  resetLibsqlWriteConcurrencyWarningForTests();
  vi.restoreAllMocks();
});

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createWriteQueue drain", () => {
  it("waits for in-flight writes and pending returns to zero", async () => {
    const queue = createWriteQueue();
    let writeDone = false;

    const writePromise = queue(() =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          writeDone = true;
          resolve();
        }, 50);
      }),
    );

    expect(queue.pending()).toBe(1);
    expect(queue.inFlight()).toBe(1);

    const drainPromise = queue.drain();
    expect(writeDone).toBe(false);

    await Promise.all([writePromise, drainPromise]);

    expect(writeDone).toBe(true);
    expect(queue.pending()).toBe(0);
    expect(queue.inFlight()).toBe(0);
  });
});

describe("createWriteQueue concurrency (S0038)", () => {
  it("stays serial at concurrency 1 (default)", async () => {
    const queue = createWriteQueue({ concurrency: 1 });
    let active = 0;
    let maxActive = 0;
    const gate1 = deferred();
    const gate2 = deferred();

    const p1 = queue(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await gate1.promise;
      active--;
    });
    const p2 = queue(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await gate2.promise;
      active--;
    });

    await Promise.resolve();
    expect(queue.inFlight()).toBe(1);
    expect(queue.pending()).toBe(2);
    expect(maxActive).toBe(1);

    gate1.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(queue.inFlight()).toBe(1);

    gate2.resolve();
    await Promise.all([p1, p2]);
    expect(maxActive).toBe(1);
    expect(queue.pending()).toBe(0);
  });

  it("runs two independent jobs concurrently when concurrency is 2", async () => {
    const queue = createWriteQueue({ concurrency: 2 });
    let active = 0;
    let maxActive = 0;
    const gate1 = deferred();
    const gate2 = deferred();

    const p1 = queue(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await gate1.promise;
      active--;
    });
    const p2 = queue(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await gate2.promise;
      active--;
    });

    await Promise.resolve();
    expect(queue.inFlight()).toBe(2);
    expect(queue.pending()).toBe(2);
    expect(maxActive).toBe(2);

    gate1.resolve();
    gate2.resolve();
    await Promise.all([p1, p2]);
    expect(maxActive).toBe(2);
    expect(queue.pending()).toBe(0);
    expect(queue.inFlight()).toBe(0);
  });

  it("runs four jobs concurrently when concurrency is 4", async () => {
    const queue = createWriteQueue({ concurrency: 4 });
    let maxActive = 0;
    let active = 0;
    const gates = Array.from({ length: 4 }, () => deferred());

    const jobs = gates.map((gate) =>
      queue(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await gate.promise;
        active--;
      }),
    );

    await Promise.resolve();
    expect(queue.inFlight()).toBe(4);
    expect(maxActive).toBe(4);

    for (const gate of gates) gate.resolve();
    await Promise.all(jobs);
    expect(maxActive).toBe(4);
  });

  it("continues the next job after a rejected write", async () => {
    const queue = createWriteQueue({ concurrency: 1 });
    const second = deferred<string>();

    const first = queue(async () => {
      throw new Error("boom");
    });
    const follow = queue(async () => {
      second.resolve("ok");
      return "ok";
    });

    await expect(first).rejects.toThrow("boom");
    await expect(follow).resolves.toBe("ok");
    await second.promise;
  });
});

describe("resolveWriteConcurrency (S0038)", () => {
  it("defaults to 1 for postgres when unset", () => {
    expect(resolveWriteConcurrency({}, "postgres")).toBe(1);
    expect(resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "" }, "postgres")).toBe(
      1,
    );
  });

  it("accepts integers 1…8 for postgres", () => {
    expect(
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "4" }, "postgres"),
    ).toBe(4);
    expect(
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "8" }, "postgres"),
    ).toBe(8);
  });

  it("rejects out-of-range or non-integer values loudly", () => {
    expect(() =>
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "0" }, "postgres"),
    ).toThrow(/1 to 8/);
    expect(() =>
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "9" }, "postgres"),
    ).toThrow(/1 to 8/);
    expect(() =>
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "2.5" }, "postgres"),
    ).toThrow(/1 to 8/);
    expect(() =>
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "nope" }, "postgres"),
    ).toThrow(/1 to 8/);
  });

  it("keeps libSQL serial and warns once when env asks for more", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "4" }, "libsql"),
    ).toBe(1);
    expect(
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "4" }, "libsql"),
    ).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/ignored for libSQL/i);
  });

  it("does not warn for libSQL when env is unset or 1", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveWriteConcurrency({}, "libsql")).toBe(1);
    expect(
      resolveWriteConcurrency({ JORD_PG_WRITE_CONCURRENCY: "1" }, "libsql"),
    ).toBe(1);
    expect(warn).not.toHaveBeenCalled();
  });
});
