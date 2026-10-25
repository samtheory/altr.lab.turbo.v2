import { describe, expect, it } from "vitest";

import {
  mapSqliteTypeToPostgres,
  shouldSkipMigrateTable,
} from "./migrate-type-map.js";

describe("S0024 migrate type map", () => {
  it("maps the four SQLite affinities", () => {
    expect(mapSqliteTypeToPostgres("TEXT")).toBe("text");
    expect(mapSqliteTypeToPostgres("INTEGER")).toBe("bigint");
    expect(mapSqliteTypeToPostgres("REAL")).toBe("double precision");
    expect(mapSqliteTypeToPostgres("BLOB")).toBe("bytea");
  });

  it("skips jord_vix shadow tables", () => {
    expect(shouldSkipMigrateTable("jord_vix_notes")).toBe(true);
    expect(shouldSkipMigrateTable("JORD_VIX_x")).toBe(true);
    expect(shouldSkipMigrateTable("records")).toBe(false);
  });
});
