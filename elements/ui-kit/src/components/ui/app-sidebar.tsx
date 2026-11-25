"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useControllableState } from "../../primitives/use-controllable-state";
import { Slot } from "../../primitives/slot";

type AppSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  collapsedWidth: number;
  expandedWidth: number;
};

const AppSidebarContext = React.createContext<AppSidebarContextValue | null>(null);

function useAppSidebar() {
  const ctx = React.useContext(AppSidebarContext);
  if (!ctx) throw new Error("AppSidebar parts must be used within AppSidebar");
  return ctx;
}

export type AppSidebarProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsedWidth?: number;
  expandedWidth?: number;
  className?: string;
  children?: React.ReactNode;
};

/** Collapsible app sidebar with icon rail + labels. */
export function AppSidebar({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  collapsedWidth = 64,
  expandedWidth = 240,
  className,
  children,
}: AppSidebarProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <AppSidebarContext.Provider value={{ open, setOpen, collapsedWidth, expandedWidth }}>
      <motion.aside
        data-slot="app-sidebar"
        data-state={open ? "expanded" : "collapsed"}
        aria-label="Sidebar"
        initial={false}
        animate={{ width: open ? expandedWidth : collapsedWidth }}
        transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative flex h-full flex-col overflow-hidden border-r border-border bg-card text-foreground",
          className,
        )}
      >
        {children}
      </motion.aside>
    </AppSidebarContext.Provider>
  );
}

export function AppSidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="app-sidebar-header"
      className={cn("flex items-center gap-2 border-b border-border px-3 py-3", className)}
      {...props}
    />
  );
}

export function AppSidebarBrand({
  className,
  icon,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { icon?: React.ReactNode }) {
  const { open } = useAppSidebar();
  return (
    <div
      data-slot="app-sidebar-brand"
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    >
      {icon ? <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span> : null}
      <span
        className={cn(
          "truncate text-sm font-semibold transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function AppSidebarToggle({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useAppSidebar();
  return (
    <button
      type="button"
      data-slot="app-sidebar-toggle"
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={open}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      <PanelLeft className="size-4" aria-hidden />
    </button>
  );
}

export function AppSidebarBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="app-sidebar-body"
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto p-2", className)}
      {...props}
    />
  );
}

export function AppSidebarGroup({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  const { open } = useAppSidebar();
  return (
    <div data-slot="app-sidebar-group" className={cn("grid gap-1", className)} {...props}>
      {label ? (
        <p
          className={cn(
            "px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-opacity",
            open ? "opacity-100" : "h-0 overflow-hidden opacity-0",
          )}
        >
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export type AppSidebarItemProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  icon?: React.ReactNode;
  active?: boolean;
  asChild?: boolean;
};

export function AppSidebarItem({
  icon,
  active,
  asChild,
  className,
  children,
  ...props
}: AppSidebarItemProps) {
  const { open } = useAppSidebar();
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="app-sidebar-item"
      data-active={active ? "" : undefined}
      title={typeof children === "string" ? children : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-muted/70 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 text-foreground",
        !open && "justify-center px-0",
        className,
      )}
      {...props}
    >
      {icon ? <span className="grid size-5 shrink-0 place-items-center [&>svg]:size-4">{icon}</span> : null}
      <span className={cn("truncate transition-opacity", open ? "opacity-100" : "sr-only")}>
        {children}
      </span>
    </Comp>
  );
}

export function AppSidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="app-sidebar-footer"
      className={cn("mt-auto border-t border-border p-2", className)}
      {...props}
    />
  );
}

export { useAppSidebar };
