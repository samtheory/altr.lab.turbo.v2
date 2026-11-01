export type StudioShellPrefs = {
  navCollapsed: boolean;
  sidebarCollapsed: boolean;
};

const VERSION = "v1";
const DEFAULTS: StudioShellPrefs = {
  navCollapsed: false,
  sidebarCollapsed: false,
};

function storageKey(projectSlug: string): string {
  return `jord.studio.shell:${VERSION}:${projectSlug}`;
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
