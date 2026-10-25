export const BUILTIN_POLICY_RULE_KINDS = [
  "role_in",
  "bucket_in",
  "bucket_eq",
  "always",
  "owner_eq",
  "claim_eq",
] as const;

export type BuiltinPolicyRuleKind =
  (typeof BUILTIN_POLICY_RULE_KINDS)[number];

export function isBuiltinPolicyRuleKind(
  value: string,
): value is BuiltinPolicyRuleKind {
  return (BUILTIN_POLICY_RULE_KINDS as readonly string[]).includes(value);
}

export type PolicyRule = {
  kind: string;
  config?: Record<string, unknown>;
};

export type PolicyEvalContext = {
  role: string;
  /** Bucket from query / body / row being touched. */
  bucket?: string | null;
  uid?: string | null;
  claims?: Record<string, unknown>;
  row?: Record<string, unknown> | null;
  nextRow?: Record<string, unknown> | null;
};

export function parseRulesJson(raw: string): PolicyRule[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PolicyRule =>
        !!item &&
        typeof item === "object" &&
        typeof (item as PolicyRule).kind === "string",
    );
  } catch {
    return [];
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function ruleMatches(
  rule: PolicyRule,
  ctx: PolicyEvalContext,
): boolean {
  const config = rule.config ?? {};
  switch (rule.kind) {
    case "always":
      return true;
    case "role_in": {
      const roles = asStringArray(config.roles);
      return roles.includes(ctx.role);
    }
    case "bucket_in": {
      if (ctx.bucket == null || ctx.bucket === "") return false;
      const buckets = asStringArray(config.buckets);
      return buckets.includes(ctx.bucket);
    }
    case "bucket_eq": {
      if (ctx.bucket == null || ctx.bucket === "") return false;
      return (
        typeof config.bucket === "string" && config.bucket === ctx.bucket
      );
    }
    case "owner_eq": {
      if (typeof config.column !== "string") return false;
      if (ctx.row == null) {
        return typeof ctx.uid === "string" && ctx.uid.length > 0;
      }
      return String(ctx.row[config.column] ?? "") === ctx.uid;
    }
    case "claim_eq": {
      if (typeof config.claim !== "string" || typeof config.column !== "string") {
        return false;
      }
      const claimValue = ctx.claims?.[config.claim];
      if (ctx.row == null) {
        return typeof claimValue === "string" && claimValue.length > 0;
      }
      return String(ctx.row[config.column] ?? "") === String(claimValue ?? "");
    }
    default:
      return false;
  }
}

export function allRulesMatch(
  rules: PolicyRule[],
  ctx: PolicyEvalContext,
): boolean {
  if (rules.length === 0) return false;
  return rules.every((r) => ruleMatches(r, ctx));
}
