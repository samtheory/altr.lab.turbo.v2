/** Pack / unpack Float32 LE embeddings + cosine similarity (fallback when the engine has no vector index). */

export const MIN_EMBEDDING_DIMS = 8;
export const MAX_EMBEDDING_DIMS = 1536;
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;
export const MAX_LIST_EMBEDDINGS = 100;

export function clampSearchLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(limit)));
}

export function isValidDims(dims: number): boolean {
  return (
    Number.isInteger(dims) &&
    dims >= MIN_EMBEDDING_DIMS &&
    dims <= MAX_EMBEDDING_DIMS
  );
}

export function packF32(values: number[]): Buffer {
  const buf = Buffer.allocUnsafe(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    buf.writeFloatLE(values[i]!, i * 4);
  }
  return buf;
}

export function unpackF32(buf: Buffer | Uint8Array): number[] {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (bytes.byteLength % 4 !== 0) {
    throw new Error("embedding blob length must be a multiple of 4");
  }
  const n = bytes.byteLength / 4;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = bytes.readFloatLE(i * 4);
  }
  return out;
}

/** Cosine similarity in [-1, 1]. Returns 0 if either vector has zero magnitude. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function validateEmbeddingArray(
  values: unknown,
): { ok: true; values: number[] } | { ok: false; message: string } {
  if (!Array.isArray(values) || values.length === 0) {
    return { ok: false, message: "embedding must be a non-empty number array" };
  }
  if (!isValidDims(values.length)) {
    return {
      ok: false,
      message: `embedding dims must be ${MIN_EMBEDDING_DIMS}–${MAX_EMBEDDING_DIMS}`,
    };
  }
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { ok: false, message: `embedding[${i}] must be a finite number` };
    }
    out[i] = v;
  }
  return { ok: true, values: out };
}
