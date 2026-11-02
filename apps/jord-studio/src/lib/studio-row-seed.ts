import type { Cell } from "@/lib/studio-row-ops";

/** Ephemeral duplicate seeds for the insert inspector (not URL-serialized). */
const seeds = new Map<string, Record<string, Cell>>();

export function putRowSeed(key: string, row: Record<string, Cell>): void {
  seeds.set(key, { ...row });
}

export function takeRowSeed(key: string): Record<string, Cell> | null {
  const row = seeds.get(key) ?? null;
  if (row) seeds.delete(key);
  return row;
}

export function peekRowSeed(key: string): Record<string, Cell> | null {
  return seeds.get(key) ?? null;
}
