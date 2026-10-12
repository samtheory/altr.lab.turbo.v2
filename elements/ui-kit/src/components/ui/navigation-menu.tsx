"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { Presence } from "../../primitives/presence";
import { Slot } from "../../primitives/slot";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

type NavigationMenuContextValue = {
  value: string;
  setValue: (value: string) => void;
  openDelay: number;
  closeDelay: number;
};

const NavigationMenuContext =
  React.createContext<NavigationMenuContextValue | null>(null);

function useNavigationMenu() {
  const ctx = React.useContext(NavigationMenuContext);
  if (!ctx) throw new Error("NavigationMenu parts must be used within NavigationMenu");
  return ctx;
}

type ItemContextValue = {
  value: string;
  triggerId: string;
  contentId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  scheduleOpen: () => void;
  scheduleClose: () => void;
  cancelTimers: () => void;
};

const ItemContext = React.createContext<ItemContextValue | null>(null);

const InContentContext = React.createContext(false);

function useItem() {
  const ctx = React.useContext(ItemContext);
  if (!ctx) throw new Error("NavigationMenu item parts must be used within NavigationMenuItem");
  return ctx;
}

export type NavigationMenuProps = React.HTMLAttributes<HTMLElement> & {
  /** Open item value ("" when closed). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Hover-intent delays in ms. */
  openDelay?: number;
  closeDelay?: number;
};

/** Horizontal site / app navigation with disclosure panels (WAI-ARIA disclosure navigation). */
export function NavigationMenu({
  value,
  defaultValue = "",
  onValueChange,
  openDelay = 120,
  closeDelay = 220,
  className,
  "aria-label": ariaLabel = "Main",
  ...props
}: NavigationMenuProps) {
  const [open, setOpen] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <NavigationMenuContext.Provider
      value={{ value: open, setValue: setOpen, openDelay, closeDelay }}
    >
      <nav
        data-slot="navigation-menu"
        aria-label={ariaLabel}
        className={cn("relative", className)}
        {...props}
      />
    </NavigationMenuContext.Provider>
  );
}

function focusSibling(from: HTMLElement, dir: 1 | -1) {
  const list = from.closest("[data-slot=navigation-menu-list]");
  if (!list) return;
  const items = Array.from(
    list.querySelectorAll<HTMLElement>("[data-nav-top]"),
  ).filter((el) => !el.hasAttribute("disabled"));
  const i = items.indexOf(from);
  if (i < 0 || !items.length) return;
  items[(i + dir + items.length) % items.length]?.focus();
}

function handleTopKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    focusSibling(event.currentTarget, 1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    focusSibling(event.currentTarget, -1);
  }
}

export function NavigationMenuList({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

export function NavigationMenuItem({
  value: valueProp,
  className,
  children,
  ...props
}: React.LiHTMLAttributes<HTMLLIElement> & { value?: string }) {
  const { setValue, openDelay, closeDelay, value: open } = useNavigationMenu();
  const generated = useId();
  const value = valueProp ?? generated;
  const triggerId = useId();
  const contentId = useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const timer = React.useRef<number | null>(null);

  const cancelTimers = React.useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const scheduleOpen = React.useCallback(() => {
    cancelTimers();
    timer.current = window.setTimeout(() => setValue(value), open ? 0 : openDelay);
  }, [cancelTimers, setValue, value, open, openDelay]);

  const scheduleClose = React.useCallback(() => {
    cancelTimers();
    timer.current = window.setTimeout(() => {
      if (open === value) setValue("");
    }, closeDelay);
  }, [cancelTimers, setValue, value, open, closeDelay]);

  React.useEffect(() => cancelTimers, [cancelTimers]);

  return (
    <ItemContext.Provider
      value={{ value, triggerId, contentId, triggerRef, scheduleOpen, scheduleClose, cancelTimers }}
    >
      <li
        data-slot="navigation-menu-item"
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </li>
    </ItemContext.Provider>
  );
}

const topItemClass = cn(
  "inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground outline-none",
  "transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)",
  "hover:bg-accent-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
  "data-[state=open]:bg-accent data-[state=open]:text-foreground",
  "data-[active]:text-foreground",
);

export function NavigationMenuTrigger({
  className,
  children,
  onClick,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const nav = useNavigationMenu();
  const item = useItem();
  const isOpen = nav.value === item.value;
  return (
    <button
      ref={item.triggerRef}
      type="button"
      id={item.triggerId}
      data-slot="navigation-menu-trigger"
      data-nav-top=""
      data-state={isOpen ? "open" : "closed"}
      aria-expanded={isOpen}
      aria-controls={item.contentId}
      className={cn(topItemClass, className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        item.cancelTimers();
        nav.setValue(isOpen ? "" : item.value);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "ArrowDown" && !isOpen) {
          e.preventDefault();
          nav.setValue(item.value);
        }
        handleTopKeyDown(e);
      }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType === "mouse") item.scheduleOpen();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (e.pointerType === "mouse") item.scheduleClose();
      }}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden
        className={cn(
          "size-3.5 transition-transform duration-(--duration-base) ease-(--ease-out)",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}

export function NavigationMenuContent({
  className,
  children,
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  const nav = useNavigationMenu();
  const item = useItem();
  const reduced = useReducedMotion();
  const isOpen = nav.value === item.value;
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 };

  return (
    <Presence present={isOpen}>
      {({ present }) => (
        <DismissableLayer
          passive
          ignoreRefs={[item.triggerRef]}
          onDismiss={() => {
            const trigger = item.triggerRef.current;
            const focusInside = trigger?.parentElement?.contains(document.activeElement);
            nav.setValue("");
            if (focusInside) trigger?.focus();
          }}
          className={cn(
            "absolute top-full z-40 pt-2",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
          )}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") item.cancelTimers();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") item.scheduleClose();
          }}
        >
          <motion.div
            initial={hidden}
            animate={present ? { opacity: 1, y: 0, scale: 1 } : hidden}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top left" }}
          >
            <div
              id={item.contentId}
              aria-labelledby={item.triggerId}
              data-slot="navigation-menu-content"
              data-state={present ? "open" : "closed"}
              className={cn(
                "min-w-56 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg",
                className,
              )}
              {...props}
            >
              {children}
            </div>
          </motion.div>
        </DismissableLayer>
      )}
    </Presence>
  );
}

export type NavigationMenuLinkProps =
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean;
    active?: boolean;
  };

/** A link — either a top-level item (directly inside `NavigationMenuItem`) or a row inside `NavigationMenuContent`. */
export function NavigationMenuLink({
  asChild,
  active,
  className,
  onKeyDown,
  ...props
}: NavigationMenuLinkProps) {
  const inContent = React.useContext(InContentContext);
  const Comp = (asChild ? Slot : "a") as React.ElementType;
  return (
    <Comp
      data-slot="navigation-menu-link"
      data-nav-top={inContent ? undefined : ""}
      data-active={active ? "" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        inContent
          ? "flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm outline-none transition-colors duration-(--duration-fast) hover:bg-accent-hover focus-visible:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring data-[active]:text-primary"
          : topItemClass,
        className,
      )}
      onKeyDown={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
        onKeyDown?.(e);
        if (!inContent && !e.defaultPrevented) handleTopKeyDown(e);
      }}
      {...props}
    />
  );
}

/** Wrap link rows inside `NavigationMenuContent` so they render in panel style. */
export function NavigationMenuPanelList({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <InContentContext.Provider value={true}>
      <ul
        data-slot="navigation-menu-panel-list"
        className={cn("grid gap-1", className)}
        {...props}
      />
    </InContentContext.Provider>
  );
}
