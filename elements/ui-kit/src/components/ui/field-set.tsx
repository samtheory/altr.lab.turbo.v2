import * as React from "react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";

export type FieldSetProps = Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> & {
  legend?: React.ReactNode;
  description?: React.ReactNode;
  /** `plain` stacks rows; `framed` draws a bordered list with separators. */
  variant?: "plain" | "framed";
  children: React.ReactNode;
};

/** Native fieldset: `disabled` disables every control inside. */
export function FieldSet({
  legend,
  description,
  variant = "plain",
  className,
  children,
  ...props
}: FieldSetProps) {
  const descriptionId = useId();
  return (
    <fieldset
      data-slot="field-set"
      data-variant={variant}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      {...props}
    >
      {legend ? <FieldLegend>{legend}</FieldLegend> : null}
      {description ? (
        <p id={descriptionId} className="mb-3 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div
        data-slot="field-set-content"
        className={cn(
          variant === "plain" && "flex flex-col gap-4",
          variant === "framed" &&
            "divide-y divide-border overflow-hidden rounded-lg border border-border bg-card [&>*]:px-4 [&>*]:py-3.5",
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

export function FieldLegend({ className, ...props }: React.HTMLAttributes<HTMLLegendElement>) {
  return (
    <legend
      data-slot="field-legend"
      className={cn("mb-1 p-0 text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}
