"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import { Slot } from "../../primitives/slot";

type MegaNavContextValue = {
  value: string;
  setValue: (value: string) => void;
  openDelay: number;
  closeDelay: number;
};

const MegaNavContext = React.createContext<MegaNavContextValue | null>(null);

function useMegaNav() {
  const ctx = React.useContext(MegaNavContext);
  if (!ctx) throw new Error("MegaNav parts must be used within MegaNav");
  return ctx;
}

type ItemCtx = {
  value: string;
  triggerId: string;
  panelId: string;
  scheduleOpen: () => void;
  scheduleClose: () => void;
  cancel: () => void;
};

const ItemContext = React.createContext<ItemCtx | null>(null);

function useItem() {
  const ctx = React.useContext(ItemContext);
  if (!ctx) throw new Error("MegaNav item parts must be used within MegaNavItem");
  return ctx;
}

export type MegaNavProps = React.HTMLAttributes<HTMLElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  openDelay?: number;
  closeDelay?: number;
};

/** Marketing navbar with hover mega panels (no Radix). */
export function MegaNav({
  value,
  defaultValue = "",
  onValueChange,
  openDelay = 100,
  closeDelay = 180,
  className,
  "aria-label": ariaLabel = "Primary",
  children,
  ...props
}: MegaNavProps) {
  const [open, setOpen] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  return (
    <MegaNavContext.Provider value={{ value: open, setValue: setOpen, openDelay, closeDelay }}>
      <nav
        data-slot="mega-nav"
        aria-label={ariaLabel}
        className={cn(
          "relative z-40 mx-auto flex w-full max-w-5xl items-center justify-center gap-1 rounded-2xl border border-border/80 bg-card/80 px-2 py-1.5 shadow-sm backdrop-blur-md",
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </MegaNavContext.Provider>
  );
}

export function MegaNavList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-slot="mega-nav-list"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

export type MegaNavItemProps = React.HTMLAttributes<HTMLLIElement> & {
  value: string;
};

export function MegaNavItem({ value, className, children, ...props }: MegaNavItemProps) {
  const nav = useMegaNav();
  const triggerId = useId();
  const panelId = useId();
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  const cancel = React.useCallback(() => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const scheduleOpen = React.useCallback(() => {
    cancel();
    openTimer.current = window.setTimeout(() => nav.setValue(value), nav.openDelay);
  }, [cancel, nav, value]);

  const scheduleClose = React.useCallback(() => {
    cancel();
    closeTimer.current = window.setTimeout(() => nav.setValue(""), nav.closeDelay);
  }, [cancel, nav]);

  React.useEffect(() => () => cancel(), [cancel]);

  return (
    <ItemContext.Provider value={{ value, triggerId, panelId, scheduleOpen, scheduleClose, cancel }}>
      <li
        data-slot="mega-nav-item"
        className={cn("relative", className)}
        onPointerEnter={scheduleOpen}
        onPointerLeave={scheduleClose}
        {...props}
      >
        {children}
      </li>
    </ItemContext.Provider>
  );
}

export function MegaNavTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const nav = useMegaNav();
  const item = useItem();
  const open = nav.value === item.value;

  return (
    <button
      type="button"
      id={item.triggerId}
      data-slot="mega-nav-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      aria-controls={item.panelId}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-muted/60 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        open && "bg-muted text-foreground",
        className,
      )}
      onFocus={item.scheduleOpen}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          nav.setValue("");
          (e.currentTarget as HTMLButtonElement).focus();
        } else if (e.key === "ArrowDown" && !open) {
          e.preventDefault();
          nav.setValue(item.value);
        }
        props.onKeyDown?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function MegaNavPanel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const reduce = useReducedMotion();
  const nav = useMegaNav();
  const item = useItem();
  const open = nav.value === item.value;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={item.panelId}
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-[calc(100%+0.5rem)] left-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2"
          onPointerEnter={item.cancel}
          onPointerLeave={item.scheduleClose}
        >
          <div
            id={item.panelId}
            role="region"
            aria-labelledby={item.triggerId}
            data-slot="mega-nav-panel"
            className={cn("rounded-2xl border border-border bg-card p-3 shadow-lg", className)}
            {...props}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export type MegaNavLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  asChild?: boolean;
  title?: string;
  description?: string;
};

export function MegaNavLink({
  className,
  asChild,
  title,
  description,
  children,
  ...props
}: MegaNavLinkProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="mega-nav-link"
      className={cn(
        "block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {title ? (
        <>
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export function MegaNavAnchor({
  className,
  asChild,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="mega-nav-anchor"
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
