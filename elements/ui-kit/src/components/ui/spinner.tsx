import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";
import { VisuallyHidden } from "../../primitives/visually-hidden";

export type SpinnerProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  ref?: React.Ref<HTMLDivElement>;
};

export function Spinner({
  className,
  label = "Loading",
  ref,
  ...props
}: SpinnerProps) {
  return (
    <div
      ref={ref}
      role="status"
      data-slot="spinner"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className="size-4 animate-spin text-foreground" aria-hidden />
      <VisuallyHidden>{label}</VisuallyHidden>
    </div>
  );
}
