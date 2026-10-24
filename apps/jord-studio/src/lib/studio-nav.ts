import type { JordRole } from "@/lib/auth/roles";
import { canWriteRecords } from "@/lib/auth/roles";

export type StudioNavStatus = "live" | "soon";

export type StudioNavItem = {
  id: string;
  label: string;
  href?: string;
  status: StudioNavStatus;
  /** Short badge for placeholders, e.g. "S5" */
  soonLabel?: string;
  /** If set, item is hidden when the role cannot write records. */
  requiresWrite?: boolean;
};

export type StudioNavGroup = {
  id: string;
  label: string;
  items: StudioNavItem[];
};

/**
 * Single source for Studio side menu.
 * Live = wired. soon = visible but not implemented.
 */
export const STUDIO_NAV: StudioNavGroup[] = [
  {
    id: "data",
    label: "Data",
    items: [
      { id: "tables", label: "Tables · records", href: "/records", status: "live" },
      {
        id: "insert",
        label: "Insert row",
        href: "/records/new",
        status: "live",
        requiresWrite: true,
      },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    items: [
      { id: "jobs", label: "Jobs", href: "/jobs", status: "live" },
      { id: "logs", label: "Logs", href: "/logs", status: "live" },
    ],
  },
  {
    id: "apis",
    label: "APIs",
    items: [
      {
        id: "generated",
        label: "Generated API",
        href: "/apis/generated",
        status: "live",
      },
      {
        id: "custom",
        label: "Custom APIs",
        href: "/apis/custom",
        status: "live",
      },
      {
        id: "functions",
        label: "Function APIs",
        href: "/apis/functions",
        status: "live",
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    items: [
      { id: "schema", label: "Schema visualizer", href: "/schema", status: "live" },
      {
        id: "connection",
        label: "Connection",
        href: "/database/connection",
        status: "live",
      },
      {
        id: "policies",
        label: "Policies",
        href: "/database/policies",
        status: "live",
      },
      {
        id: "triggers",
        label: "Triggers",
        href: "/database/triggers",
        status: "live",
      },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { id: "session", label: "Session · role", href: "/help", status: "live" },
    ],
  },
];

export function navForRole(role: JordRole): StudioNavGroup[] {
  const write = canWriteRecords(role);
  return STUDIO_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.requiresWrite || write),
  }));
}

export const RECORD_BUCKETS = ["lab", "artemis", "jord"] as const;
