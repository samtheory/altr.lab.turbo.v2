"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import {
  RovingFocusGroup,
  RovingFocusItem,
} from "../../primitives/roving-focus";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
  orientation: "horizontal" | "vertical";
  activationMode: "automatic" | "manual";
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs parts must be used within Tabs");
  return ctx;
}

export type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  /** `automatic` selects on focus; `manual` waits for Enter / Space / click. */
  activationMode?: "automatic" | "manual";
  className?: string;
  children: React.ReactNode;
};

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  orientation = "horizontal",
  activationMode = "automatic",
  className,
  children,
}: TabsProps) {
  const [current, setValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const baseId = useId();
  return (
    <TabsContext.Provider
      value={{ value: current, setValue, orientation, activationMode, baseId }}
    >
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          orientation === "vertical" && "flex gap-4",
          className,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const { value, setValue, orientation, activationMode } = useTabs();
  const automatic = activationMode === "automatic";
  return (
    <RovingFocusGroup
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      orientation={orientation}
      value={automatic ? value : undefined}
      defaultValue={value}
      onValueChange={automatic ? setValue : undefined}
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted p-1",
        orientation === "vertical" && "flex-col items-stretch",
        className,
      )}
    >
      {children}
    </RovingFocusGroup>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { value: current, setValue, baseId } = useTabs();
  const reduced = useReducedMotion();
  const selected = current === value;
  return (
    <RovingFocusItem
      id={value}
      domId={`${baseId}-trigger-${value}`}
      role="tab"
      disabled={disabled}
      aria-selected={selected}
      aria-controls={`${baseId}-content-${value}`}
      data-state={selected ? "active" : "inactive"}
      data-slot="tabs-trigger"
      className={cn(
        "relative isolate rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => setValue(value)}
    >
      {selected ? (
        <motion.span
          layoutId={`${baseId}-indicator`}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-[calc(var(--radius)-2px)] bg-background shadow-sm"
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}
      {children}
    </RovingFocusItem>
  );
}

export function TabsContent({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: current, baseId } = useTabs();
  if (current !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      tabIndex={0}
      data-slot="tabs-content"
      className={cn(
        "mt-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
