export type StudioShellPrefs = {
  navCollapsed: boolean;
  sidebarCollapsed: boolean;
  /** Contextual sidebar width in pixels, persisted per project (S0047). */
  sidebarWidth: number | null;
};

const VERSION = "v1";
const DEFAULTS: StudioShellPrefs = {
  navCollapsed: false,
  sidebarCollapsed: false,
  sidebarWidth: null,
};
const MIN_SIDEBAR_W = "12rem";
const MAX_SIDEBAR_W = "30rem";

function storageKey(projectSlug: string): string {
  return `jord.studio.shell:${VERSION}:${projectSlug}`;
}

/** Parse a sidebar width that was stored as a CSS length; out-of-range values fall back to null. */
export function normalizeSidebarWidth(raw: unknown): number | null {
  if (raw == null || typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const px = Math.max(0, Math.round(raw));
  const minPx = parseFloat(MIN_SIDEBAR_W) * 16;
  const maxPx = parseFloat(MAX_SIDEBAR_W) * 16;
  if (px < minPx || px > maxPx) return null;
  return px;
}

export function loadShellPrefs(projectSlug: string): StudioShellPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(storageKey(projectSlug));
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<StudioShellPrefs>;
    return {
      navCollapsed: Boolean(parsed.navCollapsed),
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      sidebarWidth: normalizeSidebarWidth(parsed.sidebarWidth),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveShellPrefs(
  projectSlug: string,
  prefs: StudioShellPrefs,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(projectSlug), JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}

/** Clamp + format for the CSS variable (rem). */
export function sidebarWidthCss(px: number | null): string {
  if (px == null) return MAX_SIDEBAR_W;
  const clamped = Math.max(
    parseFloat(MIN_SIDEBAR_W) * 16,
    Math.min(px, parseFloat(MAX_SIDEBAR_W) * 16),
  );
  return `${clamped / 16}rem`;
}
