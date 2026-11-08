"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  ButtonGroup,
  ButtonGroupItem,
  ButtonGroupSeparator,
  type ButtonGroupItemProps,
  type ButtonGroupProps,
} from "./button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  type DropdownMenuProps,
} from "./dropdown-menu";

export type SplitButtonProps = ButtonGroupProps &
  Pick<DropdownMenuProps, "open" | "defaultOpen" | "onOpenChange">;

/**
 * Same shell as a button group. The trailing icon opens a menu that
 * grows from the button.
 */
export function SplitButton({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: SplitButtonProps) {
  return (
    <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <ButtonGroup {...props}>{children}</ButtonGroup>
    </DropdownMenu>
  );
}

export type SplitButtonActionProps = ButtonGroupItemProps;

/** Main click target. Does not open the menu. */
export function SplitButtonAction(props: SplitButtonActionProps) {
  return <ButtonGroupItem {...props} />;
}

export type SplitButtonMenuProps = {
  children: React.ReactNode;
  /** Accessible name for the icon trigger. */
  label?: string;
  icon?: React.ReactNode;
  className?: string;
};

/** Trailing icon. Click, ArrowDown, or ArrowUp opens the menu. */
export function SplitButtonMenu({
  children,
  label = "More actions",
  icon,
  className,
}: SplitButtonMenuProps) {
  return (
    <>
      <ButtonGroupSeparator />
      <DropdownMenuTrigger asChild>
        <ButtonGroupItem aria-label={label} className={cn("aspect-square px-0", className)}>
          {icon ?? (
            <ChevronDown
              aria-hidden
              className="transition-transform duration-200 ease-(--ease-out) group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          )}
        </ButtonGroupItem>
      </DropdownMenuTrigger>
      <DropdownMenuContent motion="expand" align="end" sideOffset={6}>
        {children}
      </DropdownMenuContent>
    </>
  );
}
