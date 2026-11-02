/** Pure helpers for table row ops / bulk delete (S0057). */

export type Cell = string | number | boolean | null;

export type RowColumnMeta = {
  name: string;
  type: string;
  pk: boolean;
  notnull?: boolean;
  dflt_value?: string | null;
  settings?: {
    idStrategy?: { kind?: string } | null;
    nullable?: boolean;
  };
};

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 50;
export const BULK_DELETE_CHUNK = 25;

export function clampPageSize(raw: number): PageSize {
  if (raw === 25 || raw === 50 || raw === 100) return raw;
  return DEFAULT_PAGE_SIZE;
}

export function parseCell(type: string, raw: string): Cell {
  if (raw === "") return null;
  const kind = type.toUpperCase();
  if (kind.includes("INT")) {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      throw new Error(`${type} needs an integer`);
    }
    return n;
  }
  if (
    kind.includes("REAL") ||
    kind.includes("FLOA") ||
    kind.includes("DOUBLE")
  ) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error(`${type} needs a number`);
    }
    return n;
  }
  return raw;
}

export function isGeneratedIdColumn(col: RowColumnMeta): boolean {
  const kind = col.settings?.idStrategy?.kind;
  if (!kind || kind === "none") return false;
  return true;
}

/** Values for INSERT: omit generated / empty optional fields. */
export function buildInsertValues(
  columns: RowColumnMeta[],
  draft: Record<string, string>,
): Record<string, Cell> {
  const values: Record<string, Cell> = {};
  for (const col of columns) {
    const raw = draft[col.name] ?? "";
    if (raw === "") {
      if (isGeneratedIdColumn(col)) continue;
      if (col.pk && !isGeneratedIdColumn(col)) {
        throw new Error(`Primary key ${col.name} is required`);
      }
      continue;
    }
    values[col.name] = parseCell(col.type, raw);
  }
  return values;
}

/** Prefill insert draft from an existing row; clear PK when generated or always blank PK for fresh insert. */
export function draftFromRow(
  columns: RowColumnMeta[],
  row: Record<string, Cell>,
  opts?: { clearPk?: boolean },
): Record<string, string> {
  const clearPk = opts?.clearPk !== false;
  const next: Record<string, string> = {};
  for (const col of columns) {
    if (clearPk && col.pk) {
      next[col.name] = "";
      continue;
    }
    const value = row[col.name];
    next[col.name] = value == null ? "" : String(value);
  }
  return next;
}

export function defaultDraftFromColumns(
  columns: RowColumnMeta[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const col of columns) {
    if (col.dflt_value != null && col.dflt_value !== "") {
      // SQLite-style defaults may be quoted literals.
      const raw = col.dflt_value;
      next[col.name] =
        (raw.startsWith("'") && raw.endsWith("'")) ||
        (raw.startsWith('"') && raw.endsWith('"'))
          ? raw.slice(1, -1)
          : raw;
    } else {
      next[col.name] = "";
    }
  }
  return next;
}

export function chunkIds(ids: string[], size = BULK_DELETE_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

export type BulkDeleteFailure = { pk: string; message: string };

export type BulkDeleteReport = {
  deleted: string[];
  failed: BulkDeleteFailure[];
};

export async function bulkDeleteRows(input: {
  ids: string[];
  deleteOne: (pk: string) => Promise<void>;
  chunkSize?: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<BulkDeleteReport> {
  const chunks = chunkIds(input.ids, input.chunkSize ?? BULK_DELETE_CHUNK);
  const deleted: string[] = [];
  const failed: BulkDeleteFailure[] = [];
  let done = 0;
  const total = input.ids.length;
  for (const chunk of chunks) {
    for (const pk of chunk) {
      try {
        await input.deleteOne(pk);
        deleted.push(pk);
      } catch (err) {
        failed.push({
          pk,
          message: err instanceof Error ? err.message : "Delete failed",
        });
      }
      done += 1;
      input.onProgress?.(done, total);
    }
  }
  return { deleted, failed };
}

export function confirmDeleteLabel(count: number, samplePk?: string): string {
  if (count === 1) {
    return samplePk
      ? `Delete row ${samplePk}? This cannot be undone.`
      : "Delete this row? This cannot be undone.";
  }
  return `Delete ${count} selected rows? This cannot be undone.`;
}

export function hasMoreRows(input: {
  loaded: number;
  total: number | null;
  lastFetchCount: number;
  pageSize: number;
}): boolean {
  if (input.total != null) return input.loaded < input.total;
  return input.lastFetchCount >= input.pageSize;
}

export function jumpToEndOffset(total: number, pageSize: number): number {
  if (total <= 0) return 0;
  return Math.max(0, total - pageSize);
}
