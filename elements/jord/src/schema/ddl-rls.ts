import type { JordPolicy, JordPolicyOperation } from "../port.js";
import { isValidSqlIdent, quoteIdent } from "./ddl.js";

/** Native policies are one per operation so priority + default-allow survive. */
export const RLS_OPERATIONS = [
  "select",
  "insert",
  "update",
  "delete",
] as const satisfies readonly JordPolicyOperation[];

const KNOWN_RULES = new Set([
  "always",
  "role_in",
  "bucket_in",
  "bucket_eq",
  "owner_eq",
  "claim_eq",
]);

export type RlsSessionContext = {
  role: string;
  /** Empty string when the request has no bucket yet. */
  bucket: string;
  /** Empty string when the request has no end-user id. */
  uid: string;
  /** JSON object of string claims, or empty string. */
  claims?: string;
};

type PolicyRule = {
  kind: string;
  config?: Record<string, unknown>;
};

/** Options for compiling policies on one table. */
export type RlsTableShape = {
  /** `bucket_*` rules read a `bucket` column; skip them when it is missing. */
  hasBucket: boolean;
};

export function rlsPolicyName(
  operation: JordPolicyOperation,
  tableName = "records",
): string {
  return `jord_rls_${tableName}_${operation}`;
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

function ruleExpr(rule: PolicyRule, shape: RlsTableShape): string | null {
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
      if (!shape.hasBucket) return null;
      if (typeof config.bucket !== "string") return "FALSE";
      const lit = quoteSqlLiteral(config.bucket);
      return `(bucket = ${lit} AND current_setting('jord.bucket', true) = ${lit})`;
    }
    case "bucket_in": {
      if (!shape.hasBucket) return null;
      const buckets = asStringArray(config.buckets);
      if (buckets.length === 0) return "FALSE";
      const list = buckets.map(quoteSqlLiteral).join(", ");
      return `(bucket = ANY (ARRAY[${list}]::text[]) AND current_setting('jord.bucket', true) = ANY (ARRAY[${list}]::text[]))`;
    }
    case "owner_eq":
      return ownerUidExpr(config.column);
    case "claim_eq": {
      if (config.claim === "sub") return ownerUidExpr(config.column);
      if (
        typeof config.claim !== "string" ||
        config.claim.length === 0 ||
        typeof config.column !== "string" ||
        !isValidSqlIdent(config.column)
      ) {
        return null;
      }
      return `${quoteIdent(config.column)} = (NULLIF(current_setting('jord.claims', true), '')::jsonb ->> ${quoteSqlLiteral(config.claim)})`;
    }
    default:
      return null;
  }
}

/** `"col" = current_setting('jord.uid', true)`, or null when `column` is not a simple ident. */
function ownerUidExpr(column: unknown): string | null {
  if (typeof column !== "string" || !isValidSqlIdent(column)) return null;
  return `${quoteIdent(column)} = current_setting('jord.uid', true)`;
}

function defaultShape(tableName: string): RlsTableShape {
  return { hasBucket: tableName === "records" };
}

/** Boolean SQL for one policy, or null when it must not be compiled. */
export function policyMatchExpr(
  policy: JordPolicy,
  shape: RlsTableShape = defaultShape(policy.tableName),
): string | null {
  if (!policy.enabled) return null;
  if (!isValidSqlIdent(policy.tableName)) return null;
  const rules = parseRules(policy.rules);
  if (!rules) return null;
  const parts: string[] = [];
  for (const rule of rules) {
    const expr = ruleExpr(rule, shape);
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

const OPERATOR_SQL_DEFAULT =
  "current_setting('jord.role', true) IN ('admin', 'editor', 'readonly')";

/**
 * Deny overrides allow. Anything else is allowed only for operator roles.
 * `user` / `anon` (and an empty role) do not match the ELSE.
 */
export function buildOperationExpr(
  policies: readonly JordPolicy[],
  shape?: RlsTableShape,
): string {
  const denies: string[] = [];
  const allows: string[] = [];
  for (const policy of policies) {
    const match = policyMatchExpr(policy, shape);
    if (!match) continue;
    if (policy.effect === "deny") denies.push(match);
    else allows.push(match);
  }
  const whens: string[] = [];
  if (denies.length > 0) {
    whens.push(`WHEN (${denies.join(" OR ")}) THEN FALSE`);
  }
  if (allows.length > 0) {
    whens.push(`WHEN (${allows.join(" OR ")}) THEN TRUE`);
  }
  if (whens.length === 0) return `(${OPERATOR_SQL_DEFAULT})`;
  return `(CASE ${whens.join(" ")} ELSE ${OPERATOR_SQL_DEFAULT} END)`;
}

export function compilePolicySql(
  policy: JordPolicy,
  shape?: RlsTableShape,
): string | null {
  const match = policyMatchExpr(policy, shape);
  if (!match) return null;
  const name = quoteIdent(rlsPolicyName(policy.operation, policy.tableName));
  const expr = buildOperationExpr([policy], shape);
  return createPolicySql(policy.tableName, policy.operation, name, expr);
}

function createPolicySql(
  tableName: string,
  operation: JordPolicyOperation,
  name: string,
  expr: string,
): string {
  const table = quoteIdent(tableName);
  switch (operation) {
    case "select":
      return `CREATE POLICY ${name} ON ${table} FOR SELECT USING (${expr})`;
    case "insert":
      return `CREATE POLICY ${name} ON ${table} FOR INSERT WITH CHECK (${expr})`;
    case "update":
      return `CREATE POLICY ${name} ON ${table} FOR UPDATE USING (${expr}) WITH CHECK (${expr})`;
    case "delete":
      return `CREATE POLICY ${name} ON ${table} FOR DELETE USING (${expr})`;
  }
}

export type RecordsRlsPlan = {
  /** When false, drop managed policies and disable RLS (default-allow, no rules). */
  enable: boolean;
  statements: string[];
};

/**
 * Rebuild native policies on one table from Jord policy rows.
 * Unknown rule kinds are skipped (middleware still evaluates them).
 * `enable: "auto"` (records) turns RLS off when nothing compiles;
 * `true` / `false` follow the user table's `jord_table_rls` flag.
 */
export function planSyncTableRls(
  tableName: string,
  policies: readonly JordPolicy[],
  options: { shape?: RlsTableShape; enable: boolean | "auto" },
): RecordsRlsPlan {
  const shape = options.shape ?? defaultShape(tableName);
  const table = quoteIdent(tableName);
  const drops = RLS_OPERATIONS.map(
    (op) =>
      `DROP POLICY IF EXISTS ${quoteIdent(rlsPolicyName(op, tableName))} ON ${table}`,
  );

  const compilable = policies
    .filter(
      (policy) =>
        policy.tableName === tableName && policyMatchExpr(policy, shape) != null,
    )
    .slice()
    .sort(comparePolicyOrder);

  const enable =
    options.enable === "auto" ? compilable.length > 0 : options.enable;
  if (!enable) {
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
    const expr = buildOperationExpr(group, shape);
    return createPolicySql(
      tableName,
      operation,
      quoteIdent(rlsPolicyName(operation, tableName)),
      expr,
    );
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

/** Rebuild native policies on `records` from Jord policy rows. */
export function planSyncRecordsRls(
  policies: readonly JordPolicy[],
): RecordsRlsPlan {
  return planSyncTableRls("records", policies, { enable: "auto" });
}
