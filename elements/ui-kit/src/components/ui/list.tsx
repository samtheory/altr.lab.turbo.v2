"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Slot } from "../../primitives/slot";

const listVariants = cva("flex flex-col", {
  variants: {
    variant: {
      plain: "gap-1",
      divided: "divide-y divide-border rounded-lg border border-border",
      card: "gap-2",
    },
  },
  defaultVariants: { variant: "plain" },
});

type ListVariant = NonNullable<VariantProps<typeof listVariants>["variant"]>;

const ListVariantContext = React.createContext<ListVariant>("plain");

export type ListProps = React.HTMLAttributes<HTMLUListElement> &
  VariantProps<typeof listVariants> & {
    ref?: React.Ref<HTMLUListElement>;
  };

export function List({ className, variant, ref, ...props }: ListProps) {
  return (
    <ListVariantContext.Provider value={variant ?? "plain"}>
      <ul
        ref={ref}
        data-slot="list"
        data-variant={variant ?? "plain"}
        className={cn(listVariants({ variant }), className)}
        {...props}
      />
    </ListVariantContext.Provider>
  );
}

const itemVariants: Record<ListVariant, string> = {
  plain: "rounded-md",
  divided: "",
  card: "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
};

export type ListItemProps = React.LiHTMLAttributes<HTMLLIElement> & {
  /**
   * Render the row through a single interactive child (`<a>` / `<button>`) so the
   * whole row is clickable and gets hover + focus styles.
   */
  asChild?: boolean;
};

export function ListItem({ className, asChild, children, ...props }: ListItemProps) {
  const variant = React.useContext(ListVariantContext);
  const row = cn(
    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
    asChild &&
      "outline-none transition-colors duration-(--duration-fast) hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  );
  return (
    <li
      data-slot="list-item"
      className={cn(
        itemVariants[variant],
        "overflow-hidden",
        !asChild && row,
        className,
      )}
      {...props}
    >
      {asChild ? <Slot className={row}>{children}</Slot> : children}
    </li>
  );
}

export function ListItemLeading({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-item-leading"
      className={cn(
        "flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function ListItemContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-item-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

export function ListItemTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-title"
      className={cn("truncate font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function ListItemDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="list-item-description"
      className={cn("truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export function ListItemTrailing({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-item-trailing"
      className={cn("ml-auto flex shrink-0 items-center gap-2 text-muted-foreground", className)}
      {...props}
    />
  );
}

export { listVariants };
