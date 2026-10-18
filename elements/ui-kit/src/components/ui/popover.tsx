"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { durations, easings } from "../../motion/tokens";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { FocusScope } from "../../primitives/focus-scope";
import { Portal } from "../../primitives/portal";
import { Presence } from "../../primitives/presence";
import type { Align, Side } from "../../primitives/position";
import { Slot } from "../../primitives/slot";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useFloating } from "../../primitives/use-floating";
import { useId } from "../../primitives/use-id";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const OPEN_DELAY = 120;
const CLOSE_DELAY = 150;

export type PopoverTriggerMode = "click" | "hover";
export type PopoverMotion = "pop" | "slide" | "fade";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (restoreFocus: boolean) => void;
  openNow: () => void;
  scheduleOpen: () => void;
  scheduleClose: () => void;
  cancelTimers: () => void;
  trigger: PopoverTriggerMode;
  triggerRef: React.RefObject<HTMLElement | null>;
  anchorRef: React.MutableRefObject<HTMLElement | null>;
  positionRef: React.RefObject<HTMLElement | null>;
  titleId: string;
  descriptionId: string;
  contentId: string;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover parts must be used within Popover");
  return ctx;
}

export { usePopover as usePopoverContext };

export type PopoverProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `"click"` toggles. `"hover"` opens after a short delay and stays open across the gap. */
  trigger?: PopoverTriggerMode;
  children: React.ReactNode;
};

export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger = "click",
  children,
}: PopoverProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const positionRef = React.useMemo(
    () =>
      ({
        get current() {
          return anchorRef.current ?? triggerRef.current;
        },
      }) as React.RefObject<HTMLElement | null>,
    [],
  );

  const openTimer = React.useRef<number | undefined>(undefined);
  const closeTimer = React.useRef<number | undefined>(undefined);
  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();

  const cancelTimers = React.useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  }, []);

  React.useEffect(() => () => cancelTimers(), [cancelTimers]);

  const close = React.useCallback(
    (restoreFocus: boolean) => {
      cancelTimers();
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [cancelTimers, setOpen],
  );

  const openNow = React.useCallback(() => {
    cancelTimers();
    setOpen(true);
  }, [cancelTimers, setOpen]);

  const scheduleOpen = React.useCallback(() => {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY);
  }, [setOpen]);

  const scheduleClose = React.useCallback(() => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [setOpen]);

  return (
    <PopoverContext.Provider
      value={{
        open: isOpen,
        setOpen,
        close,
        openNow,
        scheduleOpen,
        scheduleClose,
        cancelTimers,
        trigger,
        triggerRef,
        anchorRef,
        positionRef,
        titleId,
        descriptionId,
        contentId,
      }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function PopoverTrigger({
  asChild,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: TriggerProps) {
  const {
    open,
    setOpen,
    openNow,
    scheduleOpen,
    scheduleClose,
    trigger,
    triggerRef,
    contentId,
  } = usePopover();
  const Comp = (asChild ? Slot : "button") as React.ElementType;

  return (
    <Comp
      ref={triggerRef}
      type={asChild ? undefined : "button"}
      data-slot="popover-trigger"
      data-state={open ? "open" : "closed"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || trigger !== "click") return;
        setOpen(!open);
      }}
      onPointerEnter={(event: React.PointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(event);
        if (trigger === "hover" && event.pointerType !== "touch") scheduleOpen();
      }}
      onPointerLeave={(event: React.PointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(event);
        if (trigger === "hover") scheduleClose();
      }}
      onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        if (trigger === "hover") openNow();
      }}
      onBlur={(event: React.FocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);
        if (trigger !== "hover") return;
        const next = event.relatedTarget as Node | null;
        const content = document.getElementById(contentId);
        if (content?.contains(next)) return;
        scheduleClose();
      }}
      {...props}
    />
  );
}

export function PopoverAnchor({
  asChild,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  const { anchorRef } = usePopover();
  const Comp = (asChild ? Slot : "div") as React.ElementType;
  return (
    <Comp
      ref={anchorRef}
      data-slot="popover-anchor"
      {...props}
    />
  );
}

export type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  /** Enter / exit recipe. Reduced motion always fades. */
  motion?: PopoverMotion;
};

function getTransformOrigin(side: Side, align: Align): string {
  const edge =
    side === "bottom"
      ? "top"
      : side === "top"
        ? "bottom"
        : side === "right"
          ? "left"
          : "right";
  if (side === "top" || side === "bottom") {
    const cross =
      align === "start" ? "left" : align === "end" ? "right" : "center";
    return `${edge} ${cross}`;
  }
  const cross =
    align === "start" ? "top" : align === "end" ? "bottom" : "center";
  return `${edge} ${cross}`;
}

function getHiddenMotion(
  side: Side,
  mode: PopoverMotion,
  reduced: boolean,
): Record<string, number> {
  if (reduced || mode === "fade") return { opacity: 0 };
  const distance = mode === "slide" ? 80 : 8;
  const axis = side === "top" || side === "bottom" ? "y" : "x";
  const sign = side === "bottom" || side === "right" ? -1 : 1;
  const hidden: Record<string, number> = {
    opacity: 0,
    [axis]: sign * distance,
  };
  if (mode === "pop") hidden.scale = 0.95;
  return hidden;
}

function getFocusable(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

export function PopoverContent(props: PopoverContentProps) {
  const { open } = usePopover();
  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <PopoverPanel present={present} {...props} />
        </Portal>
      )}
    </Presence>
  );
}

function PopoverPanel({
  present,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  motion: motionMode = "pop",
  className,
  children,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  ...props
}: PopoverContentProps & { present: boolean }) {
  const {
    close,
    scheduleClose,
    cancelTimers,
    trigger,
    triggerRef,
    anchorRef,
    positionRef,
    titleId,
    descriptionId,
    contentId,
  } = usePopover();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduced = Boolean(useReducedMotion());
  const { style, side: resolvedSide } = useFloating({
    anchorRef: positionRef,
    floatingRef: panelRef,
    side,
    align,
    offset: sideOffset,
  });

  const effectiveMotion = reduced ? "fade" : motionMode;
  const hidden = getHiddenMotion(resolvedSide, effectiveMotion, reduced);
  const shown =
    effectiveMotion === "fade"
      ? { opacity: 1 }
      : effectiveMotion === "slide"
        ? { opacity: 1, x: 0, y: 0 }
        : { opacity: 1, scale: 1, x: 0, y: 0 };
  const duration =
    effectiveMotion === "slide" ? durations.slow : 0.16;
  const origin = getTransformOrigin(resolvedSide, align);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const items = getFocusable(panelRef.current);
    if (!items.length) {
      event.preventDefault();
      close(true);
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      close(true);
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <DismissableLayer
      onDismiss={() => close(true)}
      ignoreRefs={[triggerRef, anchorRef]}
      ref={panelRef}
      style={style}
      className="z-50"
    >
      <FocusScope trapped={false} restoreFocus={false} autoFocus>
        <motion.div
          initial={hidden}
          animate={present ? shown : hidden}
          transition={{ duration, ease: easings.out }}
          style={{ transformOrigin: origin }}
        >
          <div
            id={contentId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            data-slot="popover-content"
            data-state={present ? "open" : "closed"}
            data-side={resolvedSide}
            data-motion={effectiveMotion}
            className={cn(
              "w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
              className,
            )}
            {...props}
            onKeyDown={handleKeyDown}
            onPointerEnter={(event) => {
              onPointerEnter?.(event);
              if (trigger === "hover") cancelTimers();
            }}
            onPointerLeave={(event) => {
              onPointerLeave?.(event);
              if (trigger === "hover") scheduleClose();
            }}
          >
            {children}
          </div>
        </motion.div>
      </FocusScope>
    </DismissableLayer>
  );
}

export function PopoverTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = usePopover();
  return (
    <h2
      id={titleId}
      data-slot="popover-title"
      className={cn("font-display text-sm font-semibold", className)}
      {...props}
    />
  );
}

export function PopoverDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = usePopover();
  return (
    <p
      id={descriptionId}
      data-slot="popover-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function PopoverClose({
  asChild,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { close } = usePopover();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="popover-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) close(true);
      }}
      {...props}
    />
  );
}
