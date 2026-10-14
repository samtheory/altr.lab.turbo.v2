"use client";

import * as React from "react";
import { animate, motion, useMotionValue } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";

/**
 * Geometry in px. `travel` is how far the thumb's left edge moves between off and on.
 * `press` is the stretch toward the travel direction on press; `wall` caps the extra
 * squash when the thumb is dragged past the end of the rail.
 */
const geometry = {
  sm: { track: "h-5 w-9", thumb: 16, travel: 14, press: 4, wall: 4 },
  md: { track: "h-6 w-11", thumb: 20, travel: 18, press: 6, wall: 5 },
} as const;

const DRAG_THRESHOLD = 3;

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  size?: keyof typeof geometry;
  ref?: React.Ref<HTMLButtonElement>;
};

export function Switch({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  name,
  value = "on",
  size = "md",
  id: idProp,
  ref,
  onClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: SwitchProps) {
  const id = useId(idProp);
  const reduced = useReducedMotion();
  const g = geometry[size];
  const [on, setOn] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  const left = useMotionValue<number>(on ? g.travel : 0);
  const width = useMotionValue<number>(g.thumb);

  const drag = React.useRef<{
    pointerId: number;
    startX: number;
    startPos: number;
    lastX: number;
    dir: 1 | -1;
    moved: boolean;
  } | null>(null);
  const suppressClick = React.useRef(false);

  const settle = React.useCallback(
    (target: boolean) => {
      const to = target ? g.travel : 0;
      if (reduced) {
        left.set(to);
        width.set(g.thumb);
        return;
      }
      animate(left, to, { type: "spring", stiffness: 520, damping: 20, mass: 0.7 });
      animate(width, g.thumb, {
        type: "spring",
        stiffness: 640,
        damping: 13,
        mass: 0.6,
        delay: 0.05,
      });
    },
    [g.travel, g.thumb, left, reduced, width],
  );

  React.useEffect(() => {
    if (!drag.current) settle(on);
  }, [on, settle]);

  /** Place the thumb for a drag position, stretching toward `dir` and squashing against the rail ends. */
  const place = (desired: number, dir: 1 | -1) => {
    const pos = Math.min(Math.max(desired, 0), g.travel);
    const over = Math.abs(desired - pos);
    const stretch = reduced ? 0 : g.press + Math.min(over * 0.35, g.wall);
    let l: number;
    let r: number;
    if (dir > 0) {
      l = pos;
      r = pos + g.thumb + stretch;
      const max = g.travel + g.thumb;
      if (r > max) {
        r = max;
        l = Math.max(0, r - g.thumb - stretch);
      }
    } else {
      l = pos - stretch;
      r = pos + g.thumb;
      if (l < 0) {
        l = 0;
        r = Math.min(g.travel + g.thumb, g.thumb + stretch);
      }
    }
    left.set(l);
    width.set(r - l);
  };

  const toggle = () => setOn(!on);

  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        data-slot="switch"
        data-size={size}
        data-state={on ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        aria-checked={on}
        disabled={disabled}
        className={cn(
          "peer relative inline-flex shrink-0 touch-none select-none items-center rounded-full border border-transparent",
          "transition-[background-color,box-shadow] duration-(--duration-base) ease-(--ease-out)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          "hover:data-[state=checked]:bg-primary-hover hover:data-[state=unchecked]:bg-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-50",
          g.track,
          className,
        )}
        onPointerDown={(e) => {
          onPointerDown?.(e);
          if (e.defaultPrevented || disabled || e.button !== 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const startPos = on ? g.travel : 0;
          drag.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startPos,
            lastX: e.clientX,
            dir: on ? -1 : 1,
            moved: false,
          };
          place(startPos, on ? -1 : 1);
        }}
        onPointerMove={(e) => {
          onPointerMove?.(e);
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return;
          const dx = e.clientX - d.startX;
          if (Math.abs(dx) > DRAG_THRESHOLD) d.moved = true;
          if (e.clientX !== d.lastX) d.dir = e.clientX > d.lastX ? 1 : -1;
          d.lastX = e.clientX;
          place(d.startPos + dx, d.dir);
        }}
        onPointerUp={(e) => {
          onPointerUp?.(e);
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return;
          drag.current = null;
          if (!d.moved) {
            settle(on);
            return;
          }
          const pos = d.startPos + (e.clientX - d.startX);
          const next = pos > g.travel / 2;
          suppressClick.current = true;
          if (next !== on) setOn(next);
          else settle(on);
        }}
        onPointerCancel={(e) => {
          onPointerCancel?.(e);
          drag.current = null;
          settle(on);
        }}
        onClick={(e) => {
          onClick?.(e);
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (!e.defaultPrevented) toggle();
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
        {...props}
      >
        <motion.span
          aria-hidden
          data-slot="switch-thumb"
          className="pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-background shadow-[0_1px_3px_oklch(0_0_0/0.25)]"
          style={{ x: left, width, height: g.thumb }}
        />
      </button>
      {name ? (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={on}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      ) : null}
    </span>
  );
}
