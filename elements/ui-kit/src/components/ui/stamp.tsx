"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";

const stampTone = cva("", {
  variants: {
    variant: {
      sale: "[--stamp:var(--destructive)] [--stamp-fg:var(--destructive-foreground)]",
      success: "[--stamp:var(--success)] [--stamp-fg:var(--success-foreground)]",
      warning: "[--stamp:var(--warning)] [--stamp-fg:var(--warning-foreground)]",
      muted: "[--stamp:var(--muted-foreground)] [--stamp-fg:var(--background)]",
      outline: "[--stamp:var(--foreground)] [--stamp-fg:var(--background)]",
    },
  },
  defaultVariants: {
    variant: "sale",
  },
});

/** Repeat orbit copy so the path stays filled. */
function fillOrbit(text: string, copies = 4) {
  const piece = text.trim();
  if (!piece) return "";
  const unit = `${piece}  ·  `;
  return unit.repeat(copies);
}

function circleOrbitPath(cx: number, cy: number, r: number) {
  return `M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`;
}

/** Rounded square path for orbiting text (clockwise from mid-top). */
function squareOrbitPath(cx: number, cy: number, half: number, radius: number) {
  const l = cx - half;
  const r = cx + half;
  const t = cy - half;
  const b = cy + half;
  const rad = Math.min(radius, half);
  return [
    `M ${cx},${t}`,
    `L ${r - rad},${t}`,
    `A ${rad},${rad} 0 0 1 ${r},${t + rad}`,
    `L ${r},${b - rad}`,
    `A ${rad},${rad} 0 0 1 ${r - rad},${b}`,
    `L ${l + rad},${b}`,
    `A ${rad},${rad} 0 0 1 ${l},${b - rad}`,
    `L ${l},${t + rad}`,
    `A ${rad},${rad} 0 0 1 ${l + rad},${t}`,
    `Z`,
  ].join(" ");
}

export type StampProps = VariantProps<typeof stampTone> & {
  /** Center label. */
  children?: React.ReactNode;
  /** Circle seal or rounded-square seal. */
  shape?: "circle" | "square";
  /**
   * Text that orbits the seal. Pass `null` / `""` / `false` to hide it.
   * Defaults to a promotional loop derived from the label.
   */
  orbit?: string | false | null;
  /** Seconds for one full orbit. */
  duration?: number;
  /** Show a rotating dashed / tick ring (even when orbit text is off). */
  ring?: boolean;
  /** Resting tilt in degrees. */
  rotate?: number;
  className?: string;
  size?: number;
};

const STAMP_FONT =
  '"Arial Narrow", "Roboto Condensed", "Helvetica Neue Condensed", ui-sans-serif, system-ui, sans-serif';

/** Seal stamp with an optional orbiting caption — circle or square. */
export function Stamp({
  children = "Sale",
  shape = "circle",
  variant = "sale",
  orbit,
  duration = 28,
  ring = true,
  rotate = -8,
  size = 192,
  className,
}: StampProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const orbitId = `apolyx-stamp-orbit-${uid}`;
  const label = typeof children === "string" || typeof children === "number" ? String(children) : "Stamp";

  const orbitSource =
    orbit === undefined ? `Save now on ${label}` : orbit === false || orbit == null ? "" : orbit.trim();
  const showOrbit = orbitSource.length > 0;
  const orbitText = showOrbit ? fillOrbit(orbitSource) : "";

  const cx = 100;
  const cy = 100;
  const outerR = 94;
  const orbitR = 75.5;
  const coreR = 57;
  const squareHalf = 78;
  const squareCore = 50;
  const squareOrbitHalf = 68;
  const pathD =
    shape === "circle"
      ? circleOrbitPath(cx, cy, orbitR)
      : squareOrbitPath(cx, cy, squareOrbitHalf, 18);
  const pathLen =
    shape === "circle"
      ? 2 * Math.PI * orbitR
      : 4 * (squareOrbitHalf * 2 - 18) + 2 * Math.PI * 18;

  const spinStyle: React.CSSProperties | undefined = reduce
    ? undefined
    : {
        animation: `apolyx-stamp-orbit ${duration}s linear infinite`,
        transformBox: "view-box",
        transformOrigin: "center",
      };
  const counterSpinStyle: React.CSSProperties | undefined = reduce
    ? undefined
    : {
        animation: `apolyx-stamp-orbit ${duration * 1.35}s linear infinite reverse`,
        transformBox: "view-box",
        transformOrigin: "center",
      };
  const pulseSpinStyle: React.CSSProperties | undefined = reduce
    ? undefined
    : {
        animation: `apolyx-stamp-orbit ${duration * 0.85}s linear infinite`,
        transformBox: "view-box",
        transformOrigin: "center",
      };

  const aria = showOrbit ? `${label}. ${orbitSource}` : label;
  const labelSize = Math.min(33, Math.max(16, 150 / Math.max(label.length, 1)));

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={aria}
      data-slot="stamp"
      data-shape={shape}
      className={cn(stampTone({ variant }), "select-none overflow-visible", className)}
      style={{ rotate: `${rotate}deg` }}
    >
      <defs>
        <path id={orbitId} d={pathD} fill="none" />
      </defs>

      {/* Soft outer halo */}
      {shape === "circle" ? (
        <circle
          cx={cx}
          cy={cy}
          r={outerR + 2}
          fill="none"
          stroke="var(--stamp)"
          strokeOpacity={0.16}
          strokeWidth={7}
        />
      ) : (
        <rect
          x={cx - squareHalf - 4}
          y={cy - squareHalf - 4}
          width={(squareHalf + 4) * 2}
          height={(squareHalf + 4) * 2}
          rx={22}
          fill="none"
          stroke="var(--stamp)"
          strokeOpacity={0.16}
          strokeWidth={7}
        />
      )}

      {/* Animated tick ring + fine dotted companion — motion instead of a flat border */}
      {ring ? (
        <>
          <g style={counterSpinStyle}>
            {shape === "circle" ? (
              <circle
                cx={cx}
                cy={cy}
                r={outerR}
                fill="none"
                stroke="var(--stamp)"
                strokeWidth={2.5}
                strokeDasharray="1.8 6.2"
                strokeLinecap="round"
              />
            ) : (
              <rect
                x={cx - squareHalf}
                y={cy - squareHalf}
                width={squareHalf * 2}
                height={squareHalf * 2}
                rx={20}
                fill="none"
                stroke="var(--stamp)"
                strokeWidth={2.5}
                strokeDasharray="1.8 6.2"
                strokeLinecap="round"
              />
            )}
          </g>
          <g style={pulseSpinStyle}>
            {shape === "circle" ? (
              <circle
                cx={cx}
                cy={cy}
                r={outerR - 5}
                fill="none"
                stroke="var(--stamp)"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="0.8 5.5"
                strokeLinecap="round"
              />
            ) : (
              <rect
                x={cx - squareHalf + 5}
                y={cy - squareHalf + 5}
                width={(squareHalf - 5) * 2}
                height={(squareHalf - 5) * 2}
                rx={16}
                fill="none"
                stroke="var(--stamp)"
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="0.8 5.5"
                strokeLinecap="round"
              />
            )}
          </g>
        </>
      ) : shape === "circle" ? (
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--stamp)" strokeWidth={2.5} />
      ) : (
        <rect
          x={cx - squareHalf}
          y={cy - squareHalf}
          width={squareHalf * 2}
          height={squareHalf * 2}
          rx={20}
          fill="none"
          stroke="var(--stamp)"
          strokeWidth={2.5}
        />
      )}

      {showOrbit ? (
        <g style={spinStyle}>
          <text
            fill="var(--stamp)"
            fontSize={13}
            fontWeight={800}
            letterSpacing={1.1}
            style={{ fontFamily: STAMP_FONT }}
          >
            <textPath
              href={`#${orbitId}`}
              xmlSpace="preserve"
              textLength={pathLen}
              lengthAdjust="spacing"
            >
              {orbitText}
            </textPath>
          </text>
        </g>
      ) : null}

      {/* Solid core */}
      {shape === "circle" ? (
        <circle cx={cx} cy={cy} r={coreR} fill="var(--stamp)" />
      ) : (
        <rect
          x={cx - squareCore}
          y={cy - squareCore}
          width={squareCore * 2}
          height={squareCore * 2}
          rx={14}
          fill="var(--stamp)"
        />
      )}

      {/* Inner hairline for depth */}
      {shape === "circle" ? (
        <circle
          cx={cx}
          cy={cy}
          r={coreR - 5}
          fill="none"
          stroke="var(--stamp-fg)"
          strokeOpacity={0.3}
          strokeWidth={1.25}
        />
      ) : (
        <rect
          x={cx - squareCore + 5}
          y={cy - squareCore + 5}
          width={(squareCore - 5) * 2}
          height={(squareCore - 5) * 2}
          rx={10}
          fill="none"
          stroke="var(--stamp-fg)"
          strokeOpacity={0.3}
          strokeWidth={1.25}
        />
      )}

      <text
        x={cx}
        y={cy + 2}
        fill="var(--stamp-fg)"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={labelSize}
        fontWeight={700}
        letterSpacing={label.length > 6 ? 0.4 : 1.2}
        textLength={Math.min(96, 14 * label.length)}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: STAMP_FONT, textTransform: "uppercase" }}
      >
        {label}
      </text>
    </svg>
  );
}

/** Tone map used by `Stamp` (kept as `stampVariants` for import compatibility). */
export const stampVariants = stampTone;
