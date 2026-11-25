"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ClipVideoTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  /** Video media URL (`mp4` / `webm`). */
  src: string;
  /** Still image for reduced motion and before the video paints. */
  poster?: string;
};

export function ClipVideoText({
  children,
  className,
  as: Tag = "span",
  src,
  poster,
}: ClipVideoTextProps) {
  const reduce = useReducedMotion();
  const maskId = React.useId().replace(/:/g, "");
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const label = typeof children === "string" ? children : undefined;

  React.useLayoutEffect(() => {
    if (reduce) return;
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, className, reduce]);

  if (reduce) {
    return (
      <Tag
        data-slot="clip-video-text"
        className={cn(
          "inline-block font-bold",
          poster && "bg-cover bg-clip-text bg-center text-transparent",
          className,
        )}
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
      >
        {children}
      </Tag>
    );
  }

  const maskLabel = label ?? "Text";
  const fontSize = size.h > 0 ? Math.round(size.h * 0.82) : 48;

  return (
    <Tag
      data-slot="clip-video-text"
      className={cn("relative inline-block", className)}
      aria-label={label}
    >
      <span
        ref={measureRef}
        className="invisible block whitespace-nowrap font-bold leading-none"
        aria-hidden
      >
        {children}
      </span>

      {size.w > 0 ? (
        <span className="absolute inset-0 block">
          <svg className="pointer-events-none absolute size-0 overflow-hidden" aria-hidden>
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={size.w}
                height={size.h}
              >
                <rect width={size.w} height={size.h} fill="black" />
                <text
                  x={size.w / 2}
                  y={size.h / 2}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {maskLabel}
                </text>
              </mask>
            </defs>
          </svg>
          <video
            autoPlay
            loop
            muted
            playsInline
            src={src}
            poster={poster}
            width={size.w}
            height={size.h}
            className="block h-full w-full object-cover"
            style={{
              mask: `url(#${maskId})`,
              WebkitMask: `url(#${maskId})`,
            }}
          />
        </span>
      ) : null}

      {!label ? <span className="sr-only">{children}</span> : null}
    </Tag>
  );
}