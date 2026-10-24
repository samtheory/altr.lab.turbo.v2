import type {
  JordDriverPort,
  JordPolicy,
  JordPolicyOperation,
} from "@altr/jord";

import type { JordRole } from "../auth/roles.js";
import {
  allRulesMatch,
  parseRulesJson,
  type PolicyEvalContext,
} from "./kinds.js";

export type PolicyDecision =
  | { allowed: true }
  | {
      allowed: false;
      policy: JordPolicy;
    };

export type EvaluatePoliciesInput = {
  jord: JordDriverPort;
  tableName: string;
  operation: JordPolicyOperation;
  role: JordRole;
  bucket?: string | null;
  /** When true (JORD_POLICIES_DISABLED), always allow. */
  disabled?: boolean;
};

/**
 * Default allow when no enabled policy matches.
 * First matching policy (priority desc, deny-before-allow) decides.
 */
export async function evaluatePolicies(
  input: EvaluatePoliciesInput,
): Promise<PolicyDecision> {
  if (input.disabled) return { allowed: true };

  const policies = await input.jord.listPoliciesFor(
    input.tableName,
    input.operation,
  );
  const ctx: PolicyEvalContext = {
    role: input.role,
    bucket: input.bucket,
  };

  for (const policy of policies) {
    const rules = parseRulesJson(policy.rules);
    if (!allRulesMatch(rules, ctx)) continue;
    if (policy.effect === "deny") {
      return { allowed: false, policy };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

export function policiesDisabledFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = env.JORD_POLICIES_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
