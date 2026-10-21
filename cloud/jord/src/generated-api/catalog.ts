import type { GeneratedApiResourceId } from "./registry.js";

export type GeneratedApiAuthNeed = "read" | "write";

export type GeneratedApiOperation = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  auth: GeneratedApiAuthNeed;
  query?: string[];
  params?: string[];
  body?: string[];
};

export type GeneratedApiResource = {
  id: GeneratedApiResourceId;
  table: string;
  enabled: boolean;
  operations: GeneratedApiOperation[];
};

const RECORDS_OPERATIONS: GeneratedApiOperation[] = [
  {
    method: "GET",
    path: "/records",
    summary: "List by bucket",
    auth: "read",
    query: ["bucket"],
  },
  {
    method: "POST",
    path: "/records",
    summary: "Insert row",
    auth: "write",
    body: ["bucket", "body", "metadata?"],
  },
  {
    method: "GET",
    path: "/records/:id",
    summary: "Get by id",
    auth: "read",
    params: ["id"],
  },
  {
    method: "PATCH",
    path: "/records/:id",
    summary: "OCC update",
    auth: "write",
    params: ["id"],
    body: ["version", "body?", "metadata?", "bucket?"],
  },
  {
    method: "DELETE",
    path: "/records/:id",
    summary: "Delete row",
    auth: "write",
    params: ["id"],
  },
];

export function buildRecordsResource(enabled: boolean): GeneratedApiResource {
  return {
    id: "records",
    table: "records",
    enabled,
    operations: RECORDS_OPERATIONS,
  };
}
