import * as React from "react";

import { cn } from "../../lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
};

export function Skeleton({ className, ref, ...props }: SkeletonProps) {
  return (
    <div
      ref={ref}
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted",
        "motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
