import { describe, expect, it, vi } from "vitest";

import { composeRefs } from "./compose-refs";

describe("composeRefs", () => {
  it("assigns object refs and calls callback refs", () => {
    const objectRef = { current: null as HTMLElement | null };
    const callback = vi.fn();
    const composed = composeRefs(objectRef, callback);
    const node = document.createElement("div");
    composed(node);
    expect(objectRef.current).toBe(node);
    expect(callback).toHaveBeenCalledWith(node);
  });
});
