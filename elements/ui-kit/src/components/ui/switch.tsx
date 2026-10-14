"use client";

import * as React from "react";
import { animate, motion, useMotionValue } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { useComposedRefs } from "../../primitives/compose-refs";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import {
  DRAG_THRESHOLD,
  computeThumb,
  getSwitchGeometry,
  startPointerTrack,
  stepPointerTrack,
  type PointerTrack,
  type SwitchSize,
} from "./switch-physics";

const trackSize: Record<SwitchSize, { fixed: string; height: string }> = {
  sm: { fixed: "h-5 w-9", height: "h-5" },
  md: { fixed: "h-6 w-11", height: "h-6" },
  lg: { fixed: "h-7 w-[3.25rem]", height: "h-7" },
};

const iconSize: Record<SwitchSize, string> = {
  sm: "[&_svg]:size-3",
  md: "[&_svg]:size-3.5",
  lg: "[&_svg]:size-4",
};

/*
 * --switch-tone        checked track fill (and the drag tint target)
 * --switch-tone-hover  checked track on hover
 * --switch-tone-fg     track label text when checked
 */
export const switchTones = {
  primary:
    "[--switch-tone:var(--primary)] [--switch-tone-hover:var(--primary-hover)] [--switch-tone-fg:var(--primary-foreground)]",
  success:
    "[--switch-tone:var(--success)] [--switch-tone-hover:color-mix(in_oklch,var(--success),var(--foreground)_12%)] [--switch-tone-fg:var(--success-foreground)]",
  warning:
    "[--switch-tone:var(--warning)] [--switch-tone-hover:color-mix(in_oklch,var(--warning),var(--foreground)_12%)] [--switch-tone-fg:var(--warning-foreground)]",
  info: "[--switch-tone:var(--info)] [--switch-tone-hover:color-mix(in_oklch,var(--info),var(--foreground)_12%)] [--switch-tone-fg:var(--info-foreground)]",
  destructive:
    "[--switch-tone:var(--destructive)] [--switch-tone-hover:var(--destructive-hover)] [--switch-tone-fg:var(--destructive-foreground)]",
} as const;

export type SwitchTone = keyof typeof switchTones;

/** Spring for the release / click glide: overshoots by under a pixel, no bounce train. */
const GLIDE = { type: "spring", stiffness: 560, damping: 34, mass: 0.6 } as const;
const PRESS = { type: "spring", stiffness: 700, damping: 38 } as const;

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  size?: SwitchSize;
  tone?: SwitchTone;
  /** Icons centred inside the thumb, cross-faded by state. */
  icons?: { checked?: React.ReactNode; unchecked?: React.ReactNode };
  /** Short text inside the track, on the side away from the thumb. The track widens to fit. */
  labels?: { checked?: React.ReactNode; unchecked?: React.ReactNode };
  ref?: React.Ref<HTMLButtonElement>;
};

type DragState = {
  pointerId: number;
  startX: number;
  startPos: number;
  desired: number;
  moved: boolean;
  track: PointerTrack;
};

export function Switch({
  className,
  style,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  name,
  value = "on",
  size = "md",
  tone = "primary",
  icons,
  labels,
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
  const reduced = Boolean(useReducedMotion());
  const [on, setOn] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  const trackRef = React.useRef<HTMLButtonElement>(null);
  const composedRef = useComposedRefs(ref, trackRef);
  const [measuredTravel, setMeasuredTravel] = React.useState<number>();
  const g = getSwitchGeometry(size, labels ? measuredTravel : undefined);

  React.useLayoutEffect(() => {
    const el = trackRef.current;
    if (!labels || !el || typeof ResizeObserver === "undefined") return;
    const thumb = getSwitchGeometry(size).thumb;
    const measure = () => setMeasuredTravel(Math.max(0, el.clientWidth - 4 - thumb));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [labels, size]);

  // Rendered thumb box.
  const left = useMotionValue<number>(on ? g.travel : 0);
  const width = useMotionValue<number>(g.thumb);
  const squash = useMotionValue(1);
  // Inputs while dragging.
  const press = useMotionValue(0);
  const speed = useMotionValue(0);
  // Inputs while gliding to rest.
  const pos = useMotionValue<number>(on ? g.travel : 0);
  const glide = useMotionValue(0);

  const mode = React.useRef<"rest" | "drag" | "settle">("rest");
  const drag = React.useRef<DragState | null>(null);
  const settleTarget = React.useRef(0);
  const suppressClick = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);

  const geo = React.useRef(g);
  geo.current = g;
  const rigid = React.useRef(reduced);
  rigid.current = reduced;

  const layoutDrag = React.useCallback(() => {
    const d = drag.current;
    if (mode.current !== "drag" || !d) return;
    const r = computeThumb({
      desired: d.desired,
      velocity: speed.get(),
      dir: d.track.dir,
      press: press.get(),
      rigid: rigid.current,
      geometry: geo.current,
    });
    left.set(r.left);
    width.set(r.width);
  }, [left, press, speed, width]);

  const layoutSettle = React.useCallback(() => {
    if (mode.current !== "settle") return;
    const { thumb } = geo.current;
    const p = pos.get();
    const to = settleTarget.current;
    // Lead with the stretch, but never past the end being approached.
    const s = Math.min(Math.max(glide.get(), 0), Math.abs(to - p));
    left.set(to < p ? p - s : p);
    width.set(thumb + s);
  }, [glide, left, pos, width]);

  React.useEffect(() => {
    const unsubs = [
      press.on("change", layoutDrag),
      speed.on("change", layoutDrag),
      pos.on("change", layoutSettle),
      glide.on("change", layoutSettle),
      left.on("change", (l) => {
        const t = geo.current.travel;
        const p = t > 0 ? Math.min(Math.max(l / t, 0), 1) : 0;
        trackRef.current?.style.setProperty("--switch-progress", p.toFixed(3));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [glide, layoutDrag, layoutSettle, left, pos, press, speed]);

  const settle = React.useCallback(
    (target: boolean, glideTo: boolean) => {
      const { thumb, travel, pressStretch } = geo.current;
      const to = target ? travel : 0;
      press.jump(0);
      speed.jump(0);

      if (!glideTo) {
        mode.current = "rest";
        pos.jump(to);
        left.jump(to);
        width.jump(thumb);
        return;
      }
      if (rigid.current) {
        mode.current = "rest";
        width.jump(thumb);
        animate(left, to, { duration: 0.12, ease: "easeOut" });
        return;
      }

      const from = left.get();
      const fromWidth = width.get();
      const lead = Math.max(0, fromWidth - thumb);
      // Recover the unstretched position from the rendered box.
      const start = to < from ? from + lead : from;
      settleTarget.current = to;
      mode.current = "settle";
      pos.jump(Math.min(Math.max(start, 0), travel));
      glide.jump(lead);
      animate(pos, to, GLIDE);
      animate(glide, [lead, Math.max(lead, pressStretch), 0], {
        duration: 0.28,
        times: [0, 0.35, 1],
        ease: "easeOut",
      }).then(() => {
        if (mode.current !== "settle") return;
        mode.current = "rest";
        animate(squash, [1, 1 - 1.5 / thumb, 1], { duration: 0.18, ease: "easeOut" });
      });
    },
    [glide, left, pos, press, speed, squash, width],
  );

  // Glide when the checked state changes; snap when only the geometry changed.
  const prevOn = React.useRef(on);
  React.useEffect(() => {
    if (drag.current) return;
    const changed = prevOn.current !== on;
    prevOn.current = on;
    settle(on, changed);
  }, [on, g.travel, g.thumb, settle]);

  const toggle = () => setOn(!on);

  const labelPad = g.thumb + 8;
  const trackStyle: React.CSSProperties | undefined = labels
    ? {
        paddingLeft: on ? 8 : labelPad,
        paddingRight: on ? labelPad : 8,
        ...style,
      }
    : style;

  return (
    <span className="relative inline-flex">
      <button
        ref={composedRef}
        type="button"
        role="switch"
        id={id}
        data-slot="switch"
        data-size={size}
        data-tone={tone}
        data-state={on ? "checked" : "unchecked"}
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        aria-checked={on}
        disabled={disabled}
        style={trackStyle}
        className={cn(
          "group/switch peer relative inline-flex shrink-0 touch-none select-none items-center rounded-full border border-transparent",
          "transition-[background-color,box-shadow] duration-(--duration-base) ease-(--ease-out)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[state=checked]:bg-(--switch-tone) data-[state=unchecked]:bg-input",
          "hover:data-[state=checked]:bg-(--switch-tone-hover) hover:data-[state=unchecked]:bg-border-strong",
          "data-[dragging]:bg-[color-mix(in_oklch,var(--input),var(--switch-tone)_calc(var(--switch-progress,0)*100%))]! data-[dragging]:transition-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          switchTones[tone],
          labels ? trackSize[size].height : trackSize[size].fixed,
          className,
        )}
        onPointerDown={(e) => {
          onPointerDown?.(e);
          if (e.defaultPrevented || disabled || e.button !== 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const startPos = on ? g.travel : 0;
          pos.stop();
          glide.stop();
          drag.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startPos,
            desired: startPos,
            moved: false,
            track: startPointerTrack(e.clientX, e.timeStamp, on ? -1 : 1),
          };
          mode.current = "drag";
          press.jump(0);
          speed.jump(0);
          layoutDrag();
          if (!reduced) animate(press, 1, PRESS);
        }}
        onPointerMove={(e) => {
          onPointerMove?.(e);
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return;
          const dx = e.clientX - d.startX;
          if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD) {
            d.moved = true;
            setDragging(true);
          }
          d.track = stepPointerTrack(d.track, e.clientX, e.timeStamp, speed.get());
          d.desired = d.startPos + dx;
          speed.jump(d.track.velocity);
          layoutDrag();
          if (!reduced) animate(speed, 0, { duration: 0.15, delay: 0.05, ease: "easeOut" });
        }}
        onPointerUp={(e) => {
          onPointerUp?.(e);
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return;
          drag.current = null;
          setDragging(false);
          if (!d.moved) {
            settle(on, true);
            return;
          }
          const next = d.desired > g.travel / 2;
          suppressClick.current = true;
          if (next !== on) setOn(next);
          else settle(on, true);
        }}
        onPointerCancel={(e) => {
          onPointerCancel?.(e);
          drag.current = null;
          setDragging(false);
          settle(on, true);
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
        {labels ? (
          <span
            aria-hidden
            data-slot="switch-labels"
            className="pointer-events-none grid text-[10px] font-semibold uppercase leading-none tracking-wide"
          >
            <span
              className={cn(
                "col-start-1 row-start-1 text-center text-(--switch-tone-fg) transition-opacity duration-(--duration-fast)",
                on ? "opacity-100" : "opacity-0",
              )}
            >
              {labels.checked}
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 text-center text-muted-foreground transition-opacity duration-(--duration-fast)",
                on ? "opacity-0" : "opacity-100",
              )}
            >
              {labels.unchecked}
            </span>
          </span>
        ) : null}
        <motion.span
          aria-hidden
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-background shadow-[0_1px_3px_oklch(0_0_0/0.25)]",
            iconSize[size],
          )}
          style={{
            x: left,
            width,
            height: g.thumb,
            scaleX: squash,
            originX: on ? 1 : 0,
          }}
        >
          {icons ? (
            <>
              <SwitchIcon active={on} className="text-(--switch-tone)">
                {icons.checked}
              </SwitchIcon>
              <SwitchIcon active={!on} className="text-muted-foreground">
                {icons.unchecked}
              </SwitchIcon>
            </>
          ) : null}
        </motion.span>
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

function SwitchIcon({
  active,
  className,
  children,
}: {
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (children == null) return null;
  return (
    <span
      data-slot="switch-icon"
      data-active={active ? "" : undefined}
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-[opacity,scale] duration-120 ease-(--ease-out) motion-reduce:transition-none",
        active ? "scale-100 opacity-100" : "scale-75 opacity-0",
        className,
      )}
    >
      {children}
    </span>
  );
}
