export const BUILTIN_STEP_KINDS = [
  "echo",
  "records_list",
  "records_get",
  "records_insert",
  "records_count",
] as const;

export type BuiltinStepKind = (typeof BUILTIN_STEP_KINDS)[number];

export const CUSTOM_HTTP_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

export type CustomHttpMethod = (typeof CUSTOM_HTTP_METHODS)[number];

export type PublicFunction = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  steps: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
};

export type PublicCustomApi = {
  id: string;
  name: string;
  method: CustomHttpMethod;
  slug: string;
  function_id: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
};

export function buildCustomCurl(method: string, slug: string): string {
  return `curl -sS -X ${method} "http://127.0.0.1:3000/api/x/${slug}" -H "Authorization: Bearer $TOKEN"`;
}
