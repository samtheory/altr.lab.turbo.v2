import { describe, expect, it } from "vitest";

import {
  buildSqlCompletionItems,
  fkJoinSuggestions,
  formatSql,
  isJoinConditionContext,
  qualifyTable,
  sqlFunctions,
  sqlKeywords,
  sqlLanguageId,
  type SqlCompletionModel,
} from "./sql-language";

const orgs = {
  name: "orgs",
  schema: "public",
  columns: [
    { name: "id", type: "UUID", pk: true },
    { name: "name", type: "TEXT" },
  ],
};

const orders: SqlCompletionModel["tables"][number] = {
  name: "orders",
  schema: "public",
  columns: [
    { name: "id", type: "UUID", pk: true },
    { name: "org_id", type: "UUID" },
    { name: "total_cents", type: "BIGINT" },
  ],
  foreignKeys: [
    {
      columns: ["org_id"],
      references: { schema: "public", table: "orgs", columns: ["id"] },
    },
  ],
};

const modelA: SqlCompletionModel = {
  dialect: "postgres",
  schemas: ["public", "auth"],
  tables: [orgs, orders],
};

const modelB: SqlCompletionModel = {
  dialect: "libsql",
  schemas: ["main"],
  tables: [
    {
      name: "invoices",
      schema: "main",
      columns: [{ name: "id", type: "TEXT", pk: true }],
    },
  ],
};

describe("sqlLanguageId", () => {
  it("maps libSQL to sql and Postgres to pgsql", () => {
    expect(sqlLanguageId("libsql")).toBe("sql");
    expect(sqlLanguageId("postgres")).toBe("pgsql");
  });
});

describe("completion items", () => {
  it("offers columns with their type in the detail", () => {
    const items = buildSqlCompletionItems(modelA);
    const column = items.find(
      (i) => i.kind === "column" && i.label === "total_cents",
    );
    expect(column?.detail).toBe("public.orders.total_cents · BIGINT");
  });

  it("offers tables, schemas, functions and dialect keywords", () => {
    const items = buildSqlCompletionItems(modelA);
    expect(items.some((i) => i.kind === "table" && i.label === "orders")).toBe(true);
    expect(items.some((i) => i.kind === "schema" && i.label === "auth")).toBe(true);
    expect(items.some((i) => i.kind === "function" && i.label === "jsonb_set")).toBe(
      true,
    );
    expect(items.some((i) => i.label === "ILIKE")).toBe(true);
    expect(items.some((i) => i.label === "PRAGMA")).toBe(false);
  });

  it("never leaks another project's objects", () => {
    const items = buildSqlCompletionItems(modelB);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("invoices");
    expect(labels).not.toContain("orders");
    expect(labels).not.toContain("orgs");
    expect(labels).not.toContain("total_cents");
  });

  it("keeps dialect keyword and function lists separate", () => {
    expect(sqlKeywords("libsql")).toContain("PRAGMA");
    expect(sqlKeywords("postgres")).not.toContain("PRAGMA");
    expect(sqlFunctions("libsql")).toContain("json_extract");
    expect(sqlFunctions("postgres")).toContain("jsonb_build_object");
  });
});

describe("fk join suggestions", () => {
  it("builds a qualified comparison for each fk column", () => {
    const suggestions = fkJoinSuggestions(modelA);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.insertText).toBe('"orders"."org_id" = "orgs"."id"');
    expect(suggestions[0]?.kind).toBe("join");
  });

  it("only applies inside an ON condition", () => {
    expect(isJoinConditionContext("select * from orders join orgs on ")).toBe(true);
    expect(isJoinConditionContext("select * from orders join orgs on o.")).toBe(true);
    expect(isJoinConditionContext("select * from orders")).toBe(false);
  });

  it("omits the implicit schema", () => {
    expect(qualifyTable({ name: "users", schema: "main" }, "libsql")).toBe('"users"');
    expect(qualifyTable({ name: "users", schema: "auth" }, "libsql")).toBe(
      '"auth"."users"',
    );
  });
});

describe("formatSql", () => {
  it("uppercases keywords and breaks major clauses", () => {
    expect(
      formatSql("select id, name from users where id = 1 and name = 'a and b' order by name"),
    ).toBe(
      "SELECT id, name\nFROM users\nWHERE id = 1\n  AND name = 'a and b'\nORDER BY name\n",
    );
  });

  it("keeps string literals, identifiers and comments verbatim", () => {
    const out = formatSql('select "--from" from t -- keep this case');
    expect(out).toContain('"--from"');
    expect(out).toContain("-- keep this case");
  });

  it("is stable when run twice", () => {
    const once = formatSql("select * from t where a = 1 or b = 2");
    expect(formatSql(once)).toBe(once);
  });
});
