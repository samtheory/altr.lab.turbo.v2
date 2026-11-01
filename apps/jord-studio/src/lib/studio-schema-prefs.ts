/** Per-project schema picker prefs (S0050). */

const VERSION = "v1";

/** Sentinel for the optional "All schemas" picker entry. */
export const SCHEMA_ALL = "all";

export type SchemaPickerValue = string;

function storageKey(projectSlug: string): string {
  return `jord.studio.schema:${VERSION}:${projectSlug}`;
}

export function loadSchemaPref(projectSlug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(projectSlug));
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function saveSchemaPref(projectSlug: string, schema: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(projectSlug), schema);
  } catch {
    /* quota / private mode */
  }
}

/**
 * Resolve the active schema from URL → localStorage → dialect default.
 * `all` is kept as-is for the "All schemas" view.
 */
export function resolveSchemaSelection(input: {
  urlSchema: string | null;
  stored: string | null;
  defaultSchema: string;
  available: string[];
}): string {
  const candidates = [input.urlSchema, input.stored, input.defaultSchema];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    if (c === SCHEMA_ALL) return SCHEMA_ALL;
    if (input.available.includes(c)) return c;
  }
  if (input.available.includes(input.defaultSchema)) return input.defaultSchema;
  return input.available[0] ?? input.defaultSchema;
}

/** Default schema when the server has not answered yet. */
export function fallbackDefaultSchema(names: string[]): string {
  if (names.includes("public")) return "public";
  if (names.includes("main")) return "main";
  return names[0] ?? "public";
}
