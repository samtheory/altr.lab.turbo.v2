"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "../../lib/utils";
import { buttonVariants, type ButtonProps } from "./button";

export type PaginationProps = React.ComponentProps<"nav"> & {
  ref?: React.Ref<HTMLElement>;
};

export function Pagination({ className, ref, ...props }: PaginationProps) {
  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ref,
  ...props
}: React.ComponentProps<"ul"> & { ref?: React.Ref<HTMLUListElement> }) {
  return (
    <ul
      ref={ref}
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className,
  ref,
  ...props
}: React.ComponentProps<"li"> & { ref?: React.Ref<HTMLLIElement> }) {
  return (
    <li ref={ref} data-slot="pagination-item" className={cn("", className)} {...props} />
  );
}

export type PaginationLinkProps = React.ComponentProps<"a"> &
  Pick<ButtonProps, "size" | "variant"> & {
    isActive?: boolean;
    ref?: React.Ref<HTMLAnchorElement>;
  };

export function PaginationLink({
  className,
  isActive,
  size = "icon",
  variant,
  ref,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive ? "" : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : (variant ?? "ghost"),
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeft aria-hidden className="size-4" />
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight aria-hidden className="size-4" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

/** Build a compact page list with ellipsis gaps. */
export function getPaginationRange(
  page: number,
  pageCount: number,
  siblingCount = 1,
): Array<number | "ellipsis"> {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];
  const totalNumbers = siblingCount * 2 + 5;
  if (pageCount <= totalNumbers) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;
  const items: Array<number | "ellipsis"> = [1];
  if (showLeftEllipsis) items.push("ellipsis");
  else for (let i = 2; i < left; i++) items.push(i);
  for (let i = left; i <= right; i++) {
    if (i !== 1 && i !== pageCount) items.push(i);
  }
  if (showRightEllipsis) items.push("ellipsis");
  else for (let i = right + 1; i < pageCount; i++) items.push(i);
  if (pageCount > 1) items.push(pageCount);
  return items;
}
