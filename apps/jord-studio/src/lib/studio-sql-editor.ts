/**
 * Studio SQL editor helpers (S0063).
 *
 * Pure functions: dialect mapping, project-scoped completion models, draft
 * persistence, and fetch helpers. No React and no Monaco import so this file is
 * unit-testable under `node --test`.
 */

import type { SqlCompletionModel, SqlDialect } from "@altr/apolyx";

import type { SchemaTable } from "./schema";

export const DEFAULT_SQL = "SELECT 1 AS n;";

/** Maps a Studio project engine to the editor's SQL dialect. */
export function sqlDialectForEngine(engine: string | null | undefined): SqlDialect {
  return engine === "postgres" ? "postgres" : "libsql";
}

export function sqlDialectLabel(dialect: SqlDialect): string {
  return dialect === "postgres" ? "PostgreSQL" : "SQLite (libSQL)";
}

/**
 * Registry engine decides the dialect when the project is a registered target.
 * `env` projects (the primary server DB) are inferred from the schema listing:
 * libSQL always exposes a single `main` schema, Postgres exposes `public`.
 */
export function inferSqlDialect(
  engine: string | null | undefined,
  schemaNames: string[],
): SqlDialect {
  if (engine === "postgres") return "postgres";
  if (engine === "libsql-file" || engine === "libsql-turso") return "libsql";
  return schemaNames.some((name) => name !== "main") ? "postgres" : "libsql";
}

/**
 * Builds the completion model from one project's introspection responses.
 * Only tables passed in are present — the caller passes the resolved project's
 * schema, never a global catalog.
 */
export function buildStudioSqlModel(input: {
  dialect: SqlDialect;
  schemas: string[];
  tables: SchemaTable[];
}): SqlCompletionModel {
  const schemas = new Set<string>(input.schemas);
  for (const table of input.tables) {
    if (table.schema) schemas.add(table.schema);
  }
  return {
    dialect: input.dialect,
    schemas: [...schemas],
    tables: input.tables.map((table) => ({
      name: table.name,
      schema: table.schema,
      columns: table.columns.map((column) => ({
        name: column.name,
        type: column.type,
        pk: column.pk,
      })),
      foreignKeys: (table.foreignKeys ?? []).map((fk) => ({
        columns: [...fk.columns],
        references: {
          schema: fk.references.schema,
          table: fk.references.table,
          columns: [...fk.references.columns],
        },
      })),
    })),
  };
}

export type SqlModelCache = {
  set(slug: string, model: SqlCompletionModel): void;
  get(slug: string): SqlCompletionModel | null;
  clear(slug?: string): void;
  size(): number;
};

/**
 * Completion models keyed by project slug. The editor only ever reads the
 * active slug, so a model built for one project can never be offered in another.
 */
export function createSqlModelCache(): SqlModelCache {
  const models = new Map<string, SqlCompletionModel>();
  return {
    set(slug, model) {
      models.set(slug, model);
    },
    get(slug) {
      return models.get(slug) ?? null;
    },
    clear(slug) {
      if (slug === undefined) models.clear();
      else models.delete(slug);
    },
    size() {
      return models.size;
    },
  };
}

export const studioSqlModelCache = createSqlModelCache();

export const SQL_DRAFT_PREFIX = "jord.studio.sql:v1:";

type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export function sqlDraftKey(slug: string): string {
  return `${SQL_DRAFT_PREFIX}${slug}`;
}

export function readSqlDraft(
  storage: DraftStorage | null | undefined,
  slug: string,
  fallback: string = DEFAULT_SQL,
): string {
  if (!storage) return fallback;
  try {
    const value = storage.getItem(sqlDraftKey(slug));
    return typeof value === "string" ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeSqlDraft(
  storage: DraftStorage | null | undefined,
  slug: string,
  sql: string,
): void {
  if (!storage) return;
  try {
    storage.setItem(sqlDraftKey(slug), sql);
  } catch {
    // Storage disabled (private mode / quota) — the editor still works.
  }
}

/** `GET /api/schema/tables/:name` path with the schema qualifier. */
export function tableDetailPath(table: string, schema?: string): string {
  const base = `/api/schema/tables/${encodeURIComponent(table)}`;
  return schema ? `${base}?schema=${encodeURIComponent(schema)}` : base;
}

/**
 * Bounded-concurrency map that preserves input order. Used to describe many
 * tables without opening one request per table at once.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const width = Math.max(1, Math.min(limit, items.length || 1));
  let next = 0;
  const workers = Array.from({ length: width }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
