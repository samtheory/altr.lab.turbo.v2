import type { JordPolicy, JordPolicyOperation } from "../port.js";
import { quoteIdent } from "./ddl.js";

/** Native policies are one per operation so priority + default-allow survive. */
export const RLS_OPERATIONS = [
  "select",
  "insert",
  "update",
  "delete",
] as const satisfies readonly JordPolicyOperation[];

const KNOWN_RULES = new Set(["always", "role_in", "bucket_in", "bucket_eq"]);

export type RlsSessionContext = {
  role: string;
  /** Empty string when the request has no bucket yet. */
  bucket: string;
};

type PolicyRule = {
  kind: string;
  config?: Record<string, unknown>;
};

export function rlsPolicyName(operation: JordPolicyOperation): string {
  return `jord_rls_records_${operation}`;
}

/** Escape a SQL string literal. Rejects NUL. */
export function quoteSqlLiteral(value: string): string {
  if (value.includes("\0")) {
    throw new Error("[@altr/jord] SQL literal contains NUL");
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseRules(raw: string): PolicyRule[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const rules: PolicyRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const kind = (item as PolicyRule).kind;
      if (typeof kind !== "string" || !KNOWN_RULES.has(kind)) return null;
      const config = (item as PolicyRule).config;
      rules.push({
        kind,
        config:
          config && typeof config === "object" && !Array.isArray(config)
            ? config
            : undefined,
      });
    }
    return rules;
  } catch {
    return null;
  }
}

function ruleExpr(rule: PolicyRule): string | null {
  const config = rule.config ?? {};
  switch (rule.kind) {
    case "always":
      return "TRUE";
    case "role_in": {
      const roles = asStringArray(config.roles);
      if (roles.length === 0) return "FALSE";
      const list = roles.map(quoteSqlLiteral).join(", ");
      return `current_setting('jord.role', true) = ANY (ARRAY[${list}]::text[])`;
    }
    case "bucket_eq": {
      if (typeof config.bucket !== "string") return "FALSE";
      const lit = quoteSqlLiteral(config.bucket);
      return `(bucket = ${lit} AND current_setting('jord.bucket', true) = ${lit})`;
    }
    case "bucket_in": {
      const buckets = asStringArray(config.buckets);
      if (buckets.length === 0) return "FALSE";
      const list = buckets.map(quoteSqlLiteral).join(", ");
      return `(bucket = ANY (ARRAY[${list}]::text[]) AND current_setting('jord.bucket', true) = ANY (ARRAY[${list}]::text[]))`;
    }
    default:
      return null;
  }
}

/** Boolean SQL for one policy, or null when it must not be compiled. */
export function policyMatchExpr(policy: JordPolicy): string | null {
  if (!policy.enabled) return null;
  if (policy.tableName !== "records") return null;
  const rules = parseRules(policy.rules);
  if (!rules) return null;
  const parts: string[] = [];
  for (const rule of rules) {
    const expr = ruleExpr(rule);
    if (!expr) return null;
    parts.push(expr);
  }
  return parts.join(" AND ");
}

/**
 * Higher priority first; deny before allow at the same priority.
 * Matches `listPoliciesFor` ordering.
 */
export function comparePolicyOrder(a: JordPolicy, b: JordPolicy): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.effect !== b.effect) {
    if (a.effect === "deny") return -1;
    if (b.effect === "deny") return 1;
  }
  return b.createdAt - a.createdAt;
}

/**
 * One expression: first matching policy wins; ELSE TRUE is Jord default-allow.
 * Deny → FALSE (row hidden / write rejected). Allow → TRUE.
 */
export function buildOperationExpr(policies: readonly JordPolicy[]): string {
  const whens = policies.map((policy) => {
    const match = policyMatchExpr(policy);
    const visible = policy.effect === "deny" ? "FALSE" : "TRUE";
    return `WHEN (${match}) THEN ${visible}`;
  });
  if (whens.length === 0) return "TRUE";
  return `(CASE ${whens.join(" ")} ELSE TRUE END)`;
}

export function compilePolicySql(policy: JordPolicy): string | null {
  const match = policyMatchExpr(policy);
  if (!match) return null;
  const name = quoteIdent(rlsPolicyName(policy.operation));
  const expr = `(CASE WHEN (${match}) THEN ${policy.effect === "deny" ? "FALSE" : "TRUE"} ELSE TRUE END)`;
  return createPolicySql(policy.operation, name, expr);
}

function createPolicySql(
  operation: JordPolicyOperation,
  name: string,
  expr: string,
): string {
  switch (operation) {
    case "select":
      return `CREATE POLICY ${name} ON ${quoteIdent("records")} FOR SELECT USING (${expr})`;
    case "insert":
      return `CREATE POLICY ${name} ON ${quoteIdent("records")} FOR INSERT WITH CHECK (${expr})`;
    case "update":
      return `CREATE POLICY ${name} ON ${quoteIdent("records")} FOR UPDATE USING (${expr}) WITH CHECK (${expr})`;
    case "delete":
      return `CREATE POLICY ${name} ON ${quoteIdent("records")} FOR DELETE USING (${expr})`;
  }
}

export type RecordsRlsPlan = {
  /** When false, drop managed policies and disable RLS (default-allow, no rules). */
  enable: boolean;
  statements: string[];
};

/**
 * Rebuild native policies on `records` from Jord policy rows.
 * Unknown rule kinds are skipped (middleware still evaluates them).
 */
export function planSyncRecordsRls(
  policies: readonly JordPolicy[],
): RecordsRlsPlan {
  const table = quoteIdent("records");
  const drops = RLS_OPERATIONS.map(
    (op) =>
      `DROP POLICY IF EXISTS ${quoteIdent(rlsPolicyName(op))} ON ${table}`,
  );

  const compilable = policies
    .filter((policy) => policyMatchExpr(policy) != null)
    .slice()
    .sort(comparePolicyOrder);

  if (compilable.length === 0) {
    return {
      enable: false,
      statements: [
        ...drops,
        `ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`,
        `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`,
      ],
    };
  }

  const creates = RLS_OPERATIONS.map((operation) => {
    const group = compilable.filter((policy) => policy.operation === operation);
    const expr = buildOperationExpr(group);
    return createPolicySql(operation, quoteIdent(rlsPolicyName(operation)), expr);
  });

  return {
    enable: true,
    statements: [
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`,
      ...drops,
      ...creates,
    ],
  };
}
