import type {
  JordDriverPort,
  JordPolicy,
  JordPolicyOperation,
} from "@altr/jord";

import type { PrincipalKind } from "../auth/principal.js";
import {
  allRulesMatch,
  parseRulesJson,
  type PolicyEvalContext,
  type PolicyRule,
} from "./kinds.js";

export type PolicyDecision =
  | {
      allowed: true;
      constraint?: { ownerColumn: string; uid: string };
    }
  | {
      allowed: false;
      policy?: JordPolicy;
      reason?: string;
    };

export type EvaluatePoliciesInput = {
  jord: JordDriverPort;
  tableName: string;
  operation: JordPolicyOperation;
  role: string;
  bucket?: string | null;
  /** When true (JORD_POLICIES_DISABLED), always allow. */
  disabled?: boolean;
  /** Service principals bypass user policies (S0021-B). */
  bypass?: boolean;
  subject?: PrincipalKind;
  uid?: string | null;
  claims?: Record<string, unknown>;
  row?: Record<string, unknown> | null;
  nextRow?: Record<string, unknown> | null;
};

function highestPriority(policies: JordPolicy[]): JordPolicy {
  let best = policies[0]!;
  for (const policy of policies) {
    if (policy.priority > best.priority) best = policy;
  }
  return best;
}

function ownerColumnFrom(rules: PolicyRule[]): string | null {
  for (const rule of rules) {
    if (rule.kind !== "owner_eq") continue;
    const column = rule.config?.column;
    if (typeof column === "string" && column.length > 0) return column;
  }
  return null;
}

/**
 * True when the next row does not change `ownerColumn`.
 * A patch that omits the column leaves the owner in place.
 */
export function ownerUnchanged(
  oldRow: Record<string, unknown> | null | undefined,
  nextRow: Record<string, unknown> | null | undefined,
  ownerColumn: string,
): boolean {
  if (
    nextRow == null ||
    !Object.prototype.hasOwnProperty.call(nextRow, ownerColumn)
  ) {
    return true;
  }
  const previous =
    oldRow == null ? "" : String(oldRow[ownerColumn] ?? "");
  return previous === String(nextRow[ownerColumn] ?? "");
}

/**
 * Deny overrides allow among policies whose rules match.
 * `service`, `disabled`, and `bypass` allow. `user` / `anon` default-deny.
 * `operator` (or an omitted subject) keeps the phase-01 allow.
 */
export async function evaluatePolicies(
  input: EvaluatePoliciesInput,
): Promise<PolicyDecision> {
  if (input.disabled || input.bypass || input.subject === "service") {
    return { allowed: true };
  }

  const ctx: PolicyEvalContext = {
    role: input.role,
    bucket: input.bucket,
    uid: input.uid,
    claims: input.claims,
    row: input.row,
    nextRow: input.nextRow,
  };

  if (input.subject === "user" || input.subject === "anon") {
    const rls = await input.jord.getTableRls(input.tableName);
    if (rls == null || rls.rlsEnabled === false) {
      return { allowed: false, reason: "default_deny" };
    }
  }

  const policies = await input.jord.listPoliciesFor(
    input.tableName,
    input.operation,
  );
  const denies: JordPolicy[] = [];
  const allows: JordPolicy[] = [];
  for (const policy of policies) {
    const rules = parseRulesJson(policy.rules);
    if (!allRulesMatch(rules, ctx)) continue;
    if (policy.effect === "deny") denies.push(policy);
    else if (policy.effect === "allow") allows.push(policy);
  }

  if (denies.length > 0) {
    return { allowed: false, policy: highestPriority(denies), reason: "deny" };
  }

  if (allows.length > 0) {
    let ownerColumn: string | null = null;
    let ownerPriority = Number.NEGATIVE_INFINITY;
    for (const policy of allows) {
      const column = ownerColumnFrom(parseRulesJson(policy.rules));
      if (column && policy.priority >= ownerPriority) {
        ownerColumn = column;
        ownerPriority = policy.priority;
      }
    }
    if (ownerColumn) {
      return {
        allowed: true,
        constraint: {
          ownerColumn,
          uid: typeof input.uid === "string" ? input.uid : "",
        },
      };
    }
    return { allowed: true };
  }

  if (input.subject === "user" || input.subject === "anon") {
    return { allowed: false, reason: "default_deny" };
  }

  return { allowed: true };
}

export function policiesDisabledFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = env.JORD_POLICIES_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
