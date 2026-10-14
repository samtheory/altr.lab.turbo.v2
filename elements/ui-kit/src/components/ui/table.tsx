import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const tableVariants = cva("w-full caption-bottom border-collapse text-sm", {
  variants: {
    density: {
      compact: "[&_td]:px-3 [&_td]:py-1.5 [&_th]:h-8 [&_th]:px-3",
      default: "[&_td]:px-4 [&_td]:py-3 [&_th]:h-10 [&_th]:px-4",
    },
    striped: {
      true: "[&_tbody_tr:nth-child(even)]:bg-muted/40",
      false: "",
    },
  },
  defaultVariants: { density: "default", striped: false },
});

export type TableProps = React.TableHTMLAttributes<HTMLTableElement> &
  VariantProps<typeof tableVariants> & {
    /** Keep the header visible while the wrapper scrolls (needs a max height on `containerClassName`). */
    stickyHeader?: boolean;
    containerClassName?: string;
    ref?: React.Ref<HTMLTableElement>;
  };

export function Table({
  className,
  containerClassName,
  density,
  striped,
  stickyHeader = false,
  ref,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-auto rounded-lg border border-border",
        containerClassName,
      )}
    >
      <table
        ref={ref}
        data-slot="table"
        data-sticky-header={stickyHeader ? "" : undefined}
        className={cn(
          tableVariants({ density, striped }),
          stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-muted",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/60 [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-muted/60 font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  selected,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      data-state={selected ? "selected" : undefined}
      aria-selected={selected || undefined}
      className={cn(
        "border-b border-border transition-colors duration-(--duration-fast)",
        "[tbody_&]:hover:bg-accent-hover/50",
        "data-[state=selected]:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  scope = "col",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "whitespace-nowrap text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground",
        "[&:has([role=checkbox])]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      data-slot="table-cell"
      className={cn("align-middle [&:has([role=checkbox])]:w-px", className)}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("py-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { tableVariants };
