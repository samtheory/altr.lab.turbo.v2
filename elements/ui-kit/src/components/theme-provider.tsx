"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

import {
  APOLYX_THEME_STORAGE_KEY,
  themeFamilies,
  type ThemeFamily,
  type ThemeMode,
} from "../theme";

type ApolyxThemeContextValue = {
  theme: ThemeFamily;
  setTheme: (theme: ThemeFamily) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
};

const ApolyxThemeContext = React.createContext<ApolyxThemeContextValue | null>(
  null,
);

function isThemeFamily(value: string | null | undefined): value is ThemeFamily {
  return (
    value === "default" || value === "power-blue" || value === "power-green"
  );
}

function applyThemeFamily(theme: ThemeFamily) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export type ApolyxProviderProps = {
  children: React.ReactNode;
  theme?: ThemeFamily;
  defaultTheme?: ThemeFamily;
  mode?: ThemeMode;
  defaultMode?: ThemeMode;
  storageKey?: string;
  modeStorageKey?: string;
};

function ApolyxFamilyBridge({
  children,
  theme: themeProp,
  defaultTheme = "default",
  storageKey = APOLYX_THEME_STORAGE_KEY,
}: {
  children: React.ReactNode;
  theme?: ThemeFamily;
  defaultTheme?: ThemeFamily;
  storageKey?: string;
}) {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } =
    useNextTheme();
  // Match SSR and the first client paint — never read localStorage here (hydration mismatch
  // left stale aria-checked on the previous radio when setState was a no-op).
  const [family, setFamilyState] = React.useState<ThemeFamily>(
    () => themeProp ?? defaultTheme,
  );

  React.useEffect(() => {
    if (themeProp) {
      setFamilyState(themeProp);
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (isThemeFamily(stored)) setFamilyState(stored);
  }, [themeProp, storageKey]);

  React.useEffect(() => {
    applyThemeFamily(family);
    if (!themeProp) {
      window.localStorage.setItem(storageKey, family);
    }
  }, [family, storageKey, themeProp]);

  const setTheme = React.useCallback(
    (next: ThemeFamily) => {
      if (!themeFamilies.includes(next)) return;
      if (!themeProp) setFamilyState(next);
    },
    [themeProp],
  );

  const setMode = React.useCallback(
    (next: ThemeMode) => {
      setNextTheme(next);
    },
    [setNextTheme],
  );

  const value = React.useMemo<ApolyxThemeContextValue>(
    () => ({
      theme: family,
      setTheme,
      mode: (nextTheme as ThemeMode) ?? "system",
      setMode,
      resolvedMode: resolvedTheme === "dark" ? "dark" : "light",
    }),
    [family, setTheme, nextTheme, setMode, resolvedTheme],
  );

  return (
    <ApolyxThemeContext.Provider value={value}>
      {children}
    </ApolyxThemeContext.Provider>
  );
}

export function ApolyxProvider({
  children,
  theme,
  defaultTheme = "default",
  mode,
  defaultMode = "system",
  storageKey = APOLYX_THEME_STORAGE_KEY,
  modeStorageKey = "theme",
}: ApolyxProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultMode}
      enableSystem
      forcedTheme={mode === "system" ? undefined : mode}
      storageKey={modeStorageKey}
    >
      <ApolyxFamilyBridge
        theme={theme}
        defaultTheme={defaultTheme}
        storageKey={storageKey}
      >
        {children}
      </ApolyxFamilyBridge>
    </NextThemesProvider>
  );
}

export function useApolyxTheme(): ApolyxThemeContextValue {
  const ctx = React.useContext(ApolyxThemeContext);
  if (!ctx) {
    throw new Error("useApolyxTheme must be used within ApolyxProvider");
  }
  return ctx;
}

/** Inline script: apply stored family before paint (put in `<head>`). */
export function ApolyxThemeScript({
  storageKey = APOLYX_THEME_STORAGE_KEY,
  defaultTheme = "default",
}: {
  storageKey?: string;
  defaultTheme?: ThemeFamily;
}) {
  const code = `(function(){try{var k=${JSON.stringify(storageKey)};var d=${JSON.stringify(defaultTheme)};var t=localStorage.getItem(k);if(t!=="default"&&t!=="power-blue"&&t!=="power-green")t=d;document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(defaultTheme)});}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      suppressHydrationWarning
    />
  );
}

/** @deprecated Use `ApolyxProvider`. Thin next-themes wrap kept for one release. */
export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
