import type { VectorSearchHit } from "../port.js";
import { clampSearchLimit, cosineSimilarity, unpackF32 } from "./f32.js";

export type EmbeddingRowForSearch = {
  id: string;
  refId: string | null;
  dims: number;
  embedding: Buffer | Uint8Array;
  metadata: string | null;
};

export function rankByCosine(
  query: number[],
  rows: EmbeddingRowForSearch[],
  limit?: number,
): VectorSearchHit[] {
  const top = clampSearchLimit(limit);
  const scored: VectorSearchHit[] = [];
  for (const row of rows) {
    if (row.dims !== query.length) continue;
    let values: number[];
    try {
      values = unpackF32(row.embedding);
    } catch {
      continue;
    }
    scored.push({
      id: row.id,
      refId: row.refId,
      score: cosineSimilarity(query, values),
      metadata: row.metadata,
      dims: row.dims,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, top);
}
