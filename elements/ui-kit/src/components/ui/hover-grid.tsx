"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

type HoverGridContextValue = {
  active: number | null;
  setActive: (index: number | null) => void;
};

const HoverGridContext = React.createContext<HoverGridContextValue | null>(null);

function useHoverGrid() {
  const ctx = React.useContext(HoverGridContext);
  if (!ctx) throw new Error("HoverGridItem must be used within HoverGrid");
  return ctx;
}

export type HoverGridProps = {
  className?: string;
  children?: React.ReactNode;
};

export function HoverGrid({ className, children }: HoverGridProps) {
  const [active, setActive] = React.useState<number | null>(null);

  return (
    <HoverGridContext.Provider value={{ active, setActive }}>
      <div data-slot="hover-grid" className={cn("grid gap-3 sm:grid-cols-3", className)}>
        {children}
      </div>
    </HoverGridContext.Provider>
  );
}

export type HoverGridItemProps = {
  index: number;
  className?: string;
  children?: React.ReactNode;
};

export function HoverGridItem({ index, className, children }: HoverGridItemProps) {
  const { active, setActive } = useHoverGrid();
  const dimmed = active !== null && active !== index;

  return (
    <div
      data-slot="hover-grid-item"
      data-active={active === index || undefined}
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-opacity duration-200",
        dimmed && "opacity-40",
        active === index && "ring-2 ring-primary/50",
        className,
      )}
      onPointerEnter={() => setActive(index)}
      onPointerLeave={() => setActive(null)}
    >
      {children}
    </div>
  );
}