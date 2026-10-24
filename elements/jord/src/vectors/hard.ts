import { isValidDims, MAX_EMBEDDING_DIMS } from "./f32.js";
import { isValidVectorNamespace } from "./names.js";

/**
 * `libsql-vector` is libSQL's built-in vector distance / `libsql_vector_idx`
 * (this client has no `sqlite-vec` `vec0` module). `pgvector` is Postgres
 * `vector` + `<=>`. `cosine` is the in-process Float32 fallback.
 * The `VectorBackend` type lives on the driver port.
 */

/** At or below this namespace size, libSQL search is exact `vector_distance_cos`. */
export const LIBSQL_EXACT_MAX_ROWS = 200;

export const LIBSQL_VECTOR_PROBE_SQL =
  "SELECT vector_distance_cos(vector32('[1,0,0,0,0,0,0,0]'), vector32('[1,0,0,0,0,0,0,0]')) AS d";

export function libsqlProbeOk(distance: unknown): boolean {
  const n = typeof distance === "number" ? distance : Number(distance);
  return Number.isFinite(n);
}

export function useLibsqlAnn(rowCount: number): boolean {
  return rowCount > LIBSQL_EXACT_MAX_ROWS;
}

export function shadowTableName(namespace: string): string {
  if (!isValidVectorNamespace(namespace)) {
    throw new Error("invalid vector namespace");
  }
  return `jord_vix_${namespace}`;
}

export function shadowIndexName(namespace: string): string {
  // DiskANN rejects `-` in the index name. `__` does not collide with `_`.
  const encoded = shadowTableName(namespace).replaceAll("-", "__");
  return `${encoded}_idx`;
}

/** Quote a shadow table or index ident. Namespace slugs may contain `-`. */
export function quoteShadowIdent(name: string): string {
  const index = name.endsWith("_idx");
  const rest = index ? name.slice(0, -"_idx".length) : name;
  const prefix = "jord_vix_";
  if (!rest.startsWith(prefix)) {
    throw new Error("invalid shadow ident");
  }
  const namespace = rest.slice(prefix.length);
  if (!isValidVectorNamespace(namespace)) {
    throw new Error("invalid shadow ident");
  }
  if (`jord_vix_${namespace}${index ? "_idx" : ""}` !== name) {
    throw new Error("invalid shadow ident");
  }
  return `"${name}"`;
}

export function shadowTableDdl(namespace: string, dims: number): string {
  if (!isValidDims(dims)) {
    throw new Error("invalid vector dims");
  }
  const table = quoteShadowIdent(shadowTableName(namespace));
  return `CREATE TABLE IF NOT EXISTS ${table} (
    id TEXT PRIMARY KEY NOT NULL,
    embedding F32_BLOB(${dims}) NOT NULL
  )`;
}

export function shadowIndexDdl(namespace: string): string {
  const table = quoteShadowIdent(shadowTableName(namespace));
  const index = quoteShadowIdent(shadowIndexName(namespace));
  return `CREATE INDEX IF NOT EXISTS ${index} ON ${table} (libsql_vector_idx(embedding))`;
}

/** Zero-pad to `vector(1536)`. Identical padding preserves cosine. */
export function padEmbedding(
  values: number[],
  dims: number = MAX_EMBEDDING_DIMS,
): number[] {
  if (!isValidDims(dims) || values.length > dims) {
    throw new Error("invalid vector dims");
  }
  if (values.length === dims) return values.slice();
  const out = values.slice();
  while (out.length < dims) out.push(0);
  return out;
}

/** pgvector text literal. Callers must pass finite numbers only. */
export function toVectorLiteral(values: number[]): string {
  let out = "[";
  for (let i = 0; i < values.length; i++) {
    const n = values[i]!;
    if (!Number.isFinite(n)) {
      throw new Error("non-finite vector component");
    }
    if (i > 0) out += ",";
    out += String(n);
  }
  return `${out}]`;
}

export function pgvectorColumnSql(): string {
  return `ALTER TABLE jord_embeddings ADD COLUMN IF NOT EXISTS embedding_vec vector(${MAX_EMBEDDING_DIMS})`;
}

export const PGVECTOR_HNSW_SQL = `CREATE INDEX IF NOT EXISTS jord_embeddings_vec_hnsw
  ON jord_embeddings USING hnsw (embedding_vec vector_cosine_ops)`;

/** Cosine similarity from a cosine-distance (`<=>` / `vector_distance_cos`). */
export function scoreFromCosineDistance(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return 1 - distance;
}
