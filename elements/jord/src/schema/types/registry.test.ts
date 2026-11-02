import { describe, expect, it } from "vitest";

import { fromSql } from "./from-sql.js";
import { mapSqliteTypeToPostgres } from "./migrate.js";
import {
  listTypeIdsForDialect,
  TYPE_REGISTRY,
} from "./registry.js";
import { toSql } from "./to-sql.js";
import type { JordDialect, TypeParams } from "./types.js";

const SAMPLE_PARAMS: Record<string, TypeParams> = {
  varchar: { length: 64 },
  char: { length: 2 },
  numeric: { precision: 10, scale: 2 },
  decimal: { precision: 8, scale: 1 },
  array: { element: "integer" },
};

describe("S0052 type registry", () => {
  it("round-trips every registry id on each dialect that supports it", () => {
    for (const dialect of ["libsql", "postgres"] as const) {
      for (const id of listTypeIdsForDialect(dialect)) {
        if (id === "enum_text") continue; // renders as text; managed in S0053
        const params = SAMPLE_PARAMS[id];
        const rendered = toSql(dialect, id, params);
        expect(rendered.ok, `${dialect}:${id} toSql`).toBe(true);
        if (!rendered.ok) continue;
        const parsed = fromSql(dialect, rendered.sql);
        expect(parsed.kind, `${dialect}:${id} fromSql kind`).toBe("known");
        if (parsed.kind !== "known") continue;
        expect(parsed.id, `${dialect}:${id} id`).toBe(id);
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            expect(parsed.params[k], `${dialect}:${id} param ${k}`).toBe(v);
          }
        }
      }
    }
  });

  it("maps unknown Postgres types to custom read-only", () => {
    const logical = fromSql("postgres", "geometry(Point,4326)");
    expect(logical).toEqual({
      kind: "custom",
      raw: "geometry(Point,4326)",
      readOnly: true,
    });
  });

  it("accepts legacy uppercase affinities via toSql", () => {
    expect(toSql("postgres", "TEXT")).toMatchObject({
      ok: true,
      id: "text",
      sql: "text",
    });
    expect(toSql("postgres", "INTEGER")).toMatchObject({
      ok: true,
      id: "integer",
      sql: "integer",
    });
    expect(toSql("postgres", "REAL")).toMatchObject({
      ok: true,
      id: "real",
      sql: "real",
    });
    expect(toSql("postgres", "BLOB")).toMatchObject({
      ok: true,
      id: "blob",
      sql: "bytea",
    });
  });

  it("rejects Postgres-only types on libSQL", () => {
    const r = toSql("libsql", "jsonb");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("unsupported_dialect");
  });

  it("preserves S0024 migrate affinity mapping", () => {
    expect(mapSqliteTypeToPostgres("TEXT")).toBe("text");
    expect(mapSqliteTypeToPostgres("INTEGER")).toBe("bigint");
    expect(mapSqliteTypeToPostgres("REAL")).toBe("double precision");
    expect(mapSqliteTypeToPostgres("BLOB")).toBe("bytea");
  });

  it("lists F0024 families without empty coverage holes", () => {
    const families = new Set(TYPE_REGISTRY.map((e) => e.family));
    for (const f of [
      "strings",
      "numbers",
      "boolean",
      "time",
      "identity",
      "documents",
      "binary",
      "network",
      "enumerated",
    ]) {
      expect(families.has(f as never)).toBe(true);
    }
  });

  it("parses format_type-style timestamptz / numeric", () => {
    expect(fromSql("postgres", "timestamp with time zone")).toMatchObject({
      kind: "known",
      id: "timestamptz",
    });
    expect(fromSql("postgres", "numeric(10,2)")).toMatchObject({
      kind: "known",
      id: "numeric",
      params: { precision: 10, scale: 2 },
    });
  });
});

describe("toSql dialect matrix smoke", () => {
  const cases: Array<{
    dialect: JordDialect;
    id: string;
    params?: TypeParams;
    sql: string;
  }> = [
    { dialect: "libsql", id: "text", sql: "TEXT" },
    { dialect: "postgres", id: "text", sql: "text" },
    { dialect: "libsql", id: "varchar", params: { length: 12 }, sql: "VARCHAR(12)" },
    { dialect: "postgres", id: "jsonb", sql: "jsonb" },
    { dialect: "postgres", id: "array", params: { element: "uuid" }, sql: "uuid[]" },
  ];

  for (const c of cases) {
    it(`${c.dialect} ${c.id} → ${c.sql}`, () => {
      const r = toSql(c.dialect, c.id, c.params);
      expect(r).toEqual({
        ok: true,
        sql: c.sql,
        id: c.id,
        params: expect.objectContaining(c.params ?? {}),
      });
    });
  }
});
