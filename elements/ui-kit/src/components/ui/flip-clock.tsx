"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type FlipClockProps = {
  targetDate?: string | number;
  labels?: { minutes?: string; seconds?: string };
  className?: string;
};

const FACE =
  "font-mono text-[clamp(2rem,8vw,3.35rem)] leading-none font-bold tabular-nums text-foreground";

function Half({
  value,
  lower = false,
  className = "",
}: {
  value: string;
  lower?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden",
        lower
          ? "top-1/2 rounded-b-md bg-gradient-to-b from-muted to-muted/80"
          : "top-0 rounded-t-md bg-gradient-to-b from-card to-muted",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 grid h-[200%] place-items-center",
          FACE,
          lower ? "top-[-100%]" : "top-0",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function Flap({ from, to, onDone }: { from: string; to: string; onDone: () => void }) {
  const rotate = useMotionValue(0);
  const frontShade = useTransform(rotate, [0, -90], [0, 0.55]);
  const backShade = useTransform(rotate, [-90, -180], [0.55, 0]);
  const upperShade = useTransform(rotate, [0, -90], [0.5, 0]);
  const lowerShade = useTransform(rotate, [-90, -180], [0, 0.4]);

  React.useEffect(() => {
    const controls = animate(rotate, [0, -180, -162, -180], {
      duration: 0.7,
      times: [0, 0.6, 0.8, 1],
      ease: ["easeIn", "easeOut", "easeIn"],
      onComplete: onDone,
    });
    return () => controls.stop();
  }, [rotate, onDone]);

  return (
    <>
      <motion.span
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/2 rounded-t-md bg-foreground"
        style={{ opacity: upperShade }}
      />
      <motion.span
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-1/2 rounded-b-md bg-foreground"
        style={{ opacity: lowerShade }}
      />
      <motion.span
        className="absolute inset-x-0 top-0 z-20 h-1/2 [transform-style:preserve-3d]"
        style={{ rotateX: rotate, transformOrigin: "50% 100%" }}
      >
        <span className="absolute inset-0 [backface-visibility:hidden]">
          <Half value={from} className="!h-full" />
          <motion.span
            className="absolute inset-0 rounded-t-md bg-foreground"
            style={{ opacity: frontShade }}
          />
        </span>
        <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)]">
          <Half value={to} lower className="!top-0 !h-full" />
          <motion.span
            className="absolute inset-0 rounded-b-md bg-foreground"
            style={{ opacity: backShade }}
          />
        </span>
      </motion.span>
    </>
  );
}

function FlipDigit({ value }: { value: string }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = React.useState(value);
  const [flip, setFlip] = React.useState<{ from: string; to: string; key: number } | null>(
    null,
  );
  const handleDone = React.useCallback(() => setFlip(null), []);

  if (shown !== value) {
    setShown(value);
    setFlip(reduceMotion ? null : { from: shown, to: value, key: (flip?.key ?? 0) + 1 });
  }

  return (
    <span
      className="relative block h-[clamp(3.4rem,15vw,5.6rem)] w-[clamp(2.35rem,10vw,3.75rem)] rounded-md border border-border shadow-md [perspective:300px]"
      aria-hidden
    >
      <Half value={value} className="shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
      <Half value={flip ? flip.from : value} lower />
      {flip ? <Flap key={flip.key} from={flip.from} to={flip.to} onDone={handleDone} /> : null}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-px -translate-y-1/2 bg-foreground/40" />
    </span>
  );
}

function TimeUnit({ label, value }: { label: string; value: number }) {
  const digits = String(value).padStart(2, "0");
  return (
    <div className="min-w-0 text-center">
      <div className="mb-3 h-6 truncate text-[clamp(0.7rem,2.8vw,1rem)] font-medium tracking-tight text-muted-foreground">
        {label}
      </div>
      <div className="flex justify-center gap-1 sm:gap-2" aria-hidden>
        {[...digits].map((digit, index) => (
          <FlipDigit key={digits.length - index} value={digit} />
        ))}
      </div>
    </div>
  );
}

/** Split-flap minutes / seconds clock (local time or countdown). */
export function FlipClock({ targetDate, labels, className }: FlipClockProps) {
  const [now, setNow] = React.useState<number | null>(null);
  const targetTime = targetDate === undefined ? null : new Date(targetDate).getTime();

  if (targetTime !== null && !Number.isFinite(targetTime)) {
    throw new RangeError("FlipClock targetDate must be a valid date or timestamp.");
  }

  React.useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  let minutes = 0;
  let seconds = 0;
  if (now !== null) {
    if (targetTime !== null) {
      const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
      minutes = Math.floor(remaining / 60);
      seconds = remaining % 60;
    } else {
      const time = new Date(now);
      minutes = time.getMinutes();
      seconds = time.getSeconds();
    }
  }

  return (
    <div
      role="timer"
      data-slot="flip-clock"
      aria-label={`${minutes} ${labels?.minutes ?? "minutes"}, ${seconds} ${labels?.seconds ?? "seconds"}`}
      className={cn("relative w-full px-3 py-7 sm:px-8 sm:py-9", className)}
    >
      <div className="mx-auto grid max-w-[21rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 sm:gap-x-4">
        <TimeUnit label={labels?.minutes ?? "Minutes"} value={minutes} />
        <span
          className="mt-9 flex h-[clamp(3.4rem,15vw,5.6rem)] items-center font-mono text-[clamp(2rem,8vw,3.25rem)] leading-none text-muted-foreground"
          aria-hidden
        >
          :
        </span>
        <TimeUnit label={labels?.seconds ?? "Seconds"} value={seconds} />
      </div>
    </div>
  );
}
