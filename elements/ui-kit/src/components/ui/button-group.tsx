"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";

const buttonGroupVariants = cva(
  "group/button-group inline-flex items-stretch overflow-visible rounded-md border shadow-sm [&_[data-slot=button-group-segment]]:rounded-none [&_[data-slot=button-group-segment]:first-child]:rounded-l-md [&_[data-slot=button-group-segment]:last-child]:rounded-r-md",
  {
    variants: {
      variant: {
        outline:
          "border-input bg-background text-foreground [--button-group-line:var(--border)]",
        default:
          "border-transparent bg-primary text-primary-foreground [--button-group-line:color-mix(in_oklch,var(--primary-foreground)_30%,transparent)]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type ButtonGroupContextValue = {
  size: NonNullable<ButtonProps["size"]>;
  variant: NonNullable<VariantProps<typeof buttonGroupVariants>["variant"]>;
};

const ButtonGroupContext = React.createContext<ButtonGroupContextValue | null>(null);

function useButtonGroup() {
  const ctx = React.useContext(ButtonGroupContext);
  if (!ctx) throw new Error("Button group parts must be used within ButtonGroup");
  return ctx;
}

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof buttonGroupVariants> & {
    size?: ButtonProps["size"];
  };

/** Joined control. Put a separator between a button and any other widget. */
export function ButtonGroup({
  className,
  variant = "outline",
  size = "md",
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <ButtonGroupContext.Provider value={{ size: size ?? "md", variant: variant ?? "outline" }}>
      <div
        role="group"
        data-slot="button-group"
        data-variant={variant}
        className={cn(buttonGroupVariants({ variant }), className)}
        {...props}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}

export type ButtonGroupItemProps = ButtonProps;

/** Action side of a group. Shares the group's height and drops its own chrome. */
export function ButtonGroupItem({
  className,
  size,
  variant = "ghost",
  type = "button",
  ...props
}: ButtonGroupItemProps) {
  const ctx = useButtonGroup();
  return (
    <Button
      type={type}
      data-slot="button-group-segment"
      variant={variant}
      size={size ?? ctx.size}
      className={cn(
        "group rounded-none border-0 bg-transparent shadow-none",
        ctx.variant === "outline" && "hover:bg-accent-hover hover:text-accent-foreground",
        ctx.variant === "default" &&
          "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Anything that is not the action: an icon, a count, a label. */
export function ButtonGroupAddon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { size } = useButtonGroup();
  return (
    <div
      data-slot="button-group-segment"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 text-sm [&_svg]:size-4 [&_svg]:shrink-0",
        size === "xs" && "h-7 px-2 text-xs",
        size === "sm" && "h-9 px-2.5",
        (size === "md" || size === "default") && "h-10 px-3",
        size === "lg" && "h-11 px-3.5",
        size === "icon" && "h-10 px-3",
        size === "icon-xs" && "h-7 px-2 text-xs",
        className,
      )}
      {...props}
    />
  );
}

/** Hairline between segments. Omit it when the parts should sit flush. */
export function ButtonGroupSeparator({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      data-slot="button-group-separator"
      className={cn("my-1.5 w-px shrink-0 self-stretch bg-(--button-group-line)", className)}
      {...props}
    />
  );
}

export { buttonGroupVariants };
