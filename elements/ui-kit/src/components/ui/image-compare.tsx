"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ImageCompareProps = {
  beforeSrc: string;
  afterSrc: string;
  altBefore?: string;
  altAfter?: string;
  className?: string;
  initial?: number;
};

export function ImageCompare({
  beforeSrc,
  afterSrc,
  altBefore = "Before",
  altAfter = "After",
  className,
  initial = 50,
}: ImageCompareProps) {
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);
  const [pos, setPos] = React.useState(initial);
  const [focus, setFocus] = React.useState(false);

  const setFromClientX = React.useCallback((clientX: number) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      setFromClientX(e.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  function nudge(delta: number) {
    setPos((p) => Math.min(100, Math.max(0, p + delta)));
  }

  return (
    <div
      ref={rootRef}
      data-slot="image-compare"
      className={cn(
        "relative aspect-[16/10] w-full select-none overflow-hidden rounded-xl border border-border bg-muted shadow-xs",
        className,
      )}
    >
      <img
        src={afterSrc}
        alt={altAfter}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        aria-hidden
      >
        <img
          src={beforeSrc}
          alt=""
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-background/90 shadow-[0_0_12px_color-mix(in_oklch,var(--foreground)_25%,transparent)]"
        style={{ left: `${pos}%` }}
        aria-hidden
      />

      <button
        type="button"
        role="slider"
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-orientation="horizontal"
        tabIndex={0}
        className={cn(
          "absolute top-1/2 z-20 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md outline-none transition-shadow",
          focus && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          !reduce && "cursor-ew-resize",
        )}
        style={{ left: `${pos}%` }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            nudge(e.shiftKey ? -10 : -2);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            nudge(e.shiftKey ? 10 : 2);
          }
          if (e.key === "Home") {
            e.preventDefault();
            setPos(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            setPos(100);
          }
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
      >
        <GripVertical className="size-4 text-muted-foreground" aria-hidden />
      </button>

      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
        After
      </span>
    </div>
  );
}