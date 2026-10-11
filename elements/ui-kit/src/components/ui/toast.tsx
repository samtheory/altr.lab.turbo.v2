"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ToastVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

export type ToastData = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant: ToastVariant;
  duration: number;
};

export type ToastOptions = {
  id?: string;
  description?: React.ReactNode;
  /** Milliseconds; `Infinity` keeps the toast until dismissed. */
  duration?: number;
};

let toasts: ToastData[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function upsert(next: ToastData) {
  const exists = toasts.some((t) => t.id === next.id);
  toasts = exists
    ? toasts.map((t) => (t.id === next.id ? next : t))
    : [...toasts, next];
  emit();
}

function create(variant: ToastVariant) {
  return (title: React.ReactNode, options: ToastOptions = {}) => {
    const id = options.id ?? `apolyx-toast-${++counter}`;
    upsert({
      id,
      title,
      description: options.description,
      variant,
      duration:
        options.duration ?? (variant === "loading" ? Infinity : 4000),
    });
    return id;
  };
}

type PromiseMessages<T> = {
  loading: React.ReactNode;
  success: React.ReactNode | ((value: T) => React.ReactNode);
  error: React.ReactNode | ((error: unknown) => React.ReactNode);
};

export const toast = Object.assign(create("default"), {
  success: create("success"),
  error: create("error"),
  warning: create("warning"),
  info: create("info"),
  loading: create("loading"),
  dismiss(id?: string) {
    toasts = id ? toasts.filter((t) => t.id !== id) : [];
    emit();
  },
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
    const id = create("loading")(messages.loading);
    promise.then(
      (value) =>
        create("success")(
          typeof messages.success === "function"
            ? messages.success(value)
            : messages.success,
          { id },
        ),
      (error: unknown) =>
        create("error")(
          typeof messages.error === "function"
            ? messages.error(error)
            : messages.error,
          { id },
        ),
    );
    return id;
  },
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToasts() {
  return React.useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
}

const icons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="text-success" aria-hidden />,
  error: <AlertCircle className="text-destructive" aria-hidden />,
  warning: <TriangleAlert className="text-warning" aria-hidden />,
  info: <Info className="text-info" aria-hidden />,
  loading: <Loader2 className="animate-spin text-muted-foreground" aria-hidden />,
};

export type ToasterProps = {
  /** Maximum toasts on screen; older ones wait in the queue. */
  max?: number;
  className?: string;
};

export function Toaster({ max = 3, className }: ToasterProps) {
  const all = useToasts();
  const visible = all.slice(-max);
  const [paused, setPaused] = React.useState(false);
  const regionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F8") {
        event.preventDefault();
        regionRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      ref={regionRef}
      aria-label="Notifications (F8)"
      tabIndex={-1}
      data-slot="toaster"
      className={cn(
        "fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col outline-none",
        className,
      )}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <ol className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {visible.map((t) => (
            <ToastItem key={t.id} toast={t} paused={paused} />
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

function ToastItem({ toast: t, paused }: { toast: ToastData; paused: boolean }) {
  const reduced = useReducedMotion();
  const remaining = React.useRef(t.duration);
  const [dragX, setDragX] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    remaining.current = t.duration;
  }, [t.duration, t.variant]);

  React.useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(t.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, t.id, t.variant]);

  const isError = t.variant === "error";

  return (
    <motion.li
      layout={!reduced}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      data-slot="toast"
      data-variant={t.variant}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: dragX }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg [&_svg]:size-4 [&_svg]:shrink-0"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") dragStart.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (dragStart.current !== null) setDragX(Math.max(0, e.clientX - dragStart.current));
      }}
      onPointerUp={() => {
        if (dragStart.current === null) return;
        dragStart.current = null;
        if (dragX > 80) toast.dismiss(t.id);
        else setDragX(0);
      }}
    >
      {icons[t.variant] ? <span className="mt-0.5">{icons[t.variant]}</span> : null}
      <div className="flex-1 space-y-1">
        <p className="font-medium leading-none">{t.title}</p>
        {t.description ? (
          <p className="text-muted-foreground">{t.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => toast.dismiss(t.id)}
      >
        <X aria-hidden />
      </button>
    </motion.li>
  );
}
