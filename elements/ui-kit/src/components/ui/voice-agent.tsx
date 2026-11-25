"use client";

import * as React from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { VoiceOrb } from "./voice-orb";

export type VoiceAgentProps = {
  name?: string;
  subtitle?: string;
  active?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Normalized input level 0–1. */
  level?: number;
  autoPlay?: boolean;
  className?: string;
};

const TICK = 60;
const BAR_COUNT = 12;

/** Voice agent card with orb visualization and mic toggle. */
export function VoiceAgent({
  name = "Voice agent",
  subtitle = "Speak naturally — I will answer when you pause.",
  active: activeProp,
  onActiveChange,
  level: levelProp = 0,
  autoPlay = false,
  className,
}: VoiceAgentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [innerActive, setInnerActive] = React.useState(activeProp ?? false);
  const active = activeProp ?? innerActive;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => t + TICK), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce]);

  const demoLevel = autoPlay && visible && !reduce
    ? 0.25 + (Math.sin(tick / 180) + 1) * 0.25 + (Math.sin(tick / 73) + 1) * 0.1
    : 0.2;

  const level = autoPlay ? (active ? demoLevel : 0.05) : Math.min(1, Math.max(0, levelProp));
  const demoActive = autoPlay && visible && (reduce || Math.sin(tick / 400) > -0.2);
  const showActive = autoPlay ? demoActive : active;

  function toggle() {
    if (autoPlay) return;
    const next = !active;
    if (activeProp === undefined) setInnerActive(next);
    onActiveChange?.(next);
  }

  return (
    <div
      ref={ref}
      data-slot="voice-agent"
      data-active={showActive ? "" : undefined}
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={showActive ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={showActive}
          onClick={toggle}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border border-border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            showActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {showActive ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <VoiceOrb level={showActive ? level : 0.04} size={128} />
        <VoiceBars level={showActive ? level : 0.04} reduce={reduce} />
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground" role="status">
        {showActive ? "Listening…" : "Microphone off"}
      </p>
    </div>
  );
}

function VoiceBars({ level, reduce }: { level: number; reduce: boolean }) {
  const heights = React.useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const phase = (i / BAR_COUNT) * Math.PI * 2;
      const wobble = 0.35 + Math.sin(phase) * 0.2;
      return Math.min(1, level * (0.55 + wobble));
    });
  }, [level]);

  return (
    <div
      data-slot="voice-agent-bars"
      className="flex h-10 items-end justify-center gap-1"
      aria-hidden
    >
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-primary/80"
          animate={{ height: `${8 + h * 28}px`, opacity: 0.35 + h * 0.65 }}
          transition={reduce ? { duration: 0 } : { duration: 0.12 }}
        />
      ))}
    </div>
  );
}