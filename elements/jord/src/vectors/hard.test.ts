import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "./f32.js";
import {
  libsqlProbeOk,
  padEmbedding,
  quoteShadowIdent,
  scoreFromCosineDistance,
  shadowIndexDdl,
  shadowTableDdl,
  toVectorLiteral,
  useLibsqlAnn,
} from "./hard.js";

describe("hard vector helpers", () => {
  it("treats a finite probe distance as libSQL vectors", () => {
    expect(libsqlProbeOk(0)).toBe(true);
    expect(libsqlProbeOk("0")).toBe(true);
    expect(libsqlProbeOk("nope")).toBe(false);
  });

  it("zero-pads without changing cosine", () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0];
    const ap = padEmbedding(a);
    const bp = padEmbedding(b);
    expect(ap).toHaveLength(1536);
    expect(cosineSimilarity(ap, ap)).toBeCloseTo(cosineSimilarity(a, a));
    expect(cosineSimilarity(ap, bp)).toBeCloseTo(0);
  });

  it("quotes shadow idents that contain hyphens", () => {
    expect(quoteShadowIdent("jord_vix_lab-notes")).toBe('"jord_vix_lab-notes"');
    expect(shadowTableDdl("lab-notes", 8)).toContain("F32_BLOB(8)");
    expect(shadowIndexDdl("lab-notes")).toContain('"jord_vix_lab__notes_idx"');
    expect(shadowIndexDdl("lab-notes")).not.toContain("lab-notes_idx");
    expect(() => quoteShadowIdent("jord_embeddings")).toThrow();
    expect(() => shadowTableDdl("lab", 3)).toThrow();
  });

  it("builds a numeric pgvector literal", () => {
    expect(toVectorLiteral([1, 0, 0.5])).toBe("[1,0,0.5]");
    expect(scoreFromCosineDistance(0)).toBe(1);
    expect(scoreFromCosineDistance(1)).toBe(0);
    expect(useLibsqlAnn(200)).toBe(false);
    expect(useLibsqlAnn(201)).toBe(true);
  });
});
