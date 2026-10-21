"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
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
import { controlHeight, controlText } from "./control-box";
import { useOptionalField } from "./field";

const OPTION_SELECTOR = '[role="option"]';

type ItemRecord = {
  value: string;
  label: string;
  disabled: boolean;
  textValue: string;
};

type SelectContextValue = {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (restoreFocus: boolean) => void;
  disabled: boolean;
  name?: string;
  required?: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  focusOnOpen: React.MutableRefObject<"first" | "last" | "selected">;
  triggerId: string;
  listboxId: string;
  registerItem: (item: ItemRecord) => void;
  unregisterItem: (value: string) => void;
  getLabel: (value: string) => string | undefined;
  size: NonNullable<VariantProps<typeof selectTriggerVariants>["size"]>;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select parts must be used within Select");
  return ctx;
}

export { useSelect as useSelectContext };

export const selectTriggerVariants = cva(
  [
    "inline-flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-transparent",
    "transition-[border-color,box-shadow,background-color] duration-(--duration-slow) ease-(--ease-out)",
    "outline-none focus-visible:duration-(--duration-base)",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:bg-destructive/5 aria-invalid:focus-visible:ring-destructive/30",
    "[&>span]:line-clamp-1 [&>span]:text-left",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      },
      variant: {
        outline:
          "bg-muted/55 shadow-none hover:bg-muted/80 focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:shadow-[0_0_0_1px_color-mix(in_oklch,var(--ring)_35%,transparent)] data-[state=open]:bg-background data-[state=open]:ring-[3px] data-[state=open]:ring-ring/30",
        filled:
          "bg-muted hover:bg-muted/90 focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=open]:bg-background data-[state=open]:ring-[3px] data-[state=open]:ring-ring/30",
        ghost:
          "bg-transparent hover:bg-accent-hover/50 focus-visible:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/25",
      },
    },
    defaultVariants: { size: "md", variant: "outline" },
  },
);

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  size?: NonNullable<VariantProps<typeof selectTriggerVariants>["size"]>;
  children: React.ReactNode;
};

export function Select({
  value,
  defaultValue = "",
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  name,
  required,
  size = "md",
  children,
}: SelectProps) {
  const [current, setValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const focusOnOpen = React.useRef<"first" | "last" | "selected">("selected");
  const triggerId = useId();
  const listboxId = useId();
  const [items, setItems] = React.useState(() => new Map<string, ItemRecord>());

  const registerItem = React.useCallback((item: ItemRecord) => {
    setItems((prev) => {
      const existing = prev.get(item.value);
      if (
        existing &&
        existing.label === item.label &&
        existing.disabled === item.disabled &&
        existing.textValue === item.textValue
      ) {
        return prev;
      }
      const next = new Map(prev);
      next.set(item.value, item);
      return next;
    });
  }, []);

  // Keep labels after the listbox unmounts so SelectValue still shows the chosen text.
  const unregisterItem = React.useCallback((_itemValue: string) => {}, []);

  const getLabel = React.useCallback(
    (itemValue: string) => items.get(itemValue)?.label,
    [items],
  );

  const close = React.useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus) {
        queueMicrotask(() => triggerRef.current?.focus());
      }
    },
    [setOpen],
  );

  const field = useOptionalField();
  const setFieldValueLength = field?.setValueLength;
  React.useEffect(() => {
    setFieldValueLength?.(current ? 1 : 0);
  }, [current, setFieldValueLength]);

  return (
    <SelectContext.Provider
      value={{
        value: current,
        setValue,
        open: isOpen,
        setOpen,
        close,
        disabled: disabled || !!field?.disabled,
        name,
        required: required || !!field?.required,
        triggerRef,
        focusOnOpen,
        triggerId,
        listboxId,
        registerItem,
        unregisterItem,
        getLabel,
        size: field?.size ?? size,
      }}
    >
      {children}
      {name ? (
        <input type="hidden" name={name} value={current} required={required} disabled={disabled} />
      ) : null}
    </SelectContext.Provider>
  );
}

export type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof selectTriggerVariants> & {
    asChild?: boolean;
  };

export function SelectTrigger({
  asChild,
  className,
  size: sizeProp,
  variant,
  onClick,
  onKeyDown,
  children,
  id: idProp,
  ...props
}: SelectTriggerProps) {
  const {
    open,
    setOpen,
    disabled,
    triggerRef,
    focusOnOpen,
    triggerId,
    listboxId,
    size: rootSize,
  } = useSelect();
  const field = useOptionalField();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  const size = sizeProp ?? rootSize;
  const inField = !!field;

  return (
    <Comp
      ref={triggerRef}
      id={idProp ?? field?.id ?? triggerId}
      type={asChild ? undefined : "button"}
      role="combobox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-haspopup="listbox"
      aria-autocomplete="none"
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      disabled={disabled || props.disabled}
      data-state={open ? "open" : "closed"}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        inField
          ? cn(
              "inline-flex w-full min-w-0 items-center justify-between gap-2 bg-transparent px-3 outline-none",
              controlHeight,
              controlText,
              "disabled:cursor-not-allowed",
            )
          : selectTriggerVariants({ size, variant }),
        className,
      )}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        focusOnOpen.current = "selected";
        setOpen(!open);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (disabled) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusOnOpen.current = "selected";
          setOpen(true);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          focusOnOpen.current = "last";
          setOpen(true);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          focusOnOpen.current = "selected";
          setOpen(!open);
        }
      }}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast)",
          open && "rotate-180",
        )}
      />
    </Comp>
  );
}

export type SelectValueProps = React.HTMLAttributes<HTMLSpanElement> & {
  placeholder?: string;
};

export function SelectValue({
  className,
  placeholder = "Select…",
  ...props
}: SelectValueProps) {
  const { value, getLabel } = useSelect();
  const label = value ? getLabel(value) : undefined;
  const empty = !value || label == null;

  return (
    <span
      data-slot="select-value"
      data-placeholder={empty ? "" : undefined}
      className={cn(empty && "text-muted-foreground", className)}
      {...props}
    >
      {empty ? placeholder : label}
    </span>
  );
}

export type SelectContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  position?: "popper" | "item-aligned";
};

export function SelectContent(props: SelectContentProps) {
  const { open } = useSelect();
  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <SelectPanel present={present} {...props} />
        </Portal>
      )}
    </Presence>
  );
}

function getOptions(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []).filter(
    (el) => !el.hasAttribute("data-disabled"),
  );
}

function SelectPanel({
  present,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  children,
  position = "popper",
  ...props
}: SelectContentProps & { present: boolean }) {
  const { close, triggerRef, focusOnOpen, listboxId, triggerId, value } = useSelect();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { style } = useFloating({
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side,
    align,
    offset: sideOffset,
  });

  React.useEffect(() => {
    const options = getOptions(panelRef.current);
    if (!options.length) {
      panelRef.current?.focus();
      return;
    }
    if (focusOnOpen.current === "last") {
      options[options.length - 1]?.focus();
      return;
    }
    if (focusOnOpen.current === "selected" && value) {
      const selected = options.find((el) => el.getAttribute("data-value") === value);
      if (selected) {
        selected.focus();
        return;
      }
    }
    options[0]?.focus();
  }, [focusOnOpen, value]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    const options = getOptions(panelRef.current);
    if (!options.length) return;
    const index = options.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) =>
      options[(i + options.length) % options.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index < 0 ? options.length - 1 : index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(options.length - 1);
        break;
      case "Tab":
        event.preventDefault();
        close(true);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const char = event.key.toLowerCase();
          const ordered = [
            ...options.slice(index + 1),
            ...options.slice(0, index + 1),
          ];
          ordered
            .find((el) =>
              (el.getAttribute("data-text-value") ?? el.textContent ?? "")
                .trim()
                .toLowerCase()
                .startsWith(char),
            )
            ?.focus();
        }
    }
  };

  const width =
    position === "popper" && triggerRef.current
      ? triggerRef.current.offsetWidth
      : undefined;

  const hidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 };

  return (
    <DismissableLayer
      onDismiss={() => close(true)}
      ignoreRefs={[triggerRef]}
      ref={panelRef}
      style={{
        ...style,
        ...(width ? { minWidth: width } : null),
      }}
      className="z-50"
    >
      <motion.div
        initial={hidden}
        animate={present ? { opacity: 1, scale: 1, y: 0 } : hidden}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={-1}
          data-slot="select-content"
          data-state={present ? "open" : "closed"}
          className={cn(
            "max-h-72 overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
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

export function SelectGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" data-slot="select-group" className={cn("p-0", className)} {...props} />
  );
}

export function SelectLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export type SelectItemProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  value: string;
  disabled?: boolean;
  textValue?: string;
};

export function SelectItem({
  value,
  disabled,
  textValue,
  className,
  children,
  onClick,
  onKeyDown,
  onPointerMove,
  ...props
}: SelectItemProps) {
  const { value: selected, setValue, close, registerItem, unregisterItem } = useSelect();
  const ref = React.useRef<HTMLDivElement>(null);
  const isSelected = selected === value;

  const labelText = React.useMemo(() => {
    if (textValue) return textValue;
    if (typeof children === "string") return children;
    return "";
  }, [children, textValue]);

  React.useLayoutEffect(() => {
    const label =
      textValue ||
      ref.current?.textContent?.replace(/\s+/g, " ").trim() ||
      labelText ||
      value;
    registerItem({ value, label, disabled: !!disabled, textValue: label });
    return () => unregisterItem(value);
  }, [value, disabled, textValue, labelText, registerItem, unregisterItem]);

  const activate = () => {
    if (disabled) return;
    setValue(value);
    close(true);
  };

  return (
    <div
      ref={ref}
      role="option"
      tabIndex={-1}
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-state={isSelected ? "checked" : "unchecked"}
      data-value={value}
      data-text-value={textValue ?? labelText}
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none",
        "transition-colors duration-(--duration-fast)",
        "focus:bg-accent-hover focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        activate();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!disabled) event.currentTarget.focus();
      }}
      {...props}
    >
      <span className="flex flex-1 items-center gap-2 truncate">{children}</span>
      {isSelected ? (
        <span className="absolute right-2 flex size-4 items-center justify-center">
          <Check aria-hidden className="size-4" />
        </span>
      ) : null}
    </div>
  );
}
