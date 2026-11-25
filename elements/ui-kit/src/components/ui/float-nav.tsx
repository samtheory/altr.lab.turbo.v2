"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Slot } from "../../primitives/slot";

export type FloatNavProps = React.HTMLAttributes<HTMLElement> & {
  /** Pixels of scroll before hide/show engages. */
  threshold?: number;
  /** Force visible (e.g. for demos). */
  visible?: boolean;
  "aria-label"?: string;
};

/** Floating nav that hides on scroll-down and returns on scroll-up. */
export function FloatNav({
  threshold = 12,
  visible: visibleProp,
  className,
  children,
  "aria-label": ariaLabel = "Primary",
  ...props
}: FloatNavProps) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(true);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    if (visibleProp !== undefined) return;
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < threshold) return;
      setVisible(delta < 0 || y < 24);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, visibleProp]);

  const show = visibleProp ?? visible;

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key="float-nav"
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
        >
          <nav
            data-slot="float-nav"
            aria-label={ariaLabel}
            className={cn(
              "flex items-center gap-1 rounded-full border border-border/80 bg-card/85 px-2 py-1.5 text-sm shadow-lg backdrop-blur-md",
              className,
            )}
            {...props}
          >
            {children}
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export type FloatNavItemProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
  asChild?: boolean;
};

export function FloatNavItem({
  className,
  active,
  asChild,
  ...props
}: FloatNavItemProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="float-nav-item"
      data-active={active ? "" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-muted text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type FloatNavActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function FloatNavAction({ className, asChild, ...props }: FloatNavActionProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="float-nav-action"
      className={cn(
        "ml-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground",
        "transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
