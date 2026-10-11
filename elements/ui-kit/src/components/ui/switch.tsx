"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Switch({
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
}: SwitchProps) {
  const id = useId(idProp);
  const [on, setOn] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        data-slot="switch"
        data-state={on ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        aria-checked={on}
        disabled={disabled}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onClick={() => setOn(!on)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setOn(!on);
          }
        }}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      {name ? (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={on}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      ) : null}
    </span>
  );
}
