"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Slot } from "../../primitives/slot";
import { useId } from "../../primitives/use-id";

/** Vertical navigation list — use inside a sidebar column or a left / right `Sheet`. */
export function NavList({
  className,
  "aria-label": ariaLabel = "Main",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      data-slot="nav-list"
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export function NavListGroup({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: React.ReactNode }) {
  const labelId = useId();
  return (
    <div data-slot="nav-list-group" className={cn("flex flex-col gap-1", className)} {...props}>
      {label ? <NavListLabel id={labelId}>{label}</NavListLabel> : null}
      <ul className="flex flex-col gap-0.5" aria-labelledby={label ? labelId : undefined}>
        {children}
      </ul>
    </div>
  );
}

export function NavListLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="nav-list-label"
      className={cn(
        "px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type NavListItemProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  asChild?: boolean;
  active?: boolean;
  disabled?: boolean;
};

export function NavListItem({
  asChild,
  active = false,
  disabled = false,
  className,
  ...props
}: NavListItemProps) {
  const Comp = (asChild ? Slot : "a") as React.ElementType;
  return (
    <li>
      <Comp
        data-slot="nav-list-item"
        data-active={active ? "" : undefined}
        aria-current={active ? "page" : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none",
          "transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)",
          "hover:bg-accent-hover hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          "data-[active]:bg-accent data-[active]:text-foreground",
          "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity data-[active]:before:opacity-100",
          "aria-disabled:pointer-events-none aria-disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </li>
  );
}
