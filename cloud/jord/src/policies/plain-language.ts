import type { JordPolicy } from "@altr/jord";

import { parseRulesJson, type PolicyRule } from "./kinds.js";

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function oneOf(subject: string, values: string[]): string {
  if (values.length === 0) return `${subject} is in an empty list (never matches)`;
  if (values.length === 1) return `${subject} is ${values[0]}`;
  return `${subject} is one of ${values.join(", ")}`;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** One rule as an English clause. Mirrors `ruleMatches` in `kinds.ts`. */
export function describeRule(rule: PolicyRule): string {
  const config = rule.config ?? {};
  switch (rule.kind) {
    case "always":
      return "always";
    case "role_in":
      return oneOf("the caller role", list(config.roles));
    case "bucket_in":
      return oneOf("the bucket", list(config.buckets));
    case "bucket_eq": {
      const bucket = str(config.bucket);
      return bucket ? `the bucket is ${bucket}` : "the bucket is unset (never matches)";
    }
    case "owner_eq": {
      const column = str(config.column);
      return column
        ? `${column} equals the caller id`
        : "owner_eq has no column (never matches)";
    }
    case "claim_eq": {
      const column = str(config.column);
      const claim = str(config.claim);
      return column && claim
        ? `${column} equals the caller ${claim} claim`
        : "claim_eq is missing claim or column (never matches)";
    }
    default:
      return `unknown rule ${rule.kind} (never matches)`;
  }
}

/** `role_in+owner_eq` — the rule kinds of a policy, in order. */
export function policyKind(policy: Pick<JordPolicy, "rules">): string {
  const rules = parseRulesJson(policy.rules);
  return rules.length === 0 ? "none" : rules.map((rule) => rule.kind).join("+");
}

/**
 * Deterministic English for a policy, e.g.
 * `Allow select on posts when owner_id equals the caller id`.
 */
export function describePolicy(
  policy: Pick<JordPolicy, "effect" | "operation" | "tableName" | "rules">,
): string {
  const effect = policy.effect === "deny" ? "Deny" : "Allow";
  const head = `${effect} ${policy.operation} on ${policy.tableName}`;
  const rules = parseRulesJson(policy.rules);
  if (rules.length === 0) return `${head} never (the policy has no rules)`;
  const clauses = rules.filter((rule) => rule.kind !== "always").map(describeRule);
  if (clauses.length === 0) return `${head} for every caller`;
  return `${head} when ${clauses.join(" and ")}`;
}
