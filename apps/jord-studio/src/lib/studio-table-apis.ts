/** Per-table API catalogue helpers for the APIs drawer (S0059). */

export const POLICIES_CHANGED_EVENT = "jord:policies-changed";

export function emitPoliciesChanged(table: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POLICIES_CHANGED_EVENT, { detail: { table } }),
  );
}

export type TableApiEndpoint = {
  id: string;
  group: "generated" | "table" | "custom";
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  authHeader: string;
  defaultBody?: string;
  defaultQuery?: string;
};

/** Schema-qualified table path segment for docs (not URL-encoded). */
export function qualifyTable(schema: string, table: string): string {
  if (!schema || schema === "public" || schema === "main") return table;
  return `${schema}.${table}`;
}

export function realtimeChannelName(table: string): string {
  return `jord.change:${table}`;
}

export function buildTableApiEndpoints(args: {
  table: string;
  schema: string;
  publishableKeyPlaceholder?: string;
  generatedEnabled?: boolean;
  customApis?: Array<{ method: string; path: string; name: string; id: string }>;
}): TableApiEndpoint[] {
  const key = args.publishableKeyPlaceholder ?? "jord_pub_…";
  const auth = `Authorization: Bearer ${key}`;
  const schemaQ =
    args.schema && args.schema !== "public" && args.schema !== "main"
      ? `schema=${encodeURIComponent(args.schema)}`
      : "";
  const qualified = qualifyTable(args.schema, args.table);
  /** Server-relative paths; Studio BFF mounts them under `/api`. */
  const tablePath = `/v1/${encodeURIComponent(args.table)}`;
  const out: TableApiEndpoint[] = [];

  if (args.generatedEnabled !== false) {
    const genBase =
      args.table === "records"
        ? "/records"
        : `/schema/tables/${encodeURIComponent(args.table)}`;
    out.push(
      {
        id: "gen-list",
        group: "generated",
        method: "GET",
        path: args.table === "records" ? "/records" : `${genBase}/rows`,
        summary: `List rows on ${qualified}`,
        authHeader: auth,
        defaultQuery: schemaQ
          ? `${schemaQ}&limit=20`
          : args.table === "records"
            ? "bucket=lab&limit=20"
            : "limit=20",
      },
      {
        id: "gen-insert",
        group: "generated",
        method: "POST",
        path: args.table === "records" ? "/records" : `${genBase}/rows`,
        summary: `Insert into ${qualified}`,
        authHeader: auth,
        defaultQuery: schemaQ || undefined,
        defaultBody:
          args.table === "records"
            ? '{"bucket":"lab","body":"{}"}'
            : '{"values":{}}',
      },
    );
  }

  out.push(
    {
      id: "v1-get",
      group: "table",
      method: "GET",
      path: tablePath,
      summary: `Table API select · ${qualified}`,
      authHeader: auth,
      defaultQuery: schemaQ ? `${schemaQ}&limit=20` : "limit=20",
    },
    {
      id: "v1-post",
      group: "table",
      method: "POST",
      path: tablePath,
      summary: `Table API insert · ${qualified}`,
      authHeader: auth,
      defaultQuery: schemaQ || undefined,
      defaultBody: "{}",
    },
    {
      id: "v1-patch",
      group: "table",
      method: "PATCH",
      path: tablePath,
      summary: `Table API update · ${qualified} (filter required)`,
      authHeader: auth,
      defaultQuery: schemaQ
        ? `${schemaQ}&id=eq.1`
        : "id=eq.1",
      defaultBody: "{}",
    },
    {
      id: "v1-delete",
      group: "table",
      method: "DELETE",
      path: tablePath,
      summary: `Table API delete · ${qualified} (filter required)`,
      authHeader: auth,
      defaultQuery: schemaQ
        ? `${schemaQ}&id=eq.1`
        : "id=eq.1",
    },
  );

  for (const api of args.customApis ?? []) {
    const method = api.method.toUpperCase();
    if (
      method !== "GET" &&
      method !== "POST" &&
      method !== "PATCH" &&
      method !== "DELETE"
    ) {
      continue;
    }
    const raw = api.path.startsWith("/") ? api.path : `/${api.path}`;
    // Strip Studio `/api` prefix so try-it / curl helpers add it once.
    const path = raw.startsWith("/api/") ? raw.slice(4) : raw;
    out.push({
      id: `custom-${api.id}`,
      group: "custom",
      method,
      path,
      summary: api.name,
      authHeader: auth,
    });
  }

  return out;
}

function studioBffPath(serverPath: string): string {
  if (serverPath.startsWith("/api/") || serverPath === "/api") return serverPath;
  return `/api${serverPath.startsWith("/") ? serverPath : `/${serverPath}`}`;
}

export function buildExampleCurl(ep: TableApiEndpoint, origin = "http://127.0.0.1:3005"): string {
  const q = ep.defaultQuery ? `?${ep.defaultQuery}` : "";
  const bffUrl = `${origin}${studioBffPath(ep.path)}${q}`;
  const lines = [`curl -sS -X ${ep.method} "${bffUrl}"`];
  lines.push(`  -H "${ep.authHeader}"`);
  if (ep.defaultBody && ep.method !== "GET" && ep.method !== "DELETE") {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${ep.defaultBody}'`);
  }
  return lines.join(" \\\n");
}

export function buildExampleFetch(ep: TableApiEndpoint): string {
  const q = ep.defaultQuery ? `?${ep.defaultQuery}` : "";
  const path = `${studioBffPath(ep.path)}${q}`;
  const headers: Record<string, string> = {
    Authorization: ep.authHeader.replace(/^Authorization:\s*/i, ""),
  };
  const init: Record<string, unknown> = {
    method: ep.method,
    headers,
  };
  if (ep.defaultBody && ep.method !== "GET" && ep.method !== "DELETE") {
    headers["Content-Type"] = "application/json";
    init.body = ep.defaultBody;
  }
  return `await fetch("${path}", ${JSON.stringify(init, null, 2)})`;
}

/** Resolve the Studio BFF path used by the try-it runner (cookie session). */
export function tryItBffPath(ep: TableApiEndpoint, query: string): string {
  const q = query ? `?${query}` : "";
  return `${studioBffPath(ep.path)}${q}`;
}
