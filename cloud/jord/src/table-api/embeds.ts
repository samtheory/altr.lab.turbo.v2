import { defaultSchemaFor, type JordTableInfo } from "@altr/jord";

import { pkColumns, TableApiError, type EmbedSpec, type SqlValue } from "./query.js";
import { compileEmbedSelect, type ScopeFor } from "./sql.js";

/**
 * One-level FK embeds (S0078): `select=*,author(*)`, `select=id,writer:author(name)`,
 * `select=*,posts(id,title)`.
 *
 * Relations come from introspected foreign keys only:
 *  - many-to-one ("one"): the root table has an FK to the target. Names: the target table, and for a
 *    single-column `<x>_id` FK also `<x>`. Embedded value: object or null.
 *  - one-to-many ("many"): another table in the root's schema has an FK to the root. Name: that
 *    table. Embedded value: array (capped per parent).
 * M:N through a join table and nested embeds are not supported.
 *
 * Leak rules: each embedded table gets its own policy decision for the same principal (via the
 * route's `decide`, the same call a direct GET makes) and its rows are fetched through the same
 * WHERE + row-scope path as a direct GET. A hidden parent is `null`, hidden children are absent:
 * indistinguishable from a NULL FK / no children.
 */

/** Rows per parent for one-to-many embeds (excess is dropped; `Jord-Embed-Truncated` names it). */
export const EMBED_MAX_PER_PARENT = 100;
/** Rows one embed statement may return across all parents; more is a 400. */
export const EMBED_MAX_TOTAL = 5000;

export type Relation = {
  /** Names the relation answers to in `select`. */
  names: string[];
  kind: "one" | "many";
  target: JordTableInfo;
  /** Columns on the root row that carry the key. */
  localColumns: string[];
  /** Matching columns on the target. */
  remoteColumns: string[];
};

export type ResolvedEmbed = {
  key: string;
  relation: Relation;
  /** Output columns of the embedded row (validated against the target). */
  columns: string[];
};

function schemaOf(info: JordTableInfo, dialect: "libsql" | "postgres"): string {
  return info.schema ?? defaultSchemaFor(dialect);
}

function sameTable(
  a: { schema: string; name: string },
  b: { schema: string; name: string },
): boolean {
  return a.schema === b.schema && a.name === b.name;
}

/**
 * Every relation of `root` that can be embedded, given the describable tables the caller may name
 * (`tables`: root schema + any cross-schema FK targets). Pure; also feeds OpenAPI.
 */
export function relationCatalog(
  root: JordTableInfo,
  tables: JordTableInfo[],
  dialect: "libsql" | "postgres",
): Relation[] {
  const rootRef = { schema: schemaOf(root, dialect), name: root.name };
  const rootPk = pkColumns(root).map((col) => col.name);
  const rels: Relation[] = [];

  for (const fk of root.foreignKeys ?? []) {
    const target = tables.find((t) =>
      sameTable({ schema: schemaOf(t, dialect), name: t.name }, {
        schema: fk.references.schema || rootRef.schema,
        name: fk.references.table,
      }),
    );
    if (!target) continue;
    let remote = fk.references.columns.filter((name) => name.length > 0);
    if (remote.length !== fk.columns.length) remote = pkColumns(target).map((col) => col.name);
    if (remote.length !== fk.columns.length || remote.length === 0) continue;
    const names = [target.name];
    if (fk.columns.length === 1) {
      const col = fk.columns[0]!;
      if (/^.+_id$/i.test(col)) names.push(col.slice(0, -3));
    }
    rels.push({ names, kind: "one", target, localColumns: [...fk.columns], remoteColumns: remote });
  }

  for (const child of tables) {
    if (schemaOf(child, dialect) !== rootRef.schema) continue;
    for (const fk of child.foreignKeys ?? []) {
      const refSchema = fk.references.schema || rootRef.schema;
      if (!sameTable({ schema: refSchema, name: fk.references.table }, rootRef)) continue;
      let local = fk.references.columns.filter((name) => name.length > 0);
      if (local.length !== fk.columns.length) local = rootPk;
      if (local.length !== fk.columns.length || local.length === 0) continue;
      rels.push({
        names: [child.name],
        kind: "many",
        target: child,
        localColumns: local,
        remoteColumns: [...fk.columns],
      });
    }
  }
  return rels;
}

/** Sorted names a request may use; ambiguous names are listed once. */
export function relationNames(rels: Relation[]): string[] {
  return [...new Set(rels.flatMap((rel) => rel.names))].sort();
}

/** Match `select` embeds to relations; 400 on unknown / ambiguous / bad columns / key clashes. */
export function resolveEmbeds(
  root: JordTableInfo,
  specs: EmbedSpec[],
  rels: Relation[],
  rootOutput: string[],
): ResolvedEmbed[] {
  const available = relationNames(rels);
  const out: ResolvedEmbed[] = [];
  for (const spec of specs) {
    const matches = rels.filter((rel) => rel.names.includes(spec.relation));
    if (matches.length === 0) {
      throw new TableApiError(
        400,
        "unknown_relation",
        `unknown relation ${spec.relation} on ${root.name}; available: ${available.join(", ") || "(none)"}`,
        { available },
      );
    }
    if (matches.length > 1) {
      const hints = relationNames(matches.map((rel) => ({
        ...rel,
        names: rel.names.filter((name) => rels.filter((r) => r.names.includes(name)).length === 1),
      })));
      throw new TableApiError(
        400,
        "ambiguous_relation",
        `relation ${spec.relation} on ${root.name} is ambiguous; use one of: ${hints.join(", ") || "(none)"}`,
        { available: hints },
      );
    }
    const relation = matches[0]!;
    const targetCols = relation.target.columns.map((col) => col.name);
    const columns = spec.columns ?? targetCols;
    for (const name of columns) {
      if (!targetCols.includes(name)) {
        throw new TableApiError(400, "bad_column", `unknown column ${name} on ${relation.target.name}`);
      }
    }
    if (rootOutput.includes(spec.key)) {
      throw new TableApiError(400, "bad_select", `embed ${spec.key} clashes with a column; use an alias`);
    }
    out.push({ key: spec.key, relation, columns });
  }
  return out;
}

function toSqlValue(value: unknown): SqlValue | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function keyOf(values: unknown[]): string {
  return JSON.stringify(values.map((value) => (value == null ? null : value instanceof Date ? value.toISOString() : String(value))));
}

function pick(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((name) => [name, row[name]]));
}

/**
 * One batched statement per embed (never per row). Returns, per root row, the embed values keyed
 * by response key, plus the keys whose lists were truncated at `EMBED_MAX_PER_PARENT`.
 */
export async function fetchEmbeds(input: {
  query: (sql: string, args: SqlValue[]) => Promise<Array<Record<string, unknown>>>;
  dialect: "libsql" | "postgres";
  rows: Array<Record<string, unknown>>;
  embeds: Array<ResolvedEmbed & { scope?: ScopeFor }>;
}): Promise<{ values: Array<Record<string, unknown>>; truncated: string[] }> {
  const values = input.rows.map(() => ({}) as Record<string, unknown>);
  const truncated: string[] = [];
  for (const embed of input.embeds) {
    const { relation } = embed;
    const many = relation.kind === "many";
    const rowKeys: Array<string | null> = [];
    const distinct = new Map<string, SqlValue[]>();
    for (const row of input.rows) {
      const raw = relation.localColumns.map((name) => row[name]);
      const bound = raw.map(toSqlValue);
      if (bound.some((value) => value === null || value === undefined)) {
        rowKeys.push(null);
        continue;
      }
      const key = keyOf(raw);
      rowKeys.push(key);
      if (!distinct.has(key)) distinct.set(key, bound as SqlValue[]);
    }

    const found = new Map<string, Array<Record<string, unknown>>>();
    if (distinct.size > 0) {
      const compiled = compileEmbedSelect(
        relation.target,
        embed.columns,
        relation.remoteColumns,
        [...distinct.values()],
        input.dialect,
        { perParent: many ? EMBED_MAX_PER_PARENT : null, total: EMBED_MAX_TOTAL },
        embed.scope,
      );
      const fetched = await input.query(compiled.sql, compiled.args);
      if (fetched.length > EMBED_MAX_TOTAL) {
        throw new TableApiError(
          400,
          "embed_too_large",
          `embed ${embed.key} exceeds ${EMBED_MAX_TOTAL} rows; lower limit`,
        );
      }
      for (const row of fetched) {
        const key = keyOf(relation.remoteColumns.map((name) => row[name]));
        const list = found.get(key) ?? [];
        list.push(row);
        found.set(key, list);
      }
    }

    let cut = false;
    rowKeys.forEach((key, i) => {
      const matched = key == null ? [] : found.get(key) ?? [];
      if (!many) {
        values[i]![embed.key] = matched[0] ? pick(matched[0], embed.columns) : null;
        return;
      }
      if (matched.length > EMBED_MAX_PER_PARENT) cut = true;
      values[i]![embed.key] = matched
        .slice(0, EMBED_MAX_PER_PARENT)
        .map((row) => pick(row, embed.columns));
    });
    if (cut) truncated.push(embed.key);
  }
  return { values, truncated };
}
