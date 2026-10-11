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
          "peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
        {state === true ? <Check className="size-3" aria-hidden /> : null}
        {state === "indeterminate" ? (
          <Minus className="size-3" aria-hidden />
        ) : null}
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
