import { describe, expect, it } from "vitest";

import {
  normalizeExplainPlan,
  preferLibsqlQueryPlan,
  preferPostgresJsonExplain,
} from "./sql-explain.js";
import { isExplainSql, sqlErrorPosition } from "./sql-console.js";

describe("S0065 explain helpers", () => {
  it("detects EXPLAIN after comments", () => {
    expect(isExplainSql("EXPLAIN SELECT 1")).toBe(true);
    expect(isExplainSql("-- c\nEXPLAIN QUERY PLAN SELECT 1")).toBe(true);
    expect(isExplainSql("SELECT 1")).toBe(false);
  });

  it("rewrites Postgres EXPLAIN to FORMAT JSON", () => {
    expect(preferPostgresJsonExplain("EXPLAIN SELECT 1")).toBe(
      "EXPLAIN (FORMAT JSON) SELECT 1",
    );
    expect(preferPostgresJsonExplain("EXPLAIN ANALYZE SELECT 1")).toBe(
      "EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1",
    );
    expect(preferPostgresJsonExplain("EXPLAIN (ANALYZE) SELECT 1")).toBe(
      "EXPLAIN (FORMAT JSON, ANALYZE) SELECT 1",
    );
    expect(preferPostgresJsonExplain("EXPLAIN (FORMAT JSON) SELECT 1")).toBe(
      "EXPLAIN (FORMAT JSON) SELECT 1",
    );
  });

  it("rewrites libSQL EXPLAIN to QUERY PLAN", () => {
    expect(preferLibsqlQueryPlan("EXPLAIN SELECT 1")).toBe(
      "EXPLAIN QUERY PLAN SELECT 1",
    );
    expect(preferLibsqlQueryPlan("EXPLAIN QUERY PLAN SELECT 1")).toBe(
      "EXPLAIN QUERY PLAN SELECT 1",
    );
  });

  it("normalizes Postgres JSON plan rows", () => {
    const plan = normalizeExplainPlan("postgres", ["QUERY PLAN"], [
      {
        "QUERY PLAN": [
          {
            Plan: {
              "Node Type": "Seq Scan",
              "Relation Name": "records",
              "Plan Rows": 10,
              "Total Cost": 1.5,
              Plans: [
                {
                  "Node Type": "Result",
                  "Plan Rows": 1,
                  "Total Cost": 0.01,
                },
              ],
            },
          },
        ],
      },
    ]);
    expect(plan).toMatchObject({
      node: "Seq Scan on records",
      rows: 10,
      cost: 1.5,
      children: [{ node: "Result", rows: 1, cost: 0.01 }],
    });
  });

  it("normalizes libSQL QUERY PLAN parent/id rows", () => {
    const plan = normalizeExplainPlan(
      "libsql",
      ["id", "parent", "notused", "detail"],
      [
        { id: 2, parent: 0, notused: 0, detail: "SCAN records" },
        { id: 3, parent: 2, notused: 0, detail: "USE TEMP B-TREE" },
      ],
    );
    expect(plan).toMatchObject({
      node: "SCAN records",
      children: [{ node: "USE TEMP B-TREE", children: [] }],
    });
  });

  it("maps Postgres position to line/column", () => {
    expect(sqlErrorPosition("SELECT\n  bad", { position: "10" })).toEqual({
      line: 2,
      column: 3,
    });
  });
});
