/**
 * ERD canvas layout persistence (S0062 / jord-F0027).
 * Presentation-only — never written into the project target database.
 */

import type { JordDriverPort } from "@altr/jord";

import { getProject, getProjectBySlug, type ProjectRegistryDeps } from "./registry.js";

function ph(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

export type ErdLayoutNode = {
  schema: string;
  table: string;
  x: number;
  y: number;
  collapsed: boolean;
};

export type ErdLayoutDocument = {
  schema: string;
  nodes: ErdLayoutNode[];
  updatedAt: number | null;
};

const SCHEMA_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$|^\*$/;

export function normalizeLayoutSchema(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const schema = raw.trim();
  if (!schema || !SCHEMA_RE.test(schema)) return null;
  return schema;
}

export function parseLayoutNodes(raw: unknown):
  | { ok: true; nodes: ErdLayoutNode[] }
  | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "nodes must be an array" };
  }
  const nodes: ErdLayoutNode[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "each node must be an object" };
    }
    const row = item as Record<string, unknown>;
    const schema = typeof row.schema === "string" ? row.schema.trim() : "";
    const table = typeof row.table === "string" ? row.table.trim() : "";
    if (!schema || !SCHEMA_RE.test(schema) || schema === "*") {
      return { ok: false, error: "node.schema must be a SQL identifier" };
    }
    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return { ok: false, error: "node.table must be a SQL identifier" };
    }
    const x = Number(row.x);
    const y = Number(row.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { ok: false, error: "node.x and node.y must be finite numbers" };
    }
    const key = `${schema}::${table}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nodes.push({
      schema,
      table,
      x,
      y,
      collapsed: row.collapsed === true,
    });
  }
  return { ok: true, nodes };
}

/** Resolve registry id from UUID or slug. */
export async function resolveProjectId(
  deps: ProjectRegistryDeps,
  idOrSlug: string,
): Promise<
  | { ok: true; id: string }
  | { ok: false; status: 404 | 410; error: string; reason?: string }
> {
  const byId = await getProject(deps, idOrSlug);
  if (byId.ok) return { ok: true, id: byId.project.id };
  if (byId.status === 410) {
    return {
      ok: false,
      status: 410,
      error: byId.error,
      reason: byId.reason,
    };
  }
  const bySlug = await getProjectBySlug(deps, idOrSlug);
  if (bySlug.ok) return { ok: true, id: bySlug.project.id };
  return {
    ok: false,
    status: bySlug.status,
    error: bySlug.error,
    reason: bySlug.reason,
  };
}

export async function getErdLayout(
  deps: Pick<ProjectRegistryDeps, "jord">,
  projectId: string,
  schema: string,
): Promise<ErdLayoutDocument> {
  const rows = await deps.jord.query(
    `SELECT nodes_json, updated_at
     FROM jord_erd_layouts
     WHERE project_id = ${ph(deps.jord, 1)}
       AND schema_name = ${ph(deps.jord, 2)}
     LIMIT 1`,
    [projectId, schema],
  );
  const row = rows[0];
  if (!row) {
    return { schema, nodes: [], updatedAt: null };
  }
  let nodes: ErdLayoutNode[] = [];
  try {
    const parsed = JSON.parse(String(row.nodes_json ?? "[]")) as unknown;
    const result = parseLayoutNodes(parsed);
    if (result.ok) nodes = result.nodes;
  } catch {
    nodes = [];
  }
  const updatedAt = Number(row.updated_at);
  return {
    schema,
    nodes,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
  };
}

export async function putErdLayout(
  deps: Pick<ProjectRegistryDeps, "jord">,
  projectId: string,
  schema: string,
  nodes: ErdLayoutNode[],
): Promise<ErdLayoutDocument> {
  const now = Date.now();
  const json = JSON.stringify(nodes);
  if (deps.jord.dialect === "postgres") {
    await deps.jord.query(
      `INSERT INTO jord_erd_layouts (project_id, schema_name, nodes_json, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, schema_name)
       DO UPDATE SET nodes_json = EXCLUDED.nodes_json, updated_at = EXCLUDED.updated_at`,
      [projectId, schema, json, now],
    );
  } else {
    await deps.jord.query(
      `INSERT INTO jord_erd_layouts (project_id, schema_name, nodes_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (project_id, schema_name)
       DO UPDATE SET nodes_json = excluded.nodes_json, updated_at = excluded.updated_at`,
      [projectId, schema, json, now],
    );
  }
  return { schema, nodes, updatedAt: now };
}
