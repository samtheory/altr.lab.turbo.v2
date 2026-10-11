"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { Portal } from "../../primitives/portal";
import { Presence } from "../../primitives/presence";
import type { Align, Side } from "../../primitives/position";
import { Slot } from "../../primitives/slot";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useFloating } from "../../primitives/use-floating";
import { useId } from "../../primitives/use-id";

type ProviderValue = {
  delayDuration: number;
  isWarm: () => boolean;
  markClosed: () => void;
};

const ProviderContext = React.createContext<ProviderValue>({
  delayDuration: 500,
  isWarm: () => false,
  markClosed: () => {},
});

export type TooltipProviderProps = {
  /** Hover delay before the first tooltip opens (ms). */
  delayDuration?: number;
  /** Window after a tooltip closes in which the next one opens instantly (ms). */
  skipDelayDuration?: number;
  children: React.ReactNode;
};

export function TooltipProvider({
  delayDuration = 500,
  skipDelayDuration = 300,
  children,
}: TooltipProviderProps) {
  const lastClosed = React.useRef(0);
  const value = React.useMemo<ProviderValue>(
    () => ({
      delayDuration,
      isWarm: () => Date.now() - lastClosed.current < skipDelayDuration,
      markClosed: () => {
        lastClosed.current = Date.now();
      },
    }),
    [delayDuration, skipDelayDuration],
  );
  return (
    <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>
  );
}

type TooltipContextValue = {
  open: boolean;
  openWithDelay: () => void;
  openNow: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltip() {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip parts must be used within Tooltip");
  return ctx;
}

export type TooltipProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children: React.ReactNode;
};

export function Tooltip({
  open,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
  children,
}: TooltipProps) {
  const provider = React.useContext(ProviderContext);
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const timer = React.useRef<number | undefined>(undefined);
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentId = useId();
  const delay = delayDuration ?? provider.delayDuration;

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const openNow = React.useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(true);
  }, [setOpen]);

  const openWithDelay = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (provider.isWarm()) {
      setOpen(true);
      return;
    }
    timer.current = window.setTimeout(() => setOpen(true), delay);
  }, [provider, delay, setOpen]);

  const close = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (isOpen) provider.markClosed();
    setOpen(false);
  }, [isOpen, provider, setOpen]);

  return (
    <TooltipContext.Provider
      value={{ open: isOpen, openWithDelay, openNow, close, triggerRef, contentId }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  asChild,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, openWithDelay, openNow, close, triggerRef, contentId } =
    useTooltip();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Comp
      ref={triggerRef}
      type={asChild ? undefined : "button"}
      aria-describedby={open ? contentId : undefined}
      data-state={open ? "open" : "closed"}
      data-slot="tooltip-trigger"
      onPointerEnter={(e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerEnter?.(e);
        if (e.pointerType !== "touch") openWithDelay();
      }}
      onPointerLeave={(e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerLeave?.(e);
        close();
      }}
      onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerDown?.(e);
        close();
      }}
      onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
        onFocus?.(e);
        openNow();
      }}
      onBlur={(e: React.FocusEvent<HTMLButtonElement>) => {
        onBlur?.(e);
        close();
      }}
      {...props}
    />
  );
}

export type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
};

export function TooltipContent(props: TooltipContentProps) {
  const { open } = useTooltip();
  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <TooltipPanel present={present} {...props} />
        </Portal>
      )}
    </Presence>
  );
}

function TooltipPanel({
  present,
  side = "top",
  align = "center",
  sideOffset = 6,
  className,
  ...props
}: TooltipContentProps & { present: boolean }) {
  const { close, triggerRef, contentId } = useTooltip();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { style } = useFloating({
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side,
    align,
    offset: sideOffset,
  });
  return (
    <DismissableLayer
      passive
      onDismiss={close}
      ignoreRefs={[triggerRef]}
      ref={panelRef}
      style={style}
      className="z-50"
    >
      <div
        id={contentId}
        role="tooltip"
        data-slot="tooltip-content"
        data-state={present ? "open" : "closed"}
        className={cn(
          "max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md",
          "transition-opacity duration-[var(--duration-fast)] data-[state=closed]:opacity-0",
          className,
        )}
        {...props}
      />
    </DismissableLayer>
  );
}
