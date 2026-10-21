"use client";

import * as React from "react";
import { Circle } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  RovingFocusGroup,
  RovingFocusItem,
} from "../../primitives/roving-focus";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import { useOptionalField } from "./field";

type RadioGroupContextValue = {
  value: string;
  setValue: (value: string) => void;
  name: string;
  disabled: boolean;
  required: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroupItem must be used within RadioGroup");
  return ctx;
}

export type RadioGroupProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "dir"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  orientation?: "horizontal" | "vertical";
};

export function RadioGroup({
  value,
  defaultValue = "",
  onValueChange,
  name: nameProp,
  disabled = false,
  required = false,
  orientation = "vertical",
  className,
  children,
  ...props
}: RadioGroupProps) {
  const field = useOptionalField();
  const [current, setValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const name = useId(nameProp);
  const setFieldValueLength = field?.setValueLength;
  React.useEffect(() => {
    setFieldValueLength?.(current ? 1 : 0);
  }, [current, setFieldValueLength]);

  return (
    <RadioGroupContext.Provider
      value={{
        value: current,
        setValue,
        name,
        disabled: disabled || !!field?.disabled,
        required: required || !!field?.required,
      }}
    >
      <RovingFocusGroup
        role="radiogroup"
        aria-required={required || field?.required || undefined}
        aria-disabled={disabled || field?.disabled || undefined}
        aria-orientation={orientation}
        orientation={orientation}
        data-slot="radio-group"
        className={cn(
          "grid gap-2",
          orientation === "horizontal" && "grid-flow-col auto-cols-max",
          className,
        )}
        {...props}
      >
        {children}
      </RovingFocusGroup>
      <input
        type="hidden"
        name={nameProp ?? name}
        value={current}
        disabled={disabled || !!field?.disabled}
      />
    </RadioGroupContext.Provider>
  );
}

export type RadioGroupItemProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange"
> & {
  value: string;
  ref?: React.Ref<HTMLButtonElement>;
};

export function RadioGroupItem({
  value,
  className,
  disabled,
  id: idProp,
  ref,
  ...props
}: RadioGroupItemProps) {
  const group = useRadioGroup();
  const id = useId(idProp);
  const checked = group.value === value;
  const isDisabled = disabled || group.disabled;

  return (
    <RovingFocusItem
      id={value}
      domId={id}
      role="radio"
      aria-checked={checked}
      disabled={isDisabled}
      data-slot="radio-group-item"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "peer relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background text-primary shadow-sm",
        "transition-[border-color,background-color,box-shadow] duration-(--duration-fast)",
        "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
        if (!event.defaultPrevented && !isDisabled) group.setValue(value);
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event as React.KeyboardEvent<HTMLButtonElement>);
        if (
          !event.defaultPrevented &&
          !isDisabled &&
          (event.key === " " || event.key === "Enter")
        ) {
          event.preventDefault();
          group.setValue(value);
        }
      }}
      ref={ref}
      {...props}
    >
      {checked ? (
        <Circle
          aria-hidden
          className="size-2.5 fill-current animate-[apolyx-check-in_160ms_var(--ease-out)_both] motion-reduce:animate-none"
        />
      ) : null}
    </RovingFocusItem>
  );
}
