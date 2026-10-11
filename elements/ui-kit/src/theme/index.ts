/** Apolyx theme families, modes, and token names */

export const themeFamilies = ["default", "power-blue", "power-green"] as const;
export type ThemeFamily = (typeof themeFamilies)[number];

export const themeModes = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof themeModes)[number];

export const cssVariableTokens = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "info",
  "info-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-grid",
  "chart-axis",
  "radius",
  "font-sans",
  "font-mono",
  "font-display",
  "duration-fast",
  "duration-base",
  "duration-slow",
  "ease-out",
  "ease-in-out",
  "ease-spring",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
] as const;

export type CssVariableToken = (typeof cssVariableTokens)[number];

export const APOLYX_THEME_STORAGE_KEY = "apolyx-theme";
