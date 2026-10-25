import type {
  JordDriverPort,
  JordPolicy,
  JordPolicyOperation,
  RowPredicate,
  RowScope,
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
      /**
       * Rows the caller may touch, when an allow matched only because of
       * `owner_eq` / `claim_eq`. Absent means no row restriction.
       */
      scope?: RowScope;
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

/**
 * Row terms for one matching allow policy, or null when it has no row rule
 * (then it allows every row). A rule with no usable value yields a term that
 * matches nothing.
 */
function rowPredicateFrom(
  rules: PolicyRule[],
  ctx: PolicyEvalContext,
): RowPredicate | null {
  const terms: RowPredicate = [];
  for (const rule of rules) {
    const column = rule.config?.column;
    if (typeof column !== "string" || column.length === 0) continue;
    if (rule.kind === "owner_eq") {
      terms.push({ column, value: typeof ctx.uid === "string" ? ctx.uid : "" });
    } else if (rule.kind === "claim_eq") {
      const claim = rule.config?.claim;
      const value = typeof claim === "string" ? ctx.claims?.[claim] : undefined;
      terms.push({
        column,
        value: typeof value === "string" || typeof value === "number" ? String(value) : "",
      });
    }
  }
  return terms.length > 0 ? terms : null;
}

/** Columns that the scope pins to a value (owner, tenant, ...). */
export function scopeColumns(scope: RowScope | undefined): string[] {
  if (!scope) return [];
  return [...new Set(scope.anyOf.flatMap((predicate) => predicate.map((term) => term.column)))];
}

/**
 * Stamp scope columns onto an insert. Picks the first predicate the values
 * already agree with (missing columns count as agreeing), else the first one,
 * and overwrites its columns. Returns null when the scope matches no row.
 */
export function stampInsertScope(
  scope: RowScope | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!scope) return values;
  const candidates = scope.anyOf.filter((predicate) =>
    predicate.every((term) => term.value !== ""),
  );
  if (candidates.length === 0) return null;
  const agrees = candidates.find((predicate) =>
    predicate.every(
      (term) => values[term.column] == null || String(values[term.column]) === term.value,
    ),
  );
  const chosen = agrees ?? candidates[0]!;
  const out = { ...values };
  for (const term of chosen) out[term.column] = term.value;
  return out;
}

/**
 * True when a patch does not move the row out of the caller's scope: every
 * scope column it sets equals that column's value in some predicate.
 */
export function patchKeepsScope(
  scope: RowScope | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!scope) return true;
  for (const column of scopeColumns(scope)) {
    if (!Object.prototype.hasOwnProperty.call(values, column)) continue;
    const next = String(values[column] ?? "");
    const allowed = scope.anyOf.some((predicate) =>
      predicate.some((term) => term.column === column && term.value === next),
    );
    if (!allowed) return false;
  }
  return true;
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
 * Allows OR together: the scope is the union of their row predicates.
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
    const anyOf: RowPredicate[] = [];
    for (const policy of allows) {
      const predicate = rowPredicateFrom(parseRulesJson(policy.rules), ctx);
      if (!predicate) return { allowed: true };
      anyOf.push(predicate);
    }
    return { allowed: true, scope: { anyOf } };
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
