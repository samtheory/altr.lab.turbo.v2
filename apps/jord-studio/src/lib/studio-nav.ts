export type StudioNavStatus = "live" | "soon";

export type StudioNavItem = {
  id: string;
  label: string;
  href?: string;
  status: StudioNavStatus;
  /** Short badge for placeholders, e.g. "S5" */
  soonLabel?: string;
};

export type StudioNavGroup = {
  id: string;
  label: string;
  items: StudioNavItem[];
};

/**
 * Single source for Studio side menu.
 * Live = wired in S1/S1.5. soon = visible but not implemented.
 */
export const STUDIO_NAV: StudioNavGroup[] = [
  {
    id: "data",
    label: "Data",
    items: [
      { id: "tables", label: "Tables · records", href: "/records", status: "live" },
      { id: "insert", label: "Insert row", href: "/records/new", status: "live" },
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    items: [
      { id: "jobs", label: "Jobs", status: "soon", soonLabel: "S5" },
      { id: "logs", label: "Logs", status: "soon", soonLabel: "S5" },
    ],
  },
  {
    id: "apis",
    label: "APIs",
    items: [
      { id: "generated", label: "Generated API", status: "soon", soonLabel: "S4" },
      { id: "custom", label: "Custom APIs", status: "soon", soonLabel: "S6" },
      { id: "functions", label: "Function APIs", status: "soon", soonLabel: "S6" },
    ],
  },
  {
    id: "database",
    label: "Database",
    items: [
      { id: "schema", label: "Schema visualizer", href: "/schema", status: "live" },
      { id: "policies", label: "Policies", status: "soon", soonLabel: "S7" },
      { id: "roles", label: "Roles", status: "soon", soonLabel: "S7" },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { id: "local", label: "Local lab gate", href: "/help", status: "live" },
    ],
  },
];

export const RECORD_BUCKETS = ["lab", "artemis", "jord"] as const;
