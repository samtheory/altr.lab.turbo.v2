/** Client-safe project registry types (mirrors jord-server public JSON). */

export type ProjectEngine = "libsql-file" | "libsql-turso" | "postgres";
export type ProjectTlsMode = "disable" | "require" | "verify-full";
export type ProjectStatus = "active" | "archived";

export type ProjectKeyPublic = {
  kind: string;
  prefix: string;
  last4: string;
  created_at: number;
  rotated_at: number | null;
};

export type ProjectPublic = {
  id: string;
  slug: string;
  engine: ProjectEngine;
  target: string;
  tls_mode: ProjectTlsMode | null;
  db_user: string | null;
  notes: string;
  status: ProjectStatus;
  created_at: number;
  archived_at: number | null;
  keys: ProjectKeyPublic[];
};

export type CreateProjectPayload = {
  slug: string;
  engine: ProjectEngine;
  target: string;
  tls_mode?: ProjectTlsMode | null;
  db_user?: string | null;
  password?: string | null;
  notes?: string;
};

export type TestConnectPayload = {
  engine: ProjectEngine;
  target: string;
  tls_mode?: ProjectTlsMode | null;
  db_user?: string | null;
  password?: string | null;
};

export type CreateProjectResponse = {
  project: ProjectPublic;
  secret_key: string;
  publishable_key: string;
  barrier_key: string;
};

export type ConnectTestSuccess = { ok: true; latencyMs: number };
export type ConnectTestFailure = { ok: false; error: string; latencyMs: number };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function validateSlugClient(slug: string): string | null {
  const trimmed = slug.trim();
  if (!trimmed) return "Slug is required";
  if (trimmed.length > 64) return "Slug must be at most 64 characters";
  if (!SLUG_RE.test(trimmed)) {
    return "Use lowercase letters, numbers, and hyphens only";
  }
  return null;
}

export function engineLabel(engine: ProjectEngine): string {
  switch (engine) {
    case "libsql-file":
      return "libSQL file";
    case "libsql-turso":
      return "libSQL Turso";
    case "postgres":
      return "Postgres";
  }
}

export function hostFromTarget(target: string): string {
  const trimmed = target.trim();
  if (!trimmed) return "—";
  if (trimmed.startsWith("file:") || (!trimmed.includes("://") && !trimmed.startsWith("libsql"))) {
    const path = trimmed.replace(/^file:/, "");
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }
  try {
    const url = new URL(trimmed);
    return url.host || trimmed;
  } catch {
    return trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed;
  }
}

export function formatRelativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}
