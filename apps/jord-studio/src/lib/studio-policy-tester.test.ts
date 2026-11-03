import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEvaluateRequest,
  CLAIMS_MAX_BYTES,
  describeTesterError,
  normalizeEvaluateResult,
  normalizeRowScope,
  rowScopeTermText,
  userStatusNotices,
  type EvaluateResult,
  parseClaimsOverride,
  pushHistory,
  reasonText,
  validateEvaluateBody,
  type HistoryEntry,
  type TesterForm,
} from "./studio-policy-tester";

const base: TesterForm = {
  principalId: "u1",
  claimsText: "",
  operation: "select",
  table: "notes",
  schema: "public",
  pk: {},
};

describe("studio-policy-tester", () => {
  it("builds a minimal request", () => {
    const r = buildEvaluateRequest(base);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.body.principalId, "u1");
      assert.equal(r.body.role, "user");
      assert.equal(r.body.row, undefined);
    }
  });

  it("anonymous has no principalId", () => {
    const r = buildEvaluateRequest({ ...base, principalId: null });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.body.role, "anon");
      assert.equal("principalId" in r.body, false);
    }
  });

  it("requires every composite pk field or none", () => {
    const partial = buildEvaluateRequest({ ...base, pk: { a: "1", b: "" } });
    assert.equal(partial.ok, false);
    const any = buildEvaluateRequest({ ...base, pk: { a: "", b: "" } });
    assert.ok(any.ok);
    const full = buildEvaluateRequest({
      ...base,
      pk: { a: "1", b: "x" },
      pkNumeric: { a: true },
    });
    assert.ok(full.ok);
    if (full.ok) assert.deepEqual(full.body.row, { a: 1, b: "x" });
  });

  it("claims: strips reserved, rejects bad json / arrays / oversize", () => {
    const ok = parseClaimsOverride('{"sub":"x","plan":"pro"}');
    assert.ok(ok.ok);
    if (ok.ok) {
      assert.deepEqual(ok.claims, { plan: "pro" });
      assert.deepEqual(ok.ignored, ["sub"]);
    }
    assert.equal(parseClaimsOverride("{").ok, false);
    assert.equal(parseClaimsOverride("[1]").ok, false);
    assert.equal(
      parseClaimsOverride(JSON.stringify({ a: "x".repeat(CLAIMS_MAX_BYTES) })).ok,
      false,
    );
    assert.ok(parseClaimsOverride("  ").ok);
  });

  it("validates BFF body", () => {
    assert.equal(validateEvaluateBody(null).ok, false);
    assert.equal(validateEvaluateBody({ operation: "drop", table: "t" }).ok, false);
    assert.equal(validateEvaluateBody({ operation: "select", table: "" }).ok, false);
    assert.equal(
      validateEvaluateBody({ operation: "select", table: "t", row: { id: {} } }).ok,
      false,
    );
    const good = validateEvaluateBody({
      operation: "select",
      table: "t",
      row: { id: 1 },
      junk: true,
    });
    assert.ok(good.ok);
    if (good.ok) assert.equal("junk" in good.body, false);
  });

  it("maps reasons, unknown verbatim", () => {
    assert.match(reasonText("no_matching_policy_default_deny"), /default/);
    assert.equal(reasonText("weird_new_reason"), "weird_new_reason");
    assert.match(reasonText("user_disabled"), /disabled/);
    assert.match(reasonText("user_disabled"), /401/);
  });

  const legacy = {
    allowed: true,
    operation: "select",
    table: "notes",
    schema: "public",
    principal: { kind: "user", uid: "u1", claims: { sub: "u1" } },
    matchedPolicy: null,
    rowScope: { column: "owner_id", equals: null },
    rowsEvaluated: 1,
    rowCount: 3,
    rowAllowed: null,
    reason: "allowed_by_policy",
  } as unknown as EvaluateResult;

  it("tolerates an older server response lacking new fields", () => {
    const r = normalizeEvaluateResult(legacy);
    assert.deepEqual(r.ignoredClaims, []);
    assert.equal(r.hypothetical, null);
    assert.equal(r.hypotheticalNote, undefined);
    assert.equal(r.principal.userStatus, null);
    assert.equal(r.countsIgnoreNativeRls, false);
    assert.deepEqual(r.rowScope, {
      anyOf: [{ column: "owner_id", equals: null }],
      lossy: false,
    });
    assert.deepEqual(userStatusNotices(r.principal.userStatus), []);
  });

  it("normalises the new response fields", () => {
    const r = normalizeEvaluateResult({
      ...legacy,
      rowScope: {
        anyOf: [
          { column: "owner_id", equals: null },
          { column: "org", equals: "acme" },
          { nope: 1 },
        ],
        lossy: true,
      },
      ignoredClaims: ["plan", 5],
      hypothetical: {
        allowed: false,
        matchedPolicy: null,
        reason: "x",
        rowAllowed: null,
        rowCount: 0,
      },
      hypotheticalNote: "advisory",
      countsIgnoreNativeRls: true,
      principal: {
        kind: "user",
        uid: "u1",
        claims: {},
        userStatus: { disabled: true, emailConfirmed: false, hasLiveSession: false },
      },
    } as unknown as EvaluateResult);
    assert.equal(r.rowScope?.anyOf.length, 2);
    assert.equal(r.rowScope?.lossy, true);
    assert.deepEqual(r.ignoredClaims, ["plan"]);
    assert.equal(r.hypothetical?.allowed, false);
    assert.equal(r.hypothetical?.rowCount, 0);
    assert.equal(r.countsIgnoreNativeRls, true);
    assert.deepEqual(
      userStatusNotices(r.principal.userStatus).map((n) => n.level),
      ["error", "warning", "info"],
    );
    assert.equal(rowScopeTermText({ column: "org", equals: "acme" }), "org = acme");
    assert.equal(rowScopeTermText({ column: "owner_id", equals: null }), "owner_id = caller id");
    assert.equal(normalizeRowScope(null), null);
    assert.equal(normalizeRowScope({ foo: 1 }), null);
  });

  it("describes errors", () => {
    assert.equal(describeTesterError(429).retryable, true);
    assert.equal(describeTesterError(0).retryable, true);
    assert.equal(describeTesterError(400, "bad").message, "bad");
    assert.equal(describeTesterError(403).retryable, false);
  });

  it("caps history at 10, newest first", () => {
    let h: HistoryEntry[] = [];
    for (let i = 0; i < 14; i++) {
      h = pushHistory(h, {
        id: String(i),
        at: i,
        label: "x",
        allowed: true,
        hypotheticalAllowed: null,
        request: { operation: "select", table: "t" },
      });
    }
    assert.equal(h.length, 10);
    assert.equal(h[0]!.id, "13");
  });
});
