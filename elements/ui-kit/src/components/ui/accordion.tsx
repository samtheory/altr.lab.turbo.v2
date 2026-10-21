"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

type AccordionType = "single" | "multiple";

type AccordionContextValue = {
  type: AccordionType;
  value: string[];
  toggle: (itemValue: string) => void;
  collapsible: boolean;
  baseId: string;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion parts must be used within Accordion");
  return ctx;
}

type ItemContextValue = {
  value: string;
  open: boolean;
  triggerId: string;
  contentId: string;
};

const ItemContext = React.createContext<ItemContextValue | null>(null);

function useAccordionItem() {
  const ctx = React.useContext(ItemContext);
  if (!ctx) throw new Error("AccordionTrigger/Content must be in AccordionItem");
  return ctx;
}

export type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: AccordionType;
  /** Controlled open item value(s). Single: string; multiple: string[]. */
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** When `type="single"`, allow closing the open item. */
  collapsible?: boolean;
};

function toArray(value: string | string[] | undefined): string[] {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) {
  const [raw, setRaw] = useControllableState<string | string[]>({
    value,
    defaultValue: defaultValue ?? (type === "multiple" ? [] : ""),
    onChange: onValueChange,
  });
  const openValues = toArray(raw);
  const baseId = useId();

  const toggle = React.useCallback(
    (itemValue: string) => {
      if (type === "single") {
        const isOpen = openValues[0] === itemValue;
        if (isOpen && !collapsible) return;
        setRaw(isOpen ? "" : itemValue);
        return;
      }
      const next = openValues.includes(itemValue)
        ? openValues.filter((v) => v !== itemValue)
        : [...openValues, itemValue];
      setRaw(next);
    },
    [type, openValues, collapsible, setRaw],
  );

  return (
    <AccordionContext.Provider
      value={{ type, value: openValues, toggle, collapsible, baseId }}
    >
      <div
        data-slot="accordion"
        data-type={type}
        className={cn("w-full", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  disabled?: boolean;
};

export function AccordionItem({
  value,
  disabled,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { value: openValues, baseId } = useAccordion();
  const open = openValues.includes(value);
  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  return (
    <ItemContext.Provider value={{ value, open, triggerId, contentId }}>
      <div
        data-slot="accordion-item"
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        className={cn("border-b border-border", className)}
        {...props}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useAccordion();
  const { value, open, triggerId, contentId } = useAccordionItem();

  return (
    <h3 className="flex">
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={contentId}
        data-slot="accordion-trigger"
        data-state={open ? "open" : "closed"}
        className={cn(
          "flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors outline-none",
          "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "[&[data-state=open]>svg]:rotate-180",
          className,
        )}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) toggle(value);
        }}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-base)"
        />
      </button>
    </h3>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, triggerId, contentId } = useAccordionItem();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          data-slot="accordion-content"
          data-state="open"
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={cn("pt-0 pb-4 text-sm text-muted-foreground", className)} {...props}>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Single disclosure without accordion grouping. */
export type CollapsibleProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  contentId: string;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible parts must be used within Collapsible");
  return ctx;
}

export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerId = useId();
  const contentId = useId();
  return (
    <CollapsibleContext.Provider value={{ open: isOpen, setOpen, triggerId, contentId }}>
      <div
        data-slot="collapsible"
        data-state={isOpen ? "open" : "closed"}
        className={className}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  asChild,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen, triggerId, contentId } = useCollapsible();
  const Comp = asChild ? "button" : "button";
  return (
    <Comp
      type="button"
      id={triggerId}
      aria-expanded={open}
      aria-controls={contentId}
      data-slot="collapsible-trigger"
      data-state={open ? "open" : "closed"}
      className={className}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function CollapsibleContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, triggerId, contentId } = useCollapsible();
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          data-slot="collapsible-content"
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={cn(className)} {...props}>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
