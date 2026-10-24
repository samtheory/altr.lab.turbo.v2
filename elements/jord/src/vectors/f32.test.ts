import { describe, expect, it } from "vitest";

import {
  cosineSimilarity,
  packF32,
  unpackF32,
  validateEmbeddingArray,
} from "./f32.js";

describe("f32 vectors", () => {
  it("round-trips pack/unpack", () => {
    const src = [0.1, -0.5, 2, 0];
    expect(unpackF32(packF32(src)).map((n) => Number(n.toFixed(5)))).toEqual(
      src.map((n) => Number(n.toFixed(5))),
    );
  });

  it("ranks identical vector highest", () => {
    const q = [1, 0, 0, 0, 0, 0, 0, 0];
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0];
    expect(cosineSimilarity(q, a)).toBeGreaterThan(cosineSimilarity(q, b));
  });

  it("rejects bad embeddings", () => {
    expect(validateEmbeddingArray([]).ok).toBe(false);
    expect(validateEmbeddingArray([1, 2, 3]).ok).toBe(false);
    expect(validateEmbeddingArray(Array(8).fill(1)).ok).toBe(true);
  });
});
