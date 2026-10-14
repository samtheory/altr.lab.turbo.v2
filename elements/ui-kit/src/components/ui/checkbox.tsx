"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "../../lib/utils";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

export type CheckboxProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  name?: string;
  value?: string;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  name,
  value = "on",
  id: idProp,
  ref,
  ...props
}: CheckboxProps) {
  const id = useId(idProp);
  const [state, setState] = useControllableState<boolean | "indeterminate">({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  const ariaChecked = state === "indeterminate" ? "mixed" : state;

  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={id}
        data-slot="checkbox"
        data-state={
          state === "indeterminate"
            ? "indeterminate"
            : state
              ? "checked"
              : "unchecked"
        }
        data-disabled={disabled ? "" : undefined}
        aria-checked={ariaChecked}
        disabled={disabled}
        className={cn(
          "peer relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[5px]",
          "border border-input/80 bg-muted/45 text-primary-foreground shadow-none",
          "transition-[background-color,border-color,box-shadow,transform,color] duration-(--duration-base) ease-(--ease-out)",
          "hover:border-border-strong hover:bg-muted/75",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
          "active:scale-[0.88]",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
          "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
          "motion-reduce:transition-none motion-reduce:active:scale-100",
          className,
        )}
        onClick={() => {
          if (state === "indeterminate") setState(true);
          else setState(!state);
        }}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            if (state === "indeterminate") setState(true);
            else setState(!state);
          }
        }}
        {...props}
      >
        <Check
          aria-hidden
          className={cn(
            "pointer-events-none absolute size-3",
            "transition-[opacity,transform] duration-(--duration-base) ease-(--ease-out)",
            "motion-reduce:transition-none",
            state === true
              ? "opacity-100 scale-100 animate-[apolyx-check-in_180ms_var(--ease-out)] motion-reduce:animate-none"
              : "opacity-0 scale-50",
          )}
          strokeWidth={2.75}
        />
        <Minus
          aria-hidden
          className={cn(
            "pointer-events-none absolute size-3",
            "transition-[opacity,transform] duration-(--duration-base) ease-(--ease-out)",
            "motion-reduce:transition-none",
            state === "indeterminate"
              ? "opacity-100 scale-100 animate-[apolyx-check-in_180ms_var(--ease-out)] motion-reduce:animate-none"
              : "opacity-0 scale-50",
          )}
          strokeWidth={2.75}
        />
      </button>
      {name ? (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={state === true}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      ) : null}
    </span>
  );
}
