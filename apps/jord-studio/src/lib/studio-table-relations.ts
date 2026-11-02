/** Per-table relationships view helpers (S0060 / jord-F0027). */

import type { SchemaForeignKey, SchemaTable } from "@/lib/schema";

export const RELATIONS_VIEW = "relations" as const;
export const RELATIONS_VIEW_PARAM = "view";
export const RELATIONS_TABLE_PARAM = "table";
export const RELATIONS_SCHEMA_PARAM = "schema";
export const RELATIONS_EDGE_PARAM = "edge";

export type RelationDirection = "outgoing" | "incoming";

export type RelationEdge = {
  id: string;
  direction: RelationDirection;
  /** Table that owns the FK constraint (child / referencing). */
  ownerSchema: string;
  ownerTable: string;
  ownerColumns: string[];
  /** Referenced (parent) side. */
  targetSchema: string;
  targetTable: string;
  targetColumns: string[];
  cardinality: string;
  onDelete?: string;
  onUpdate?: string;
  name?: string;
};

export type TableRelations = {
  outgoing: RelationEdge[];
  incoming: RelationEdge[];
};

export type RelationsUrlState = {
  table: string;
  schema?: string;
  edge?: string;
};

function defaultSchema(table: SchemaTable): string {
  return table.schema ?? "main";
}

function sameTable(
  aSchema: string,
  aName: string,
  bSchema: string,
  bName: string,
): boolean {
  return aName === bName && aSchema === bSchema;
}

/** Stable id for URL deep-links (`?edge=`). */
export function makeRelationEdgeId(parts: {
  direction: RelationDirection;
  ownerSchema: string;
  ownerTable: string;
  ownerColumns: string[];
  targetSchema: string;
  targetTable: string;
  targetColumns: string[];
}): string {
  return [
    parts.direction,
    parts.ownerSchema,
    parts.ownerTable,
    parts.ownerColumns.join(","),
    parts.targetSchema,
    parts.targetTable,
    parts.targetColumns.join(","),
  ].join("|");
}

function edgeFromFk(args: {
  direction: RelationDirection;
  owner: SchemaTable;
  fk: SchemaForeignKey;
}): RelationEdge {
  const ownerSchema = defaultSchema(args.owner);
  const targetSchema = args.fk.references.schema || "main";
  const base = {
    direction: args.direction,
    ownerSchema,
    ownerTable: args.owner.name,
    ownerColumns: [...args.fk.columns],
    targetSchema,
    targetTable: args.fk.references.table,
    targetColumns: [...args.fk.references.columns],
  };
  return {
    ...base,
    id: makeRelationEdgeId(base),
    cardinality: args.fk.cardinality ?? "1:N",
    onDelete: args.fk.onDelete,
    onUpdate: args.fk.onUpdate,
    name: args.fk.name,
  };
}

/**
 * Outgoing = FKs on the center table.
 * Incoming = FKs on other catalog tables that reference the center.
 */
export function buildTableRelations(
  center: SchemaTable,
  catalog: SchemaTable[],
): TableRelations {
  const centerSchema = defaultSchema(center);
  const outgoing = (center.foreignKeys ?? []).map((fk) =>
    edgeFromFk({ direction: "outgoing", owner: center, fk }),
  );

  const incoming: RelationEdge[] = [];
  for (const table of catalog) {
    const schema = defaultSchema(table);
    if (sameTable(schema, table.name, centerSchema, center.name)) continue;
    for (const fk of table.foreignKeys ?? []) {
      const refSchema = fk.references.schema || "main";
      if (!sameTable(refSchema, fk.references.table, centerSchema, center.name)) {
        continue;
      }
      incoming.push(edgeFromFk({ direction: "incoming", owner: table, fk }));
    }
  }

  return { outgoing, incoming };
}

export function neighbourOf(
  edge: RelationEdge,
  centerSchema: string,
  centerTable: string,
): { schema: string; table: string } {
  if (edge.direction === "outgoing") {
    return { schema: edge.targetSchema, table: edge.targetTable };
  }
  return { schema: edge.ownerSchema, table: edge.ownerTable };
}

export function formatColumnPair(edge: RelationEdge): string {
  const left = `${edge.ownerColumns.join(", ")}`;
  const right = `${edge.targetTable}.${edge.targetColumns.join(", ")}`;
  return `${left} → ${right}`;
}

export function formatActionChip(
  kind: "ON DELETE" | "ON UPDATE",
  value: string | undefined,
): string | null {
  if (!value || value === "no action") return null;
  return `${kind} ${value.toUpperCase()}`;
}

export function isRelationsView(
  value: string | null | undefined,
): value is typeof RELATIONS_VIEW {
  return value === RELATIONS_VIEW;
}

export function parseRelationsSearch(
  params: URLSearchParams | { get(name: string): string | null },
): RelationsUrlState | null {
  if (!isRelationsView(params.get(RELATIONS_VIEW_PARAM))) return null;
  const table = params.get(RELATIONS_TABLE_PARAM);
  if (!table) return null;
  const schema = params.get(RELATIONS_SCHEMA_PARAM) ?? undefined;
  const edge = params.get(RELATIONS_EDGE_PARAM) ?? undefined;
  return {
    table,
    schema: schema || undefined,
    edge: edge || undefined,
  };
}

/** Mutates a copy: set or clear the relations view query keys. */
export function withRelationsSearch(
  params: URLSearchParams,
  state: RelationsUrlState | null,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  next.delete(RELATIONS_VIEW_PARAM);
  next.delete(RELATIONS_TABLE_PARAM);
  next.delete(RELATIONS_EDGE_PARAM);
  // Keep unrelated schema filters when clearing; only set when relations is active.
  if (!state) return next;
  next.set(RELATIONS_VIEW_PARAM, RELATIONS_VIEW);
  next.set(RELATIONS_TABLE_PARAM, state.table);
  if (state.schema) next.set(RELATIONS_SCHEMA_PARAM, state.schema);
  else next.delete(RELATIONS_SCHEMA_PARAM);
  if (state.edge) next.set(RELATIONS_EDGE_PARAM, state.edge);
  return next;
}

export function relationsHref(
  pathname: string,
  current: URLSearchParams,
  state: RelationsUrlState | null,
): string {
  const next = withRelationsSearch(current, state);
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Schema browser deep-link to add / edit an FK on a table. */
export function schemaEditorHref(
  schemaPath: string,
  table: string,
  schema?: string,
): string {
  const params = new URLSearchParams();
  params.set(RELATIONS_TABLE_PARAM, table);
  params.set(RELATIONS_VIEW_PARAM, "browser");
  if (schema) params.set(RELATIONS_SCHEMA_PARAM, schema);
  return `${schemaPath}?${params.toString()}`;
}
