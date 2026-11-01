import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  inspectorHref,
  parseInspectorSearch,
  withInspectorSearch,
} from "./studio-inspector";

describe("studio-inspector URL helpers", () => {
  it("parses create-record", () => {
    const state = parseInspectorSearch(
      new URLSearchParams("inspector=create-record&bucket=lab"),
    );
    assert.deepEqual(state, { id: "create-record", props: {} });
  });

  it("requires recordId for record-detail", () => {
    assert.equal(
      parseInspectorSearch(new URLSearchParams("inspector=record-detail")),
      null,
    );
    assert.deepEqual(
      parseInspectorSearch(
        new URLSearchParams("inspector=record-detail&recordId=abc"),
      ),
      { id: "record-detail", props: { recordId: "abc" } },
    );
  });

  it("rejects unknown inspector ids", () => {
    assert.equal(
      parseInspectorSearch(new URLSearchParams("inspector=nope")),
      null,
    );
  });

  it("parses create-table with schema prop", () => {
    assert.deepEqual(
      parseInspectorSearch(
        new URLSearchParams("inspector=create-table&schema=app"),
      ),
      { id: "create-table", props: { schema: "app" } },
    );
  });

  it("clears inspector keys while keeping other params", () => {
    const next = withInspectorSearch(
      new URLSearchParams("inspector=migrate&job=1&table=users"),
      null,
    );
    assert.equal(next.get("inspector"), null);
    assert.equal(next.get("table"), null);
    assert.equal(next.get("job"), "1");
  });

  it("builds deep-link href", () => {
    const href = inspectorHref(
      "/p/acme/records",
      new URLSearchParams("bucket=lab"),
      { id: "create-record", props: {} },
    );
    assert.equal(href, "/p/acme/records?bucket=lab&inspector=create-record");
  });
});
