/**
 * Control-plane + Scratchpad tables shared across dialects.
 * Used for migrate parity checks (S8).
 */
export const JORD_TABLE_NAMES = [
  "records",
  "jord_jobs",
  "jord_job_runs",
  "jord_functions",
  "jord_custom_apis",
  "jord_policies",
  "jord_triggers",
  "jord_blobs",
  "jord_embeddings",
] as const;

export type JordTableName = (typeof JORD_TABLE_NAMES)[number];
