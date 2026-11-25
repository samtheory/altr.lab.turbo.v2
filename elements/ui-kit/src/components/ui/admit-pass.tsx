"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type AdmitPassProps = {
  brand?: string;
  logo?: React.ReactNode;
  label?: string;
  title?: string;
  subtitle?: string;
  code?: React.ReactNode;
  interactive?: boolean;
  className?: string;
};

const CUT = "36%";
const CORNER = 20;
const NOTCH = 14;

const hole = (at: string, r: number) =>
  `radial-gradient(circle at ${at}, transparent ${r}px, #000 ${r + 0.5}px)`;
const MASK = [
  hole("0 0", CORNER),
  hole("100% 0", CORNER),
  hole("0 100%", CORNER),
  hole("100% 100%", CORNER),
  hole(`${CUT} 0`, NOTCH),
  hole(`${CUT} 100%`, NOTCH),
].join(", ");

const TICKET_STYLE: React.CSSProperties = {
  maskImage: MASK,
  WebkitMaskImage: MASK,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
  backgroundImage:
    "linear-gradient(105deg, color-mix(in oklab, var(--secondary) 95%, var(--foreground)), color-mix(in oklab, var(--secondary) 91%, var(--foreground)))",
};

const QR = [
  "1111111010100101101111111",
  "1000001000110000101000001",
  "1011101000101001001011101",
  "1011101010100001101011101",
  "1011101011100011101011101",
  "1000001010101000001000001",
  "1111111010101010101111111",
  "0000000011101101000000000",
  "1000101111100100011111001",
  "1111110000000111100011010",
  "0001101111100001100011100",
  "1111010010111010000110110",
  "1110101000100111011101111",
  "1001000010001001010010010",
  "0000001110111111011111100",
  "0010010111110101110110110",
  "1111111111101101111111100",
  "0000000010000110100010000",
  "1111111010100000101010000",
  "1000001001001010100011111",
  "1011101010110110111111101",
  "1011101000101001011100111",
  "1011101001011110101001010",
  "1000001000010100000111110",
  "1111111010101101001000111",
];
const QR_PATH = QR.flatMap((row, y) =>
  [...row].map((bit, x) => (bit === "1" ? `M${x} ${y}h1v1h-1z` : "")),
).join("");

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect x="1" y="1" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="11" y="1" width="8" height="8" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="1" y="11" width="8" height="8" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="11" y="11" width="8" height="8" rx="2" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

/** Ticket-style admit / waitlist pass with optional tilt and glare. */
export function AdmitPass({
  brand = "apolyx",
  logo,
  label = "Admit pass",
  title = "alex@example.com",
  subtitle = "@alexmorgan",
  code,
  interactive = true,
  className,
}: AdmitPassProps) {
  const reduce = useReducedMotion() || !interactive;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.4 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), spring);
  const glareX = useTransform(px, (v) => v * 100);
  const glareY = useTransform(py, (v) => v * 100);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.5), transparent 50%)`;
  const glareOpacity = useSpring(0, spring);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    glareOpacity.set(1);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <div
      data-slot="admit-pass"
      className={cn("w-full max-w-xl p-4 [perspective:1100px]", className)}
    >
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="drop-shadow-lg"
      >
        <article
          aria-label={`${label} for ${title}`}
          style={TICKET_STYLE}
          className="@container relative grid aspect-[3/1] min-h-36 w-full grid-cols-[36%_1fr] overflow-hidden text-foreground"
        >
          <div className="flex items-center justify-center px-[calc(18px+12%)] py-[calc(16px+5%)]">
            {code ?? (
              <svg
                viewBox={`0 0 ${QR.length} ${QR.length}`}
                shapeRendering="crispEdges"
                aria-hidden
                className="h-full w-full"
              >
                <path d={QR_PATH} fill="currentColor" />
              </svg>
            )}
          </div>

          <span
            aria-hidden
            className="absolute inset-y-[calc(14px+8%)] w-0.5 -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,currentColor_0_10px,transparent_10px_18px)] opacity-30"
            style={{ left: CUT }}
          />

          <div className="flex min-w-0 flex-col justify-center gap-0.5 py-3 pr-[10%] pl-[9%]">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold tracking-tight @md:text-base">
              {logo ?? <Mark className="size-4" />}
              {brand}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </p>
            <p className="truncate text-lg font-semibold tracking-tight @md:text-2xl">{title}</p>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          {!reduce ? (
            <motion.span
              aria-hidden
              style={{ backgroundImage: glare, opacity: glareOpacity }}
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
            />
          ) : null}
        </article>
      </motion.div>
    </div>
  );
}
