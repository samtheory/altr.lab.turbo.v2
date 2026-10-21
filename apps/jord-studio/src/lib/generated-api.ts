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
  id: string;
  table: string;
  enabled: boolean;
  operations: GeneratedApiOperation[];
};

export type GeneratedApiCatalog = {
  resources: GeneratedApiResource[];
};

/** Curl against Studio BFF (cookie session); not raw jord-server. */
export function buildStudioCurl(
  op: GeneratedApiOperation,
  opts?: { id?: string; bucket?: string },
): string {
  const id = opts?.id?.trim() || ":id";
  const bucket = opts?.bucket?.trim() || "lab";
  let path = op.path.replace(":id", id);
  if (op.method === "GET" && op.path === "/records") {
    path = `${path}?bucket=${encodeURIComponent(bucket)}`;
  }
  // Studio BFF mounts under /api
  const bffPath = `/api${path}`;
  const lines = [`curl -sS -X ${op.method} "http://127.0.0.1:3005${bffPath}"`];
  lines.push(`  -H "Cookie: jord_session=<your-session>"`);
  if (op.method === "POST") {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(
      `  -d '{"bucket":"${bucket}","body":"{}"}'`,
    );
  }
  if (op.method === "PATCH") {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '{"version":1,"body":"{}"}'`);
  }
  return lines.join(" \\\n");
}
