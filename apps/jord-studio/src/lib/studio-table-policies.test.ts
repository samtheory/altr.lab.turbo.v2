import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAffectedRowsQuery,
  parsePolicyRules,
  serializePolicyRules,
  summarizePolicyRules,
} from "./studio-table-policies";

describe("studio-table-policies", () => {
  it("summarizes role and owner rules", () => {
    const raw = JSON.stringify([
      { kind: "role_in", config: { roles: ["user"] } },
      { kind: "owner_eq", config: { column: "owner_id" } },
    ]);
    const summary = summarizePolicyRules(raw);
    assert.equal(summary.text, "role∈[user] ∧ owner_id=uid");
    assert.deepEqual(summary.rowColumns, ["owner_id"]);
  });

  it("round-trips rule drafts", () => {
    const rules = parsePolicyRules(
      '[{"kind":"claim_eq","config":{"claim":"email","column":"owner_email"}}]',
    );
    assert.equal(rules[0]?.kind, "claim_eq");
    assert.equal(
      serializePolicyRules(rules),
      '[{"kind":"claim_eq","config":{"claim":"email","column":"owner_email"}}]',
    );
  });

  it("builds affected-row preview query with schema + filter", () => {
    const { pathQuery, note } = buildAffectedRowsQuery({
      schema: "app",
      rulesJson: JSON.stringify([
        { kind: "owner_eq", config: { column: "owner_id" } },
      ]),
      previewValue: "u1",
      limit: 5,
    });
    const params = new URLSearchParams(pathQuery);
    assert.equal(params.get("schema"), "app");
    assert.equal(params.get("owner_id"), "eq.u1");
    assert.equal(params.get("count"), "exact");
    assert.match(note, /owner_id/);
  });
});
