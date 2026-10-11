"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { DismissableLayer } from "../../primitives/dismissable-layer";
import { FocusScope } from "../../primitives/focus-scope";
import { Portal } from "../../primitives/portal";
import { Presence } from "../../primitives/presence";
import { lockScroll } from "../../primitives/scroll-lock";
import { Slot } from "../../primitives/slot";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  contentId: string;
  alert: boolean;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog parts must be used within Dialog");
  return ctx;
}

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Alert dialogs ignore outside clicks; Escape still closes. */
  alert?: boolean;
  children: React.ReactNode;
};

export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  alert = false,
  children,
}: DialogProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();

  return (
    <DialogContext.Provider
      value={{
        open: isOpen,
        setOpen,
        titleId,
        descriptionId,
        contentId,
        alert,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function DialogTrigger({ asChild, onClick, ...props }: TriggerProps) {
  const { open, setOpen, contentId } = useDialog();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="dialog-trigger"
      data-state={open ? "open" : "closed"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, titleId, descriptionId, contentId, alert } =
    useDialog();
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    return lockScroll();
  }, [open]);

  const hidden = reduced
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96, y: 8 };

  return (
    <Presence present={open}>
      {({ present }) => (
        <Portal>
          <motion.div
            aria-hidden
            data-slot="dialog-overlay"
            className="fixed inset-0 z-50 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: present ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <DismissableLayer
              onDismiss={() => setOpen(false)}
              disableOutsideDismiss={alert}
              disableOutsidePointerEvents
              className="w-full max-w-lg"
            >
              <FocusScope>
                <motion.div
                  initial={hidden}
                  animate={present ? { opacity: 1, scale: 1, y: 0 } : hidden}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    id={contentId}
                    role={alert ? "alertdialog" : "dialog"}
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                    data-slot="dialog-content"
                    data-state={present ? "open" : "closed"}
                    className={cn(
                      "w-full rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg",
                      className,
                    )}
                    {...props}
                  >
                    {children}
                  </div>
                </motion.div>
              </FocusScope>
            </DismissableLayer>
          </div>
        </Portal>
      )}
    </Presence>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("mb-4 flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialog();
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn("font-display text-lg font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialog();
  return (
    <p
      id={descriptionId}
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

export function DialogClose({ asChild, onClick, ...props }: TriggerProps) {
  const { setOpen } = useDialog();
  const Comp = (asChild ? Slot : "button") as React.ElementType;
  return (
    <Comp
      type={asChild ? undefined : "button"}
      data-slot="dialog-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
      {...props}
    />
  );
}

export function AlertDialog(props: Omit<DialogProps, "alert">) {
  return <Dialog {...props} alert />;
}

export const AlertDialogTrigger = DialogTrigger;
export const AlertDialogContent = DialogContent;
export const AlertDialogHeader = DialogHeader;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogAction = DialogClose;
export const AlertDialogCancel = DialogClose;
