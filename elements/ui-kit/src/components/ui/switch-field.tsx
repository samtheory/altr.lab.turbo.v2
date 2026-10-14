"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import { Switch, switchTones, type SwitchProps } from "./switch";

type SwitchPassthrough = Omit<SwitchProps, "className" | "children" | "aria-labelledby">;

function useSwitchState({ checked, defaultChecked = false, onCheckedChange }: SwitchPassthrough) {
  return useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
}

export type SwitchFieldProps = SwitchPassthrough & {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Content after the label text: a badge, an info tooltip. */
  aside?: React.ReactNode;
  /** Where the switch sits in the row. */
  side?: "start" | "end";
  className?: string;
  switchClassName?: string;
};

/** A labelled settings row; the whole row toggles the switch. */
export function SwitchField({
  label,
  description,
  aside,
  side = "end",
  className,
  switchClassName,
  id: idProp,
  disabled,
  checked,
  defaultChecked,
  onCheckedChange,
  ...switchProps
}: SwitchFieldProps) {
  const id = useId(idProp);
  const labelId = useId();
  const descriptionId = useId();
  const [on, setOn] = useSwitchState({ checked, defaultChecked, onCheckedChange });

  const control = (
    <Switch
      {...switchProps}
      id={id}
      disabled={disabled}
      checked={on}
      onCheckedChange={setOn}
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("mt-0.5", switchClassName)}
    />
  );

  return (
    <label
      htmlFor={id}
      data-slot="switch-field"
      data-state={on ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "group/switch-field flex cursor-pointer items-start gap-3",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      {side === "start" ? control : null}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-foreground/85 transition-colors duration-(--duration-fast) group-hover/switch-field:text-foreground">
          <span id={labelId}>{label}</span>
          {aside}
        </span>
        {description ? (
          <span id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {side === "end" ? control : null}
    </label>
  );
}

export type SwitchCardProps = SwitchPassthrough & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** A selectable tile: the card is the click target, the switch sits top-right. */
export function SwitchCard({
  title,
  description,
  icon,
  className,
  children,
  id: idProp,
  tone = "primary",
  disabled,
  checked,
  defaultChecked,
  onCheckedChange,
  ...switchProps
}: SwitchCardProps) {
  const id = useId(idProp);
  const titleId = useId();
  const descriptionId = useId();
  const [on, setOn] = useSwitchState({ checked, defaultChecked, onCheckedChange });

  return (
    <label
      htmlFor={id}
      data-slot="switch-card"
      data-state={on ? "checked" : "unchecked"}
      data-tone={tone}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm",
        "transition-[border-color,background-color,box-shadow] duration-(--duration-base) ease-(--ease-out)",
        "hover:border-border-strong",
        "data-[state=checked]:border-(--switch-tone) data-[state=checked]:bg-[color-mix(in_oklch,var(--switch-tone)_6%,var(--card))] data-[state=checked]:ring-1 data-[state=checked]:ring-(--switch-tone)/30",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        switchTones[tone],
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors duration-(--duration-base) [&_svg]:size-4.5 in-data-[state=checked]:bg-[color-mix(in_oklch,var(--switch-tone)_14%,transparent)] in-data-[state=checked]:text-(--switch-tone)"
        >
          {icon}
        </span>
      ) : null}
      <span className="grid min-w-0 flex-1 gap-1">
        <span id={titleId} className="text-sm font-medium leading-tight">
          {title}
        </span>
        {description ? (
          <span id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
        {children}
      </span>
      <Switch
        {...switchProps}
        id={id}
        tone={tone}
        disabled={disabled}
        checked={on}
        onCheckedChange={setOn}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </label>
  );
}
