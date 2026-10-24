import type { JordRole } from "../auth/roles.js";

export const BUILTIN_POLICY_RULE_KINDS = [
  "role_in",
  "bucket_in",
  "bucket_eq",
  "always",
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
  role: JordRole;
  /** Bucket from query / body / row being touched. */
  bucket?: string | null;
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
