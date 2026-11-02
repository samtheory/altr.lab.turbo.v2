import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SchemaTable } from "./schema";
import {
  buildTableRelations,
  formatActionChip,
  formatColumnPair,
  neighbourOf,
  parseRelationsSearch,
  relationsHref,
  schemaEditorHref,
  withRelationsSearch,
} from "./studio-table-relations";

const users: SchemaTable = {
  name: "users",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
  ],
  foreignKeys: [
    {
      columns: ["org_id"],
      references: { schema: "public", table: "orgs", columns: ["id"] },
      onDelete: "cascade",
      cardinality: "1:N",
      name: "users_org_id_fkey",
    },
  ],
};

const orders: SchemaTable = {
  name: "orders",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
    {
      name: "user_id",
      type: "TEXT",
      notnull: true,
      pk: false,
      dflt_value: null,
    },
  ],
  foreignKeys: [
    {
      columns: ["user_id"],
      references: { schema: "public", table: "users", columns: ["id"] },
      onDelete: "set null",
      onUpdate: "cascade",
      cardinality: "1:N",
    },
  ],
};

const orgs: SchemaTable = {
  name: "orgs",
  schema: "public",
  columns: [
    { name: "id", type: "TEXT", notnull: true, pk: true, dflt_value: null },
  ],
};

describe("studio-table-relations", () => {
  it("splits outgoing and incoming FKs for the center table", () => {
    const { outgoing, incoming } = buildTableRelations(users, [
      users,
      orders,
      orgs,
    ]);
    assert.equal(outgoing.length, 1);
    assert.equal(outgoing[0]?.targetTable, "orgs");
    assert.equal(outgoing[0]?.cardinality, "1:N");
    assert.equal(outgoing[0]?.onDelete, "cascade");
    assert.equal(incoming.length, 1);
    assert.equal(incoming[0]?.ownerTable, "orders");
    assert.deepEqual(incoming[0]?.ownerColumns, ["user_id"]);
  });

  it("resolves neighbours and formats pairs / chips", () => {
    const { outgoing, incoming } = buildTableRelations(users, [
      users,
      orders,
      orgs,
    ]);
    const out = outgoing[0]!;
    const inn = incoming[0]!;
    assert.deepEqual(neighbourOf(out, "public", "users"), {
      schema: "public",
      table: "orgs",
    });
    assert.deepEqual(neighbourOf(inn, "public", "users"), {
      schema: "public",
      table: "orders",
    });
    assert.equal(formatColumnPair(out), "org_id → orgs.id");
    assert.equal(formatActionChip("ON DELETE", "cascade"), "ON DELETE CASCADE");
    assert.equal(formatActionChip("ON DELETE", "no action"), null);
  });

  it("parses and builds shareable relations URLs", () => {
    const parsed = parseRelationsSearch(
      new URLSearchParams("view=relations&table=users&schema=public&edge=e1"),
    );
    assert.deepEqual(parsed, {
      table: "users",
      schema: "public",
      edge: "e1",
    });
    assert.equal(parseRelationsSearch(new URLSearchParams("view=browser")), null);

    const href = relationsHref(
      "/p/acme/schema",
      new URLSearchParams("foo=1"),
      { table: "users", schema: "public" },
    );
    assert.equal(
      href,
      "/p/acme/schema?foo=1&view=relations&table=users&schema=public",
    );

    const cleared = withRelationsSearch(
      new URLSearchParams("view=relations&table=users&foo=1"),
      null,
    );
    assert.equal(cleared.get("view"), null);
    assert.equal(cleared.get("foo"), "1");

    assert.equal(
      schemaEditorHref("/p/acme/schema", "users", "public"),
      "/p/acme/schema?table=users&view=browser&schema=public",
    );
  });
});
