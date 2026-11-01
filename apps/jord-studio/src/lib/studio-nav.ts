import type { JordRole } from "@/lib/auth/roles";
import { canWriteRecords } from "@/lib/auth/roles";
import {
  extractProjectRestPath,
  extractProjectSlug,
  projectHref,
} from "@/lib/project-scope";

export type StudioNavStatus = "live" | "soon";

/** Second-column list kind declared on a nav item (filled in S0047+). */
export type StudioContextual =
  | "tables"
  | "jobs"
  | "endpoints"
  | "queries"
  | "users"
  | "buckets";

/** Lucide icon key rendered by the primary nav (collapsed = icon-only). */
export type StudioNavIcon =
  | "folder"
  | "plus"
  | "table"
  | "rows"
  | "row-insert"
  | "hard-drive"
  | "waypoints"
  | "briefcase"
  | "scroll"
  | "webhook"
  | "blocks"
  | "cpu"
  | "braces"
  | "schema"
  | "plug"
  | "terminal"
  | "git-branch"
  | "shield"
  | "zap"
  | "users"
  | "circle-help";

export type StudioNavItem = {
  id: string;
  label: string;
  icon: StudioNavIcon;
  href?: string;
  status: StudioNavStatus;
  /** Short badge for placeholders, e.g. "S5" */
  soonLabel?: string;
  /** If set, item is hidden when the role cannot write records. */
  requiresWrite?: boolean;
  /** Control-plane links stay outside `/p/[project]`. */
  global?: boolean;
  /** Contextual sidebar kind when this section is active. */
  contextual?: StudioContextual;
};

export type StudioNavGroup = {
  id: string;
  label: string;
  items: StudioNavItem[];
};

/**
 * Single source for Studio side menu.
 * Live = wired. soon = visible but not implemented.
 * Data/runtime paths are project-relative when `projectSlug` is set.
 */
export const STUDIO_NAV: StudioNavGroup[] = [
  {
    id: "projects",
    label: "Projects",
    items: [
      {
        id: "projects-list",
        label: "All projects",
        icon: "folder",
        href: "/projects",
        status: "live",
        global: true,
      },
      {
        id: "projects-new",
        label: "New project",
        icon: "plus",
        href: "/projects/new",
        status: "live",
        global: true,
      },
    ],
  },
  {
    id: "data",
    label: "Data",
    items: [
      {
        id: "tables",
        label: "Tables",
        icon: "table",
        href: "/tables",
        status: "live",
        contextual: "tables",
      },
      {
        id: "records",
        label: "Records editor",
        icon: "rows",
        href: "/records",
        status: "live",
        contextual: "tables",
      },
      {
        id: "insert",
        label: "Insert row",
        icon: "row-insert",
        href: "/records/new",
        status: "live",
        requiresWrite: true,
        contextual: "tables",
      },
      {
        id: "storage",
        label: "Storage",
        icon: "hard-drive",
        href: "/storage",
        status: "live",
        contextual: "buckets",
      },
      {
        id: "vectors",
        label: "Vectors",
        icon: "waypoints",
        href: "/vectors",
        status: "live",
      },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    items: [
      {
        id: "jobs",
        label: "Jobs",
        icon: "briefcase",
        href: "/jobs",
        status: "live",
        contextual: "jobs",
      },
      {
        id: "logs",
        label: "Logs",
        icon: "scroll",
        href: "/logs",
        status: "live",
        contextual: "jobs",
      },
    ],
  },
  {
    id: "apis",
    label: "APIs",
    items: [
      {
        id: "generated",
        label: "Generated API",
        icon: "webhook",
        href: "/apis/generated",
        status: "live",
        contextual: "endpoints",
      },
      {
        id: "custom",
        label: "Custom APIs",
        icon: "blocks",
        href: "/apis/custom",
        status: "live",
        contextual: "endpoints",
      },
      {
        id: "functions",
        label: "Function APIs",
        icon: "cpu",
        href: "/apis/functions",
        status: "live",
        contextual: "endpoints",
      },
      {
        id: "table-api",
        label: "Table API",
        icon: "braces",
        href: "/apis/table",
        status: "live",
        contextual: "endpoints",
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    items: [
      {
        id: "schema",
        label: "Schema visualizer",
        icon: "schema",
        href: "/schema",
        status: "live",
      },
      {
        id: "connection",
        label: "Connection",
        icon: "plug",
        href: "/database/connection",
        status: "live",
      },
      {
        id: "sql",
        label: "SQL console",
        icon: "terminal",
        href: "/database/sql",
        status: "live",
        contextual: "queries",
      },
      {
        id: "migrate",
        label: "Migrate",
        icon: "git-branch",
        href: "/database/migrate",
        status: "live",
      },
      {
        id: "policies",
        label: "Policies",
        icon: "shield",
        href: "/database/policies",
        status: "live",
      },
      {
        id: "triggers",
        label: "Triggers",
        icon: "zap",
        href: "/database/triggers",
        status: "live",
      },
      {
        id: "users",
        label: "Users",
        icon: "users",
        href: "/auth/users",
        status: "live",
        contextual: "users",
      },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      {
        id: "session",
        label: "Session · role",
        icon: "circle-help",
        href: "/help",
        status: "live",
      },
    ],
  },
];

export const CONTEXTUAL_LABELS: Record<StudioContextual, string> = {
  tables: "Tables",
  jobs: "Jobs",
  endpoints: "Endpoints",
  queries: "Queries",
  users: "Users",
  buckets: "Buckets",
};

export function navForRole(
  role: JordRole,
  projectSlug?: string | null,
): StudioNavGroup[] {
  const write = canWriteRecords(role);
  return STUDIO_NAV.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => !item.requiresWrite || write)
      .map((item) => {
        if (!item.href || item.global || !projectSlug) return item;
        return { ...item, href: projectHref(projectSlug, item.href) };
      }),
  }));
}

function pathMatchesItem(pathRest: string, hrefRest: string): boolean {
  if (hrefRest === "/records") {
    return (
      pathRest === "/records" ||
      (pathRest.startsWith("/records/") && !pathRest.startsWith("/records/new"))
    );
  }
  return pathRest === hrefRest || pathRest.startsWith(`${hrefRest}/`);
}

/** Longest matching live item for the current pathname (for contextual + active). */
export function resolveActiveNavItem(
  pathname: string,
  groups: StudioNavGroup[],
): StudioNavItem | null {
  const pathProject = extractProjectSlug(pathname);
  const pathRest = pathProject
    ? extractProjectRestPath(pathname) || "/"
    : pathname;

  let best: StudioNavItem | null = null;
  let bestLen = -1;

  for (const group of groups) {
    for (const item of group.items) {
      if (item.status !== "live" || !item.href) continue;
      const hrefProject = extractProjectSlug(item.href);
      const hrefRest = hrefProject
        ? extractProjectRestPath(item.href) || "/"
        : item.href;
      if (!pathMatchesItem(pathRest, hrefRest)) continue;
      if (hrefRest.length > bestLen) {
        best = item;
        bestLen = hrefRest.length;
      }
    }
  }
  return best;
}

export function resolveContextual(
  pathname: string,
  groups: StudioNavGroup[],
): StudioContextual | null {
  return resolveActiveNavItem(pathname, groups)?.contextual ?? null;
}

export const RECORD_BUCKETS = ["lab", "artemis", "jord"] as const;
