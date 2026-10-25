import type { JordColumnInfo } from "@altr/jord";

export type OpenApiTable = {
  name: string;
  columns: JordColumnInfo[];
};

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
    schemas[table.name] = { type: "object", properties };
    const item = { $ref: `#/components/schemas/${table.name}` };
    paths[`/api/v1/${table.name}`] = {
      get: {
        operationId: `list_${table.name}`,
        parameters: [
          { name: "select", in: "query", schema: { type: "string" } },
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
  }
  return {
    openapi: "3.0.3",
    info: {
      title: "Jord table API",
      version: "1",
      description:
        "PostgREST-lite. count=planned may be null on libSQL. count=exact is a full COUNT(*) and is costly. ilike is lower(column) LIKE lower(?).",
    },
    paths,
    components: { schemas },
  };
}
