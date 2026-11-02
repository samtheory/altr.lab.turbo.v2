"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  cn,
} from "@altr/apolyx";

import type { SchemaTable } from "@/lib/schema";
import {
  buildTableRelations,
  formatActionChip,
  formatColumnPair,
  neighbourOf,
  schemaEditorHref,
  type RelationEdge,
} from "@/lib/studio-table-relations";

type Props = {
  center: SchemaTable;
  catalog: SchemaTable[];
  /** Base path for `/schema` (project-scoped). */
  schemaHref: string;
  /** Selected constraint id from URL (`?edge=`). */
  selectedEdgeId?: string | null;
  onSelectEdge?: (edgeId: string | null) => void;
  onRecenter?: (next: { schema: string; table: string }) => void;
};

function qualify(schema: string, table: string): string {
  if (!schema || schema === "public" || schema === "main") return table;
  return `${schema}.${table}`;
}

function NeighbourCard({
  edge,
  centerSchema,
  centerTable,
  selected,
  onSelect,
  onRecenter,
}: {
  edge: RelationEdge;
  centerSchema: string;
  centerTable: string;
  selected: boolean;
  onSelect: () => void;
  onRecenter: () => void;
}) {
  const neighbour = neighbourOf(edge, centerSchema, centerTable);
  const deleteChip = formatActionChip("ON DELETE", edge.onDelete);
  const updateChip = formatActionChip("ON UPDATE", edge.onUpdate);

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow",
        selected && "ring-2 ring-ring/50",
      )}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="font-display text-left text-base font-semibold text-foreground hover:underline"
          onClick={onRecenter}
        >
          {qualify(neighbour.schema, neighbour.table)}
        </button>
        <Badge variant="outline" className="font-mono text-[10px]">
          {edge.cardinality}
        </Badge>
      </header>
      <button
        type="button"
        className="w-full text-left"
        onClick={onSelect}
        aria-pressed={selected}
      >
        <p className="font-mono text-xs text-muted-foreground">
          {formatColumnPair(edge)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {deleteChip ? (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {deleteChip}
            </Badge>
          ) : null}
          {updateChip ? (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {updateChip}
            </Badge>
          ) : null}
          {!deleteChip && !updateChip ? (
            <span className="text-xs text-muted-foreground">NO ACTION</span>
          ) : null}
        </div>
      </button>
    </article>
  );
}

function EdgeDetail({
  edge,
  schemaHref,
}: {
  edge: RelationEdge;
  schemaHref: string;
}) {
  return (
    <aside className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="font-display text-sm font-semibold">Constraint</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Name
          </dt>
          <dd className="font-mono text-xs">
            {edge.name?.trim() || "(unnamed)"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Columns
          </dt>
          <dd className="font-mono text-xs">{formatColumnPair(edge)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Target
          </dt>
          <dd className="font-mono text-xs">
            {qualify(edge.targetSchema, edge.targetTable)}(
            {edge.targetColumns.join(", ")})
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Behavior
          </dt>
          <dd className="flex flex-wrap gap-1 pt-1">
            <Badge variant="outline" className="font-mono text-[10px]">
              ON DELETE {(edge.onDelete ?? "no action").toUpperCase()}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              ON UPDATE {(edge.onUpdate ?? "no action").toUpperCase()}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Cardinality
          </dt>
          <dd>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {edge.cardinality}
            </Badge>
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link
            href={schemaEditorHref(
              schemaHref,
              edge.ownerTable,
              edge.ownerSchema,
            )}
          >
            Open column editor
          </Link>
        </Button>
      </div>
    </aside>
  );
}

export function TableRelationshipsView({
  center,
  catalog,
  schemaHref,
  selectedEdgeId = null,
  onSelectEdge,
  onRecenter,
}: Props) {
  const centerSchema = center.schema ?? "main";
  const { outgoing, incoming } = useMemo(
    () => buildTableRelations(center, catalog),
    [center, catalog],
  );
  const [localEdge, setLocalEdge] = useState<string | null>(null);
  const activeEdgeId = selectedEdgeId ?? localEdge;

  const selectEdge = (id: string | null) => {
    setLocalEdge(id);
    onSelectEdge?.(id);
  };

  const selectedEdge =
    [...outgoing, ...incoming].find((e) => e.id === activeEdgeId) ?? null;

  const empty = outgoing.length === 0 && incoming.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Relationships
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {qualify(centerSchema, center.name)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Incoming (referenced by) and outgoing (references). Click a neighbour
            to re-center; click an edge for constraint details.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={schemaEditorHref(schemaHref, center.name, centerSchema)}>
            Edit columns / add FK
          </Link>
        </Button>
      </div>

      {empty ? (
        <Alert variant="info">
          <AlertTitle>No relationships</AlertTitle>
          <AlertDescription>
            This table has no incoming or outgoing foreign keys.{" "}
            <Link
              href={schemaEditorHref(schemaHref, center.name, centerSchema)}
              className="font-medium underline underline-offset-2"
            >
              Add an FK in the column editor
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(12rem,14rem)_1fr]">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Incoming · referenced by
            </h3>
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((edge) => (
                  <NeighbourCard
                    key={edge.id}
                    edge={edge}
                    centerSchema={centerSchema}
                    centerTable={center.name}
                    selected={activeEdgeId === edge.id}
                    onSelect={() => selectEdge(edge.id)}
                    onRecenter={() => {
                      const n = neighbourOf(edge, centerSchema, center.name);
                      onRecenter?.(n);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="flex items-start justify-center pt-8">
            <article className="w-full max-w-[14rem] rounded-xl border-2 border-ring/40 bg-card p-4 text-center shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Center
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                {center.name}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {centerSchema}
              </p>
              <Badge variant="secondary" className="mt-3 font-mono text-[10px]">
                {center.columns.length} cols
              </Badge>
            </article>
          </div>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Outgoing · references
            </h3>
            {outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((edge) => (
                  <NeighbourCard
                    key={edge.id}
                    edge={edge}
                    centerSchema={centerSchema}
                    centerTable={center.name}
                    selected={activeEdgeId === edge.id}
                    onSelect={() => selectEdge(edge.id)}
                    onRecenter={() => {
                      const n = neighbourOf(edge, centerSchema, center.name);
                      onRecenter?.(n);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedEdge ? (
        <EdgeDetail edge={selectedEdge} schemaHref={schemaHref} />
      ) : null}
    </div>
  );
}
