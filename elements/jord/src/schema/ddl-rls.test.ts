import { describe, expect, it } from "vitest";

import type { JordPolicy } from "../port.js";
import {
  compilePolicySql,
  planSyncRecordsRls,
  quoteSqlLiteral,
} from "./ddl-rls.js";

function policy(partial: Partial<JordPolicy> & Pick<JordPolicy, "effect" | "operation" | "rules">): JordPolicy {
  return {
    id: partial.id ?? "11111111-1111-1111-1111-111111111111",
    name: partial.name ?? "p",
    tableName: partial.tableName ?? "records",
    operation: partial.operation,
    effect: partial.effect,
    rules: partial.rules,
    priority: partial.priority ?? 0,
    enabled: partial.enabled ?? true,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
  };
}

describe("ddl-rls planner", () => {
  it("quotes literals", () => {
    expect(quoteSqlLiteral("o'brien")).toBe("'o''brien'");
  });

  it("compiles deny role_in as a SELECT policy", () => {
    const sql = compilePolicySql(
      policy({
        operation: "select",
        effect: "deny",
        rules: JSON.stringify([
          { kind: "role_in", config: { roles: ["readonly"] } },
        ]),
      }),
    );
    expect(sql).toContain('CREATE POLICY "jord_rls_records_select"');
    expect(sql).toContain("FOR SELECT");
    expect(sql).toContain("THEN FALSE");
    expect(sql).toContain("'readonly'");
    expect(sql).toContain("current_setting('jord.role', true)");
  });

  it("skips disabled, non-records, and unknown kinds", () => {
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "deny",
          enabled: false,
          rules: JSON.stringify([{ kind: "always" }]),
        }),
      ),
    ).toBeNull();
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "allow",
          tableName: "notes",
          rules: JSON.stringify([{ kind: "always" }]),
        }),
      ),
    ).toBeNull();
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "deny",
          rules: JSON.stringify([{ kind: "jwt_claim" }]),
        }),
      ),
    ).toBeNull();
  });

  it("lets a matching deny override a matching allow", () => {
    const plan = planSyncRecordsRls([
      policy({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        operation: "select",
        effect: "allow",
        priority: 10,
        createdAt: 2,
        rules: JSON.stringify([{ kind: "role_in", config: { roles: ["admin"] } }]),
      }),
      policy({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        operation: "select",
        effect: "deny",
        priority: 10,
        createdAt: 3,
        rules: JSON.stringify([{ kind: "always" }]),
      }),
    ]);
    expect(plan.enable).toBe(true);
    const select = plan.statements.find((sql) => sql.includes("FOR SELECT"));
    expect(select).toBeDefined();
    const denyAt = select!.indexOf("THEN FALSE");
    const allowAt = select!.indexOf("THEN TRUE");
    expect(denyAt).toBeGreaterThan(-1);
    expect(allowAt).toBeGreaterThan(denyAt);
    expect(select).toContain(
      "ELSE current_setting('jord.role', true) IN ('admin', 'editor', 'readonly')",
    );
    expect(plan.statements.some((sql) => sql.includes("FORCE ROW LEVEL SECURITY"))).toBe(
      true,
    );
  });

  it("disables RLS when nothing compiles", () => {
    const plan = planSyncRecordsRls([
      policy({
        operation: "insert",
        effect: "deny",
        enabled: false,
        rules: JSON.stringify([{ kind: "always" }]),
      }),
    ]);
    expect(plan.enable).toBe(false);
    expect(plan.statements.some((sql) => sql.includes("DISABLE ROW LEVEL SECURITY"))).toBe(
      true,
    );
    expect(plan.statements.some((sql) => sql.startsWith("CREATE POLICY"))).toBe(false);
  });

  it("emits bucket_eq against the column and the GUC", () => {
    const sql = compilePolicySql(
      policy({
        operation: "update",
        effect: "allow",
        rules: JSON.stringify([
          { kind: "bucket_eq", config: { bucket: "lab" } },
        ]),
      }),
    );
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("WITH CHECK");
    expect(sql).toContain("bucket = 'lab'");
    expect(sql).toContain("current_setting('jord.bucket', true) = 'lab'");
  });

  it("compiles owner_eq against jord.uid", () => {
    const sql = compilePolicySql(
      policy({
        operation: "select",
        effect: "allow",
        rules: JSON.stringify([
          { kind: "owner_eq", config: { column: "owner_id" } },
        ]),
      }),
    );
    expect(sql).toContain(`"owner_id" = current_setting('jord.uid', true)`);
  });

  it("skips owner_eq with a non-ident column and claim_eq unless the claim is sub", () => {
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "allow",
          rules: JSON.stringify([
            { kind: "owner_eq", config: { column: "owner-id" } },
          ]),
        }),
      ),
    ).toBeNull();
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "allow",
          rules: JSON.stringify([
            { kind: "claim_eq", config: { claim: "sub", column: "user_id" } },
          ]),
        }),
      ),
    ).toContain(`"user_id" = current_setting('jord.uid', true)`);
    expect(
      compilePolicySql(
        policy({
          operation: "select",
          effect: "allow",
          rules: JSON.stringify([
            { kind: "claim_eq", config: { claim: "email", column: "email" } },
          ]),
        }),
      ),
    ).toBeNull();
  });
});
