import { describe, expect, it } from "vitest";

import { BUILTIN_POLICY_RULE_KINDS } from "./kinds.js";
import { describePolicy, describeRule, policyKind } from "./plain-language.js";

const policy = (
  rules: unknown,
  extra?: Partial<{ effect: "allow" | "deny"; operation: "select" | "insert" | "update" | "delete" }>,
) => ({
  effect: extra?.effect ?? ("allow" as const),
  operation: extra?.operation ?? ("select" as const),
  tableName: "posts",
  rules: typeof rules === "string" ? rules : JSON.stringify(rules),
});

describe("S0077 policy plain language", () => {
  it("renders owner_eq like the card example", () => {
    expect(describePolicy(policy([{ kind: "owner_eq", config: { column: "owner_id" } }]))).toBe(
      "Allow select on posts when owner_id equals the caller id",
    );
  });

  it("renders every builtin kind deterministically", () => {
    const cases: Record<(typeof BUILTIN_POLICY_RULE_KINDS)[number], [Record<string, unknown>, string]> = {
      role_in: [{ roles: ["user", "anon"] }, "the caller role is one of user, anon"],
      bucket_in: [{ buckets: ["a", "b"] }, "the bucket is one of a, b"],
      bucket_eq: [{ bucket: "lab" }, "the bucket is lab"],
      always: [{}, "always"],
      owner_eq: [{ column: "owner_id" }, "owner_id equals the caller id"],
      claim_eq: [{ claim: "email", column: "owner_email" }, "owner_email equals the caller email claim"],
    };
    for (const kind of BUILTIN_POLICY_RULE_KINDS) {
      const [config, text] = cases[kind];
      expect(describeRule({ kind, config })).toBe(text);
    }
    expect(describeRule({ kind: "role_in", config: { roles: ["user"] } })).toBe("the caller role is user");
  });

  it("covers always, deny, AND of rules, empty, bad JSON and unknown kinds", () => {
    expect(describePolicy(policy([{ kind: "always" }], { effect: "deny", operation: "delete" }))).toBe(
      "Deny delete on posts for every caller",
    );
    expect(
      describePolicy(
        policy([
          { kind: "role_in", config: { roles: ["user"] } },
          { kind: "claim_eq", config: { claim: "tenant", column: "tenant_id" } },
        ]),
      ),
    ).toBe("Allow select on posts when the caller role is user and tenant_id equals the caller tenant claim");
    expect(describePolicy(policy([]))).toBe("Allow select on posts never (the policy has no rules)");
    expect(describePolicy(policy("not json"))).toBe("Allow select on posts never (the policy has no rules)");
    expect(describeRule({ kind: "sql_expr" })).toBe("unknown rule sql_expr (never matches)");
    expect(describeRule({ kind: "owner_eq" })).toBe("owner_eq has no column (never matches)");
    expect(describeRule({ kind: "claim_eq", config: { column: "x" } })).toBe(
      "claim_eq is missing claim or column (never matches)",
    );
    expect(describeRule({ kind: "bucket_eq" })).toBe("the bucket is unset (never matches)");
    expect(describeRule({ kind: "role_in", config: { roles: [] } })).toBe(
      "the caller role is in an empty list (never matches)",
    );
  });

  it("names the policy kind from its rules", () => {
    expect(policyKind(policy([{ kind: "role_in" }, { kind: "owner_eq" }]))).toBe("role_in+owner_eq");
    expect(policyKind(policy([]))).toBe("none");
  });
});
