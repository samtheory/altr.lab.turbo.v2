"use client";

import * as React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { FocusScope } from "../../primitives/focus-scope";
import { Portal } from "../../primitives/portal";
import { Presence } from "../../primitives/presence";
import { lockScroll } from "../../primitives/scroll-lock";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  useDialogContext,
  type DialogProps,
} from "./dialog";

export type SheetSide = "left" | "right" | "top" | "bottom";

export type SheetProps = Omit<DialogProps, "alert">;

/** Drawer surface that slides in from a viewport edge. Left / right sheets are the Apolyx sidebar overlay. */
export function Sheet(props: SheetProps) {
  return <Dialog {...props} />;
}

export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;

const layerPosition: Record<SheetSide, string> = {
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
};

const panelSize: Record<SheetSide, string> = {
  left: "h-full w-[min(20rem,85vw)] border-r",
  right: "h-full w-[min(20rem,85vw)] border-l",
  top: "max-h-[85dvh] w-full border-b",
  bottom: "max-h-[85dvh] w-full border-t",
};

const offscreen: Record<SheetSide, { x?: string; y?: string }> = {
  left: { x: "-100%" },
  right: { x: "100%" },
  top: { y: "-100%" },
  bottom: { y: "100%" },
};

export type SheetContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: SheetSide;
  /** Render the built-in close (X) button in the corner. */
  showClose?: boolean;
};

export function SheetContent({
  side = "right",
  showClose = true,
  className,
  children,
  ...props
}: SheetContentProps) {
  const { open, setOpen, titleId, descriptionId, contentId } =
    useDialogContext();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    return lockScroll();
  }, [open]);

  const hidden = reduced ? { opacity: 0 } : { opacity: 1, ...offscreen[side] };
  const shown = { opacity: 1, x: "0%", y: "0%" };

  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <motion.div
            aria-hidden
            data-slot="sheet-overlay"
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: present ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <DismissableLayer
            onDismiss={() => setOpen(false)}
            disableOutsidePointerEvents
            className={cn("fixed z-50 flex", layerPosition[side])}
          >
            <FocusScope>
              <motion.div
                className={cn("flex border-border bg-popover", panelSize[side])}
                initial={hidden}
                animate={present ? shown : hidden}
                transition={
                  reduced
                    ? { duration: 0.12 }
                    : present
                      ? { type: "spring", stiffness: 380, damping: 38, mass: 0.9 }
                      : { duration: 0.18, ease: [0.45, 0, 0.55, 1] }
                }
              >
                <div
                  id={contentId}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  aria-describedby={descriptionId}
                  data-slot="sheet-content"
                  data-side={side}
                  data-state={present ? "open" : "closed"}
                  className={cn(
                    "relative flex w-full flex-col gap-4 overflow-y-auto border-0 bg-popover p-6 text-popover-foreground shadow-lg",
                    className,
                  )}
                  {...props}
                >
                  {children}
                  {showClose ? (
                    <DialogClose
                      aria-label="Close"
                      className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-4" aria-hidden />
                    </DialogClose>
                  ) : null}
                </div>
              </motion.div>
            </FocusScope>
          </DismissableLayer>
        </Portal>
      )}
    </Presence>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
