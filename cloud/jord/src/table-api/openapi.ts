import type { JordColumnInfo } from "@altr/jord";

import type { Relation } from "./embeds.js";

export type OpenApiTable = {
  name: string;
  columns: JordColumnInfo[];
  /** Embeddable FK relations (S0078). */
  relations?: Relation[];
};

function relationDocs(relations: Relation[] | undefined): Array<Record<string, unknown>> {
  return (relations ?? []).map((rel) => ({
    names: rel.names,
    kind: rel.kind === "one" ? "many-to-one" : "one-to-many",
    table: rel.target.name,
    ...(rel.target.schema ? { schema: rel.target.schema } : {}),
    columns: rel.localColumns,
    references: rel.remoteColumns,
  }));
}

function jsonType(sqlType: string): string {
  const t = sqlType.toUpperCase();
  if (t.includes("INT")) return "integer";
  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB")) return "number";
  return "string";
}

/** OpenAPI 3 document. Clients generate types with openapi-typescript. */
export function buildOpenApi(tables: OpenApiTable[]): Record<string, unknown> {
  const paths: Record<string, unknown> = {
    "/api/v1/openapi.json": {
      get: {
        operationId: "getOpenApi",
        responses: { "200": { description: "This document" } },
      },
    },
  };
  const schemas: Record<string, unknown> = {};
  for (const table of tables) {
    const properties: Record<string, unknown> = {};
    for (const col of table.columns) {
      properties[col.name] = { type: jsonType(col.type) };
    }
    const relations = relationDocs(table.relations);
    const relationNames = [...new Set(relations.flatMap((rel) => rel.names as string[]))].sort();
    schemas[table.name] = { type: "object", properties, "x-jord-relations": relations };
    const item = { $ref: `#/components/schemas/${table.name}` };
    paths[`/api/v1/${table.name}`] = {
      get: {
        operationId: `list_${table.name}`,
        "x-jord-relations": relations,
        parameters: [
          {
            name: "select",
            in: "query",
            schema: { type: "string" },
            description:
              "Columns and one-level embeds: `*,rel(*)`, `alias:rel(col1,col2)`. " +
              `Relations: ${relationNames.length > 0 ? relationNames.join(", ") : "(none)"}. ` +
              "many-to-one embeds are an object or null; one-to-many are arrays (max 100 per parent).",
          },
          { name: "order", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 1000 } },
          { name: "offset", in: "query", schema: { type: "integer" } },
          { name: "Prefer", in: "header", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Rows", content: { "application/json": { schema: { type: "object" } } } } },
      },
      post: {
        operationId: `insert_${table.name}`,
        requestBody: { content: { "application/json": { schema: item } } },
        responses: { "201": { description: "Inserted" } },
      },
      patch: {
        operationId: `update_${table.name}`,
        responses: { "200": { description: "Updated" }, "400": { description: "Filter required" } },
      },
      delete: {
        operationId: `delete_${table.name}`,
        responses: { "200": { description: "Deleted" }, "400": { description: "Filter required" } },
      },
    };
    // S0080 bulk insert / upsert.
    paths[`/api/v1/${table.name}/bulk`] = {
      post: {
        operationId: `bulk_${table.name}`,
        description:
          "Up to 500 rows. Per-row results with partial success by default; atomic=true is all-or-nothing " +
          "(first failure → its status with `index`, nothing written). on_conflict must be the primary key or a unique index.",
        parameters: [
          { name: "on_conflict", in: "query", schema: { type: "string" }, description: "Comma-separated unique key columns" },
          { name: "resolution", in: "query", schema: { type: "string", enum: ["merge", "ignore"], default: "merge" } },
          { name: "atomic", in: "query", schema: { type: "boolean", default: false } },
          { name: "Prefer", in: "header", schema: { type: "string" }, description: "return=representation adds data per row" },
        ],
        requestBody: {
          content: { "application/json": { schema: { type: "array", maxItems: 500, items: item } } },
        },
        responses: {
          "200": {
            description: "Per-row results",
            content: { "application/json": { schema: { $ref: "#/components/schemas/JordBulkResult" } } },
          },
          "400": { description: "Bad body, parameter, or on_conflict target" },
          "403": { description: "No write permission (or atomic: a row was denied)" },
          "409": { description: "atomic: a row conflicted" },
          "413": { description: "More than 500 rows or body over the JSON cap" },
          "422": { description: "atomic: a row failed validation" },
        },
      },
    };
  }
  paths["/api/v1/rpc/{fn}"] = {
    post: {
      operationId: "rpc",
      description:
        "Invoke a registered (declarative) function by slug with the caller's principal. Step policies apply to the caller. Service and operator-admin callers may call any function; user and anon callers only functions exposed through an enabled `POST /x/{slug}` custom API (same kill switches as /x). Anything else is 404 unknown_function.",
      parameters: [{ name: "fn", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object", properties: { args: { type: "object" } }, additionalProperties: false },
          },
        },
      },
      responses: {
        "200": {
          description: "Function result",
          content: { "application/json": { schema: { type: "object", properties: { result: {} } } } },
        },
        "400": { description: "Bad body or args", content: { "application/json": { schema: { $ref: "#/components/schemas/JordRpcError" } } } },
        "403": { description: "Role or policy denied", content: { "application/json": { schema: { $ref: "#/components/schemas/JordRpcError" } } } },
        "404": { description: "Unknown function", content: { "application/json": { schema: { $ref: "#/components/schemas/JordRpcError" } } } },
        "413": { description: "Body over the JSON cap" },
      },
    },
  };
  schemas.JordBulkResult = {
    type: "object",
    properties: {
      inserted: { type: "integer" },
      updated: { type: "integer" },
      ignored: { type: "integer" },
      failed: { type: "integer" },
      results: {
        type: "array",
        items: {
          type: "object",
          required: ["index", "status"],
          properties: {
            index: { type: "integer" },
            status: { type: "integer" },
            op: { type: "string", enum: ["insert", "update", "ignore"] },
            id: { type: "string" },
            data: { type: "object" },
            error: { type: "string" },
            message: { type: "string" },
            field: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
    },
  };
  schemas.JordRpcError = {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: { code: { type: "string" }, message: { type: "string" } },
      },
    },
  };
  return {
    openapi: "3.0.3",
    info: {
      title: "Jord table API",
      version: "1",
      description:
        "PostgREST-lite. count=planned may be null on libSQL. count=exact is a full COUNT(*) and is costly. ilike is lower(column) LIKE lower(?). " +
        "Embeds (select=*,rel(*)) follow introspected foreign keys one level deep; each embedded table is filtered by its own policies for the caller. M:N through a join table is not supported yet.",
    },
    paths,
    components: { schemas },
  };
}
