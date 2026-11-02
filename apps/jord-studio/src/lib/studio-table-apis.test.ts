import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildExampleCurl,
  buildExampleFetch,
  buildTableApiEndpoints,
  qualifyTable,
  realtimeChannelName,
  tryItBffPath,
} from "./studio-table-apis";

describe("studio-table-apis", () => {
  it("qualifies schema.table", () => {
    assert.equal(qualifyTable("public", "notes"), "notes");
    assert.equal(qualifyTable("app", "notes"), "app.notes");
  });

  it("builds table + generated endpoints with schema query", () => {
    const eps = buildTableApiEndpoints({
      table: "notes",
      schema: "app",
      publishableKeyPlaceholder: "jord_pub_test",
    });
    const get = eps.find((e) => e.id === "v1-get");
    assert.ok(get);
    assert.equal(get.method, "GET");
    assert.match(get.defaultQuery ?? "", /schema=app/);
    assert.match(get.authHeader, /jord_pub_test/);
    assert.equal(realtimeChannelName("notes"), "jord.change:notes");
  });

  it("builds copyable curl / fetch and try-it BFF path", () => {
    const eps = buildTableApiEndpoints({
      table: "notes",
      schema: "public",
    });
    const ep = eps.find((e) => e.id === "v1-get");
    assert.ok(ep);
    assert.match(buildExampleCurl(ep), /curl -sS/);
    assert.match(buildExampleFetch(ep), /fetch\(/);
    assert.equal(tryItBffPath(ep, "limit=5"), "/api/v1/notes?limit=5");
  });
});
