import { describe, expect, it } from "vitest";

import { createWriteQueue } from "./queue.js";

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

    const drainPromise = queue.drain();
    expect(writeDone).toBe(false);

    await Promise.all([writePromise, drainPromise]);

    expect(writeDone).toBe(true);
    expect(queue.pending()).toBe(0);
  });
});
