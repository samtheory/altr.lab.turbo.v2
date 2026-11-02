/**
 * Normalize dialect EXPLAIN output into a readable plan tree for Studio (S0065).
 */

export type ExplainPlanNode = {
  node: string;
  detail?: string;
  rows?: number | null;
  cost?: number | null;
  children: ExplainPlanNode[];
};

type PgJsonPlan = {
  "Node Type"?: unknown;
  "Relation Name"?: unknown;
  "Alias"?: unknown;
  "Plan Rows"?: unknown;
  "Actual Rows"?: unknown;
  "Total Cost"?: unknown;
  "Startup Cost"?: unknown;
  "Index Name"?: unknown;
  "Filter"?: unknown;
  "Plans"?: unknown;
  [key: string]: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function fromPgJsonPlan(plan: PgJsonPlan): ExplainPlanNode {
  const nodeType = asString(plan["Node Type"]) ?? "Plan";
  const relation = asString(plan["Relation Name"]);
  const alias = asString(plan["Alias"]);
  const index = asString(plan["Index Name"]);
  const filter = asString(plan["Filter"]);
  const parts = [nodeType];
  if (relation) parts.push(`on ${relation}${alias && alias !== relation ? ` (${alias})` : ""}`);
  if (index) parts.push(`using ${index}`);
  const detailParts: string[] = [];
  if (filter) detailParts.push(`Filter: ${filter}`);
  const childrenRaw = plan.Plans;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw
        .filter((child): child is PgJsonPlan => child != null && typeof child === "object")
        .map((child) => fromPgJsonPlan(child))
    : [];
  return {
    node: parts.join(" "),
    detail: detailParts.length > 0 ? detailParts.join("; ") : undefined,
    rows: asNumber(plan["Actual Rows"]) ?? asNumber(plan["Plan Rows"]),
    cost: asNumber(plan["Total Cost"]) ?? asNumber(plan["Startup Cost"]),
    children,
  };
}

function parsePgJsonPayload(raw: unknown): ExplainPlanNode | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { Plan?: PgJsonPlan } | PgJsonPlan | null;
  if (!first || typeof first !== "object") return null;
  const plan =
    "Plan" in first && first.Plan && typeof first.Plan === "object"
      ? (first.Plan as PgJsonPlan)
      : (first as PgJsonPlan);
  if (!asString(plan["Node Type"]) && !Array.isArray(plan.Plans)) return null;
  return fromPgJsonPlan(plan);
}

function fromPgTextRows(rows: Array<Record<string, unknown>>): ExplainPlanNode | null {
  const lines = rows
    .map((row) => {
      const plan = row["QUERY PLAN"] ?? row["query plan"] ?? Object.values(row)[0];
      return typeof plan === "string" ? plan : null;
    })
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;

  type StackEntry = { indent: number; node: ExplainPlanNode };
  const root: ExplainPlanNode = { node: "Plan", children: [] };
  const stack: StackEntry[] = [{ indent: -1, node: root }];

  for (const line of lines) {
    const match = /^(?<pad>\s*)(?<body>.+)$/.exec(line);
    if (!match?.groups?.body) continue;
    const indent = match.groups.pad.length;
    const body = match.groups.body.trim();
    if (!body) continue;
    const costMatch =
      /\(cost=(?<startup>[\d.]+)\.\.(?<total>[\d.]+) rows=(?<rows>[\d.]+)[^)]*\)/.exec(body);
    const actualMatch = /\(actual time=[^)]*rows=(?<rows>[\d.]+)/.exec(body);
    const nodeLabel = body.replace(/\s*\((?:cost|actual)[^)]*\)/g, "").trim() || body;
    const node: ExplainPlanNode = {
      node: nodeLabel,
      rows:
        asNumber(actualMatch?.groups?.rows) ??
        asNumber(costMatch?.groups?.rows),
      cost: asNumber(costMatch?.groups?.total),
      children: [],
    };
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }
    stack[stack.length - 1]!.node.children.push(node);
    stack.push({ indent, node });
  }

  if (root.children.length === 1) return root.children[0]!;
  if (root.children.length === 0) return null;
  return root;
}

function fromLibsqlRows(rows: Array<Record<string, unknown>>): ExplainPlanNode | null {
  if (rows.length === 0) return null;
  type Row = { id: number; parent: number; detail: string };
  const parsed: Row[] = [];
  for (const row of rows) {
    const id = asNumber(row.id ?? row.Id);
    const parent = asNumber(row.parent ?? row.Parent) ?? 0;
    const detail = asString(row.detail ?? row.Detail) ?? "";
    if (id == null) continue;
    parsed.push({ id, parent, detail });
  }
  if (parsed.length === 0) {
    // Fallback: single-column dump
    return {
      node: "QUERY PLAN",
      children: rows.map((row, index) => ({
        node: asString(Object.values(row)[0]) ?? `step ${index + 1}`,
        children: [],
      })),
    };
  }

  const byId = new Map<number, ExplainPlanNode & { parent: number }>();
  for (const row of parsed) {
    byId.set(row.id, {
      node: row.detail || `step ${row.id}`,
      detail: undefined,
      rows: null,
      cost: null,
      children: [],
      parent: row.parent,
    });
  }
  const roots: ExplainPlanNode[] = [];
  for (const node of byId.values()) {
    const parent = byId.get(node.parent);
    if (parent && node.parent !== (node as { id?: number }).id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Strip the internal parent field from the public tree by rebuilding clean nodes.
  const clean = (node: ExplainPlanNode): ExplainPlanNode => ({
    node: node.node,
    detail: node.detail,
    rows: node.rows ?? null,
    cost: node.cost ?? null,
    children: node.children.map(clean),
  });
  if (roots.length === 1) return clean(roots[0]!);
  return {
    node: "QUERY PLAN",
    children: roots.map(clean),
  };
}

/**
 * Build a plan tree from `executeSql` columns/rows when the statement was EXPLAIN.
 * Returns null when the shape is not recognized (caller can still show the grid).
 */
export function normalizeExplainPlan(
  dialect: "postgres" | "libsql" | "sqlite",
  columns: string[],
  rows: Array<Record<string, unknown>>,
): ExplainPlanNode | null {
  if (rows.length === 0) return null;

  if (dialect === "postgres") {
    const jsonCol = columns.find(
      (name) => name.toLowerCase() === "query plan" || name.toLowerCase() === "plan",
    );
    if (jsonCol) {
      const first = rows[0]?.[jsonCol];
      const fromJson = parsePgJsonPayload(first);
      if (fromJson) return fromJson;
      // Multi-row JSON is uncommon; try joining string rows.
      if (rows.every((row) => typeof row[jsonCol] === "string")) {
        return fromPgTextRows(rows);
      }
    }
    return fromPgTextRows(rows);
  }

  return fromLibsqlRows(rows);
}

/**
 * Rewrite a user EXPLAIN so Postgres returns JSON when possible.
 * Leaves EXPLAIN ANALYZE / already-formatted plans alone enough to stay valid.
 */
export function preferPostgresJsonExplain(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  // EXPLAIN ( … ) already has options — only inject FORMAT JSON when missing.
  const withOptions = /^EXPLAIN\s*\(/i.exec(trimmed);
  if (withOptions) {
    if (/format\s*json/i.test(trimmed)) {
      return trimmed;
    }
    // Insert FORMAT JSON after the opening paren of the options list.
    return trimmed.replace(/^EXPLAIN\s*\(/i, "EXPLAIN (FORMAT JSON, ");
  }
  if (/^EXPLAIN\s+ANALYZE\b/i.test(trimmed)) {
    return trimmed.replace(/^EXPLAIN\s+ANALYZE\b/i, "EXPLAIN (ANALYZE, FORMAT JSON)");
  }
  if (/^EXPLAIN\b/i.test(trimmed)) {
    return trimmed.replace(/^EXPLAIN\b/i, "EXPLAIN (FORMAT JSON)");
  }
  return trimmed;
}

/** Ensure libSQL uses EXPLAIN QUERY PLAN (not bare EXPLAIN). */
export function preferLibsqlQueryPlan(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (/^EXPLAIN\s+QUERY\s+PLAN\b/i.test(trimmed)) return trimmed;
  if (/^EXPLAIN\b/i.test(trimmed)) {
    return trimmed.replace(/^EXPLAIN\b/i, "EXPLAIN QUERY PLAN");
  }
  return trimmed;
}
