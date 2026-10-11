import { describe, expect, it } from "vitest";

import { computePosition } from "./position";

describe("computePosition", () => {
  it("flips from bottom to top when overflowing", () => {
    const result = computePosition({
      anchor: { top: 700, left: 100, bottom: 740, right: 200, width: 100, height: 40, x: 100, y: 700, toJSON: () => ({}) },
      floating: { width: 120, height: 80 },
      side: "bottom",
      viewport: { width: 800, height: 760 },
      offset: 8,
      padding: 8,
    });
    expect(result.side).toBe("top");
  });
});
