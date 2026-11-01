import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertProjectScopeMatch,
  extractProjectRestPath,
  extractProjectSlug,
  isProjectScopedPath,
  projectHref,
} from "./project-scope.js";

describe("project-scope S0045", () => {
  it("builds and parses project hrefs", () => {
    assert.equal(projectHref("acme", "/tables"), "/p/acme/tables");
    assert.equal(extractProjectSlug("/p/acme/tables"), "acme");
    assert.equal(extractProjectRestPath("/p/acme/tables/foo"), "/tables/foo");
    assert.equal(extractProjectRestPath("/p/acme"), "");
  });

  it("detects legacy scoped roots", () => {
    assert.equal(isProjectScopedPath("/tables"), true);
    assert.equal(isProjectScopedPath("/auth/users"), true);
    assert.equal(isProjectScopedPath("/projects"), false);
    assert.equal(isProjectScopedPath("/login"), false);
  });

  it("rejects cross-project header vs cookie", () => {
    const mismatch = assertProjectScopeMatch("alpha", "beta");
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) {
      assert.equal(mismatch.status, 403);
      assert.equal(mismatch.error, "project_mismatch");
    }

    const ok = assertProjectScopeMatch("alpha", "alpha");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.slug, "alpha");

    const cookieOnly = assertProjectScopeMatch("alpha", null);
    assert.equal(cookieOnly.ok, true);
  });
});
