import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SCHEMA_ALL,
  fallbackDefaultSchema,
  resolveSchemaSelection,
} from "./studio-schema-prefs";

describe("studio-schema-prefs", () => {
  it("prefers URL over stored and default", () => {
    assert.equal(
      resolveSchemaSelection({
        urlSchema: "app",
        stored: "public",
        defaultSchema: "public",
        available: ["public", "app"],
      }),
      "app",
    );
  });

  it("falls back to stored then default", () => {
    assert.equal(
      resolveSchemaSelection({
        urlSchema: null,
        stored: "app",
        defaultSchema: "public",
        available: ["public", "app"],
      }),
      "app",
    );
    assert.equal(
      resolveSchemaSelection({
        urlSchema: null,
        stored: "gone",
        defaultSchema: "public",
        available: ["public", "app"],
      }),
      "public",
    );
  });

  it("keeps All schemas sentinel", () => {
    assert.equal(
      resolveSchemaSelection({
        urlSchema: SCHEMA_ALL,
        stored: "public",
        defaultSchema: "public",
        available: ["public", "app"],
      }),
      SCHEMA_ALL,
    );
  });

  it("fallbackDefaultSchema prefers public then main", () => {
    assert.equal(fallbackDefaultSchema(["main", "public"]), "public");
    assert.equal(fallbackDefaultSchema(["main"]), "main");
    assert.equal(fallbackDefaultSchema([]), "public");
  });
});
