import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchemaTable } from "./schema";
import {
  DEFAULT_SQL,
  SQL_DRAFT_PREFIX,
  buildStudioSqlModel,
  createSqlModelCache,
  inferSqlDialect,
  mapWithConcurrency,
  readSqlDraft,
  sqlDialectForEngine,
  sqlDraftKey,
  tableDetailPath,
  writeSqlDraft,
} from "./studio-sql-editor";

const orders: SchemaTable = {
  name: "orders",
  schema: "public",
  columns: [
    { name: "id", type: "UUID", notnull: true, pk: true, dflt_value: null },
    { name: "org_id", type: "UUID", notnull: true, pk: false, dflt_value: null },
  ],
  foreignKeys: [
    {
      columns: ["org_id"],
      references: { schema: "public", table: "orgs", columns: ["id"] },
    },
  ],
};

const invoices: SchemaTable = {
  name: "invoices",
  schema: "main",
  columns: [{ name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null }],
};

describe("sql dialect resolution", () => {
  it("maps project engines onto editor dialects", () => {
    assert.equal(sqlDialectForEngine("postgres"), "postgres");
    assert.equal(sqlDialectForEngine("libsql-file"), "libsql");
    assert.equal(sqlDialectForEngine("libsql-turso"), "libsql");
    assert.equal(sqlDialectForEngine("env"), "libsql");
    assert.equal(sqlDialectForEngine(undefined), "libsql");
  });

  it("uses the schema listing for env-backed projects", () => {
    assert.equal(inferSqlDialect("env", ["main"]), "libsql");
    assert.equal(inferSqlDialect("env", ["public", "auth"]), "postgres");
    assert.equal(inferSqlDialect("postgres", ["main"]), "postgres");
  });
});

describe("buildStudioSqlModel", () => {
  it("maps columns and foreign keys for the given project only", () => {
    const model = buildStudioSqlModel({
      dialect: "postgres",
      schemas: ["public"],
      tables: [orders],
    });
    assert.equal(model.dialect, "postgres");
    assert.deepEqual(model.schemas, ["public"]);
    assert.equal(model.tables.length, 1);
    const table = model.tables[0]!;
    assert.equal(table.name, "orders");
    assert.equal(table.columns[1]?.name, "org_id");
    assert.equal(table.columns[0]?.pk, true);
    assert.equal(table.foreignKeys?.[0]?.references.table, "orgs");
    assert.equal(JSON.stringify(model).includes("invoices"), false);
  });

  it("keeps the schema list even when a project has no tables", () => {
    const model = buildStudioSqlModel({
      dialect: "libsql",
      schemas: ["main"],
      tables: [],
    });
    assert.deepEqual(model.schemas, ["main"]);
    assert.deepEqual(model.tables, []);
  });
});

describe("completion model cache", () => {
  it("keeps each project's model separate", () => {
    const cache = createSqlModelCache();
    cache.set(
      "alpha",
      buildStudioSqlModel({ dialect: "postgres", schemas: ["public"], tables: [orders] }),
    );
    cache.set(
      "beta",
      buildStudioSqlModel({ dialect: "libsql", schemas: ["main"], tables: [invoices] }),
    );

    const alpha = JSON.stringify(cache.get("alpha"));
    const beta = JSON.stringify(cache.get("beta"));
    assert.equal(alpha.includes("orders"), true);
    assert.equal(alpha.includes("invoices"), false);
    assert.equal(beta.includes("invoices"), true);
    assert.equal(beta.includes("orders"), false);
    assert.equal(cache.size(), 2);

    cache.clear("alpha");
    assert.equal(cache.get("alpha"), null);
    assert.equal(cache.size(), 1);
    cache.clear();
    assert.equal(cache.size(), 0);
  });
});

describe("query draft persistence", () => {
  function fakeStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      dump: () => map,
    };
  }

  it("scopes the key per project and starts from the default query", () => {
    const storage = fakeStorage();
    assert.equal(sqlDraftKey("alpha"), `${SQL_DRAFT_PREFIX}alpha`);
    assert.equal(readSqlDraft(storage, "alpha"), DEFAULT_SQL);
    writeSqlDraft(storage, "alpha", "select * from orders");
    assert.equal(readSqlDraft(storage, "alpha"), "select * from orders");
    assert.equal(readSqlDraft(storage, "beta"), DEFAULT_SQL);
    assert.equal(storage.dump().size, 1);
  });

  it("survives storage being unavailable", () => {
    assert.equal(readSqlDraft(null, "alpha"), DEFAULT_SQL);
    assert.doesNotThrow(() => writeSqlDraft(null, "alpha", "select 1"));
    assert.equal(
      readSqlDraft(
        {
          getItem: () => {
            throw new Error("denied");
          },
          setItem: () => {
            throw new Error("denied");
          },
        },
        "alpha",
      ),
      DEFAULT_SQL,
    );
  });
});

describe("introspection fetch helpers", () => {
  it("encodes the table detail path with the schema", () => {
    assert.equal(tableDetailPath("orders", "public"), "/api/schema/tables/orders?schema=public");
    assert.equal(tableDetailPath("a b", undefined), "/api/schema/tables/a%20b");
  });

  it("maps with bounded concurrency and keeps input order", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return n * 2;
    });
    assert.deepEqual(out, [2, 4, 6, 8, 10, 12, 14]);
    assert.ok(peak <= 3, `peak concurrency ${peak} exceeded 3`);
  });
});
