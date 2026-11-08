"use client";

import * as React from "react";
import { Check, Circle } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { Portal } from "../../primitives/portal";
import { Presence } from "../../primitives/presence";
import { Slot } from "../../primitives/slot";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useFloating } from "../../primitives/use-floating";
import { useId } from "../../primitives/use-id";
import type { Align, Side } from "../../primitives/position";

const ITEM_SELECTOR =
  '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

type MenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (restoreFocus: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  focusOnOpen: React.MutableRefObject<"first" | "last">;
  triggerId: string;
  contentId: string;
};

const MenuContext = React.createContext<MenuContextValue | null>(null);

function useMenu() {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("DropdownMenu parts must be used within DropdownMenu");
  return ctx;
}

export type DropdownMenuProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function DropdownMenu({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const focusOnOpen = React.useRef<"first" | "last">("first");
  const triggerId = useId();
  const contentId = useId();

  const close = React.useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [setOpen],
  );

  return (
    <MenuContext.Provider
      value={{
        open: isOpen,
        setOpen,
        close,
        triggerRef,
        focusOnOpen,
        triggerId,
        contentId,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  onClick,
  onKeyDown,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen, triggerRef, focusOnOpen, triggerId, contentId } =
    useMenu();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Comp
      ref={triggerRef}
      id={triggerId}
      type={asChild ? undefined : "button"}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-state={open ? "open" : "closed"}
      data-slot="dropdown-menu-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        focusOnOpen.current = "first";
        setOpen(!open);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          focusOnOpen.current = event.key === "ArrowDown" ? "first" : "last";
          setOpen(true);
        }
      }}
      {...props}
    />
  );
}

export type DropdownMenuMotion = "settle" | "expand";

export type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  /**
   * `settle` fades in place. `expand` grows from the trigger edge,
   * starting at scale 0 so the menu opens out of the button.
   */
  motion?: DropdownMenuMotion;
};

function expandOrigin(side: Side, align: Align) {
  if (side === "top") {
    return align === "end" ? "bottom right" : align === "start" ? "bottom left" : "bottom center";
  }
  if (side === "left") {
    return align === "end" ? "right bottom" : align === "start" ? "right top" : "right center";
  }
  if (side === "right") {
    return align === "end" ? "left bottom" : align === "start" ? "left top" : "left center";
  }
  return align === "end" ? "top right" : align === "start" ? "top left" : "top center";
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
  const { open } = useMenu();
  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <MenuPanel present={present} {...props} />
        </Portal>
      )}
    </Presence>
  );
}

function getItems(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []).filter(
    (el) => !el.hasAttribute("data-disabled"),
  );
}

function MenuPanel({
  present,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  motion: motionKind = "settle",
  className,
  children,
  ...props
}: DropdownMenuContentProps & { present: boolean }) {
  const { close, triggerRef, focusOnOpen, triggerId, contentId } = useMenu();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const floating = useFloating({
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side,
    align,
    offset: sideOffset,
  });
  const { style } = floating;

  React.useEffect(() => {
    const items = getItems(panelRef.current);
    const target =
      focusOnOpen.current === "last" ? items[items.length - 1] : items[0];
    (target ?? panelRef.current)?.focus();
  }, [focusOnOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    const items = getItems(panelRef.current);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index < 0 ? items.length - 1 : index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Tab":
        event.preventDefault();
        close(true);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const char = event.key.toLowerCase();
          const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
          ordered
            .find((el) => el.textContent?.trim().toLowerCase().startsWith(char))
            ?.focus();
        }
    }
  };

  const expand = motionKind === "expand";
  const hidden = reduced
    ? { opacity: 0 }
    : expand
      ? { opacity: 0, scale: 0 }
      : { opacity: 0, scale: 0.97, y: -4 };

  return (
    <DismissableLayer
      onDismiss={() => close(true)}
      ignoreRefs={[triggerRef]}
      ref={panelRef}
      style={style}
      className="z-50"
    >
      <motion.div
        initial={hidden}
        animate={present ? { opacity: 1, scale: 1, y: 0 } : hidden}
        transition={{
          duration: reduced ? 0 : expand ? 0.2 : 0.14,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={expand ? { transformOrigin: expandOrigin(floating.side, align) } : undefined}
      >
        <div
          id={contentId}
          role="menu"
          aria-labelledby={triggerId}
          aria-orientation="vertical"
          tabIndex={-1}
          data-slot="dropdown-menu-content"
          data-motion={motionKind}
          data-state={present ? "open" : "closed"}
          className={cn(
            "min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            className,
          )}
          {...props}
          onKeyDown={onKeyDown}
        >
          {children}
        </div>
      </motion.div>
    </DismissableLayer>
  );
}

const itemClass =
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors duration-(--duration-fast) focus:bg-accent-hover focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

type ItemBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  disabled?: boolean;
  /** Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: Event) => void;
  inset?: boolean;
};

function useItemHandlers(
  disabled: boolean | undefined,
  onSelect: ((event: Event) => void) | undefined,
  onActivate?: () => void,
) {
  const { close } = useMenu();
  const activate = () => {
    if (disabled) return;
    onActivate?.();
    const selectEvent = new Event("apolyx.menu.select", { cancelable: true });
    onSelect?.(selectEvent);
    if (!selectEvent.defaultPrevented) close(true);
  };
  return {
    onClick: activate,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!disabled) event.currentTarget.focus();
    },
  };
}

export function DropdownMenuItem({
  className,
  disabled,
  onSelect,
  inset,
  ...props
}: ItemBaseProps) {
  const handlers = useItemHandlers(disabled, onSelect);
  return (
    <div
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-slot="dropdown-menu-item"
      className={cn(itemClass, inset && "pl-8", className)}
      {...handlers}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  disabled,
  onSelect,
  checked,
  defaultChecked = false,
  onCheckedChange,
  children,
  ...props
}: ItemBaseProps & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const [isChecked, setChecked] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
  const handlers = useItemHandlers(disabled, onSelect, () =>
    setChecked(!isChecked),
  );
  return (
    <div
      role="menuitemcheckbox"
      tabIndex={-1}
      aria-checked={isChecked}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-state={isChecked ? "checked" : "unchecked"}
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemClass, "pl-8", className)}
      {...handlers}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        {isChecked ? <Check aria-hidden /> : null}
      </span>
      {children}
    </div>
  );
}

type RadioContextValue = { value: string; setValue: (v: string) => void };
const RadioContext = React.createContext<RadioContextValue | null>(null);

export function DropdownMenuRadioGroup({
  value,
  defaultValue = "",
  onValueChange,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [current, setValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  return (
    <RadioContext.Provider value={{ value: current, setValue }}>
      <div role="group" {...props}>
        {children}
      </div>
    </RadioContext.Provider>
  );
}

export function DropdownMenuRadioItem({
  value,
  className,
  disabled,
  onSelect,
  children,
  ...props
}: ItemBaseProps & { value: string }) {
  const group = React.useContext(RadioContext);
  if (!group) throw new Error("DropdownMenuRadioItem must be in DropdownMenuRadioGroup");
  const checked = group.value === value;
  const handlers = useItemHandlers(disabled, onSelect, () => group.setValue(value));
  return (
    <div
      role="menuitemradio"
      tabIndex={-1}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-state={checked ? "checked" : "unchecked"}
      data-slot="dropdown-menu-radio-item"
      className={cn(itemClass, "pl-8", className)}
      {...handlers}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        {checked ? <Circle aria-hidden className="!size-2 fill-current" /> : null}
      </span>
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto font-mono text-xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}
