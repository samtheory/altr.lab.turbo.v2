"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { themeFamilies, type ThemeFamily } from "../theme";
import { useApolyxTheme } from "./theme-provider";

const LABELS: Record<ThemeFamily, string> = {
  default: "Default",
  "power-blue": "PowerBlue",
  "power-green": "PowerGreen",
};

export type ThemeFamilySwitcherProps = {
  className?: string;
};

export function ThemeFamilySwitcher({ className }: ThemeFamilySwitcherProps) {
  const { theme, setTheme } = useApolyxTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme family"
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
      {themeFamilies.map((family) => {
        const selected = theme === family;
        return (
          <button
            key={family}
            type="button"
            role="radio"
            aria-checked={selected}
            data-state={selected ? "checked" : "unchecked"}
            className={cn(
              "inline-flex h-full items-center rounded-[calc(var(--radius)-2px)] px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTheme(family)}
          >
            {LABELS[family]}
          </button>
        );
      })}
    </div>
  );
}
