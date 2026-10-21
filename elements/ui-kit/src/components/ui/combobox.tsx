"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
import { selectTriggerVariants } from "./select";

const OPTION_SELECTOR = '[role="option"]';

type ComboboxItemRecord = {
  value: string;
  label: string;
  disabled: boolean;
  textValue: string;
};

type ComboboxContextValue = {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (restoreFocus: boolean) => void;
  disabled: boolean;
  query: string;
  setQuery: (query: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  triggerId: string;
  listboxId: string;
  registerItem: (item: ComboboxItemRecord) => void;
  unregisterItem: (value: string) => void;
  getLabel: (value: string) => string | undefined;
  filter: (label: string, query: string) => boolean;
  items: Map<string, ComboboxItemRecord>;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useCombobox() {
  const ctx = React.useContext(ComboboxContext);
  if (!ctx) throw new Error("Combobox parts must be used within Combobox");
  return ctx;
}

export { useCombobox as useComboboxContext };

function defaultFilter(label: string, query: string) {
  if (!query) return true;
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

export type ComboboxProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  filter?: (label: string, query: string) => boolean;
  children: React.ReactNode;
};

export function Combobox({
  value,
  defaultValue = "",
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  filter = defaultFilter,
  children,
}: ComboboxProps) {
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
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerId = useId();
  const listboxId = useId();
  const [items, setItems] = React.useState(() => new Map<string, ComboboxItemRecord>());

  const registerItem = React.useCallback((item: ComboboxItemRecord) => {
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

  // Keep labels after the panel unmounts so the trigger still shows the choice.
  const unregisterItem = React.useCallback((_itemValue: string) => {}, []);

  const getLabel = React.useCallback(
    (itemValue: string) => items.get(itemValue)?.label,
    [items],
  );

  const close = React.useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      setQuery("");
      if (restoreFocus) {
        queueMicrotask(() => triggerRef.current?.focus());
      }
    },
    [setOpen],
  );

  React.useEffect(() => {
    if (isOpen) {
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [isOpen]);

  return (
    <ComboboxContext.Provider
      value={{
        value: current,
        setValue,
        open: isOpen,
        setOpen,
        close,
        disabled,
        query,
        setQuery,
        triggerRef,
        inputRef,
        triggerId,
        listboxId,
        registerItem,
        unregisterItem,
        getLabel,
        filter,
        items,
      }}
    >
      {children}
    </ComboboxContext.Provider>
  );
}

export type ComboboxTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  placeholder?: string;
};

export function ComboboxTrigger({
  asChild,
  className,
  placeholder = "Search…",
  onClick,
  onKeyDown,
  children,
  ...props
}: ComboboxTriggerProps) {
  const { open, setOpen, disabled, triggerRef, triggerId, listboxId, value, getLabel, setQuery } =
    useCombobox();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  const label = value ? getLabel(value) : undefined;

  return (
    <Comp
      ref={triggerRef}
      id={triggerId}
      type={asChild ? undefined : "button"}
      role="combobox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-haspopup="listbox"
      aria-autocomplete="list"
      disabled={disabled || props.disabled}
      data-state={open ? "open" : "closed"}
      data-slot="combobox-trigger"
      className={cn(selectTriggerVariants({ size: "md", variant: "outline" }), className)}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        setQuery("");
        setOpen(!open);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event);
        if (disabled) return;
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setQuery("");
          setOpen(true);
        }
      }}
      {...props}
    >
      {children ?? (
        <span className={cn("truncate", !label && "text-muted-foreground")}>
          {label ?? placeholder}
        </span>
      )}
      <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </Comp>
  );
}

export type ComboboxContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  inputPlaceholder?: string;
};

export function ComboboxContent(props: ComboboxContentProps) {
  const { open } = useCombobox();
  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <ComboboxPanel present={present} {...props} />
        </Portal>
      )}
    </Presence>
  );
}

function getOptions(root: HTMLElement | null) {
  return Array.from(root?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []).filter(
    (el) =>
      !el.hasAttribute("data-disabled") && el.getAttribute("data-hidden") !== "true",
  );
}

function ComboboxPanel({
  present,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  children,
  inputPlaceholder = "Filter…",
  ...props
}: ComboboxContentProps & { present: boolean }) {
  const {
    close,
    triggerRef,
    inputRef,
    listboxId,
    triggerId,
    query,
    setQuery,
  } = useCombobox();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { style } = useFloating({
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side,
    align,
    offset: sideOffset,
  });

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    const options = getOptions(panelRef.current);
    if (!options.length) return;
    const index = options.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) =>
      options[(i + options.length) % options.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (document.activeElement === inputRef.current) focusAt(0);
        else focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (index <= 0) inputRef.current?.focus();
        else focusAt(index - 1);
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
    }
  };

  const width = triggerRef.current?.offsetWidth;
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 };

  return (
    <DismissableLayer
      onDismiss={() => close(true)}
      ignoreRefs={[triggerRef]}
      ref={panelRef}
      style={{ ...style, ...(width ? { minWidth: width } : null) }}
      className="z-50"
    >
      <motion.div
        initial={hidden}
        animate={present ? { opacity: 1, scale: 1, y: 0 } : hidden}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          data-slot="combobox-content"
          data-state={present ? "open" : "closed"}
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none",
            className,
          )}
          {...props}
          onKeyDown={onListKeyDown}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              data-slot="combobox-input"
              role="searchbox"
              aria-controls={listboxId}
              aria-autocomplete="list"
              placeholder={inputPlaceholder}
              value={query}
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  getOptions(panelRef.current)[0]?.focus();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  close(true);
                }
              }}
            />
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="max-h-60 overflow-y-auto p-1"
          >
            {children}
          </div>
        </div>
      </motion.div>
    </DismissableLayer>
  );
}

export type ComboboxItemProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  value: string;
  disabled?: boolean;
  textValue?: string;
};

export function ComboboxItem({
  value,
  disabled,
  textValue,
  className,
  children,
  onClick,
  onKeyDown,
  onPointerMove,
  ...props
}: ComboboxItemProps) {
  const {
    value: selected,
    setValue,
    close,
    registerItem,
    unregisterItem,
    query,
    filter,
  } = useCombobox();
  const ref = React.useRef<HTMLDivElement>(null);
  const isSelected = selected === value;
  const labelText =
    textValue || (typeof children === "string" ? children : "") || value;

  React.useLayoutEffect(() => {
    const label =
      textValue ||
      ref.current?.textContent?.replace(/\s+/g, " ").trim() ||
      labelText;
    registerItem({ value, label, disabled: !!disabled, textValue: label });
    return () => unregisterItem(value);
  }, [value, disabled, textValue, labelText, registerItem, unregisterItem]);

  const visible = filter(labelText, query);

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
      data-hidden={visible ? undefined : "true"}
      data-state={isSelected ? "checked" : "unchecked"}
      data-value={value}
      data-slot="combobox-item"
      hidden={!visible}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none",
        "focus:bg-accent-hover focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) activate();
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

export function ComboboxEmpty({
  className,
  children = "No results",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { query, items, filter } = useCombobox();
  const empty = Array.from(items.values()).every(
    (item) => item.disabled || !filter(item.label, query),
  );

  if (!empty) return null;

  return (
    <div
      data-slot="combobox-empty"
      className={cn("px-2 py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}
