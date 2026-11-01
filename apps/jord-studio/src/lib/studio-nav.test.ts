import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTEXTUAL_LABELS,
  navForRole,
  resolveActiveNavItem,
  resolveContextual,
  STUDIO_NAV,
} from "./studio-nav.js";

describe("studio-nav contextual", () => {
  const groups = navForRole("admin", "acme");

  it("declares contextual on data/runtime/api/sql/users items", () => {
    const kinds = new Set(
      STUDIO_NAV.flatMap((g) =>
        g.items.map((i) => i.contextual).filter(Boolean),
      ),
    );
    for (const key of Object.keys(CONTEXTUAL_LABELS)) {
      assert.ok(kinds.has(key as keyof typeof CONTEXTUAL_LABELS), key);
    }
  });

  it("resolves tables contextual under /p/acme/tables", () => {
    assert.equal(resolveContextual("/p/acme/tables", groups), "tables");
    assert.equal(resolveContextual("/p/acme/records", groups), "tables");
    assert.equal(resolveContextual("/p/acme/records/new", groups), "tables");
  });

  it("resolves jobs / endpoints / queries / users / buckets", () => {
    assert.equal(resolveContextual("/p/acme/jobs", groups), "jobs");
    assert.equal(resolveContextual("/p/acme/logs", groups), "jobs");
    assert.equal(resolveContextual("/p/acme/apis/table", groups), "endpoints");
    assert.equal(resolveContextual("/p/acme/database/sql", groups), "queries");
    assert.equal(resolveContextual("/p/acme/auth/users", groups), "users");
    assert.equal(resolveContextual("/p/acme/storage", groups), "buckets");
  });

  it("returns null when the section has no contextual column", () => {
    assert.equal(resolveContextual("/p/acme/schema", groups), null);
    assert.equal(resolveContextual("/p/acme/help", groups), null);
    assert.equal(resolveContextual("/projects", groups), null);
  });

  it("picks the longest href match for nested records", () => {
    const item = resolveActiveNavItem("/p/acme/records/abc", groups);
    assert.equal(item?.id, "records");
  });
});
