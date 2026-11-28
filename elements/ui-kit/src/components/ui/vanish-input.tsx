"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Input } from "./input";

export type VanishInputProps = {
  placeholders: string[];
  onSubmit?: (value: string) => void;
  className?: string;
  interval?: number;
  name?: string;
};

type Particle = { id: number; x: number; y: number; dx: number; dy: number };

export function VanishInput({
  placeholders,
  onSubmit,
  className,
  interval = 2600,
  name = "vanish",
}: VanishInputProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState("");
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);
  const [vanishing, setVanishing] = React.useState(false);
  const [particles, setParticles] = React.useState<Particle[]>([]);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (placeholders.length < 2) return;
    const id = window.setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % placeholders.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [interval, placeholders.length]);

  const submit = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (reduce) {
        onSubmit?.(trimmed);
        setValue("");
        return;
      }
      setVanishing(true);
      const rect = wrapRef.current?.getBoundingClientRect();
      const seed = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (rect?.width ?? 200) * 0.5,
        y: (rect?.height ?? 40) * 0.5,
        dx: (Math.random() - 0.5) * 120,
        dy: (Math.random() - 0.5) * 80 - 20,
      }));
      setParticles(seed);
      window.setTimeout(() => {
        onSubmit?.(trimmed);
        setValue("");
        setVanishing(false);
        setParticles([]);
      }, 520);
    },
    [onSubmit, reduce],
  );

  return (
    <form
      data-slot="vanish-input"
      className={cn("relative w-full max-w-md", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <div ref={wrapRef} className="relative">
        <Input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholders[placeholderIndex] ?? ""}
          disabled={vanishing}
          className={cn(vanishing && "opacity-0 transition-opacity duration-300")}
          aria-label={placeholders[placeholderIndex]}
        />
        <AnimatePresence>
          {vanishing && !reduce ? (
            <motion.span
              className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden
            >
              {value.split("").map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  initial={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  animate={{
                    opacity: 0,
                    y: -12 - Math.random() * 16,
                    filter: "blur(4px)",
                  }}
                  transition={{ duration: 0.45, delay: i * 0.02 }}
                  className="inline-block"
                >
                  {ch === " " ? "\u00a0" : ch}
                </motion.span>
              ))}
            </motion.span>
          ) : null}
        </AnimatePresence>
        {particles.length > 0 && !reduce ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute size-1 rounded-full bg-primary/80"
                style={{ left: p.x, top: p.y }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}