"use client";

import * as React from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type SwipeDeckCard = {
  id: string;
  title: string;
  description?: string;
  tone?: string;
  image?: string;
};

export type SwipeDeckProps = {
  cards?: SwipeDeckCard[];
  onSwipe?: (id: string, direction: "left" | "right") => void;
  className?: string;
};

const DEFAULT_CARDS: SwipeDeckCard[] = [
  {
    id: "1",
    title: "North trail",
    description: "Foggy pines and a quiet ridge.",
    tone: "from-info/40 to-primary/30",
  },
  {
    id: "2",
    title: "Harbor dusk",
    description: "Warm lights on still water.",
    tone: "from-warning/40 to-destructive/25",
  },
  {
    id: "3",
    title: "Studio morning",
    description: "Soft sun through the blinds.",
    tone: "from-success/35 to-info/25",
  },
];

/** Draggable card deck — swipe left/right to cycle. */
export function SwipeDeck({ cards = DEFAULT_CARDS, onSwipe, className }: SwipeDeckProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -80, 0, 80, 200], [0.4, 1, 1, 1, 0.4]);

  const visible = cards.slice(index, index + 3);
  const front = visible[0];

  function advance(dir: "left" | "right") {
    if (!front) return;
    onSwipe?.(front.id, dir);
    setIndex((i) => (i + 1) % cards.length);
    x.set(0);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      advance(info.offset.x > 0 ? "right" : "left");
    }
  }

  return (
    <div
      data-slot="swipe-deck"
      className={cn("relative mx-auto h-80 w-full max-w-xs", className)}
    >
      <AnimatePresence>
        {visible
          .map((card, i) => {
            const isFront = i === 0;
            return (
              <motion.article
                key={card.id}
                className={cn(
                  "absolute inset-x-0 top-0 flex h-72 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg",
                  !isFront && "pointer-events-none",
                )}
                style={
                  isFront && !reduce
                    ? { x, rotate, opacity, zIndex: 10 - i }
                    : {
                        zIndex: 10 - i,
                        scale: 1 - i * 0.04,
                        y: i * 10,
                      }
                }
                initial={false}
                drag={isFront && !reduce ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.9}
                onDragEnd={isFront ? onDragEnd : undefined}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { x: x.get() > 0 ? 280 : -280, opacity: 0, transition: { duration: 0.25 } }
                }
              >
                <div
                  className={cn(
                    "h-40 bg-gradient-to-br",
                    card.tone ?? "from-muted to-muted-foreground/20",
                  )}
                  style={
                    card.image
                      ? { backgroundImage: `url(${card.image})`, backgroundSize: "cover" }
                      : undefined
                  }
                />
                <div className="flex flex-1 flex-col gap-1 p-5">
                  <h3 className="text-lg font-semibold tracking-tight">{card.title}</h3>
                  {card.description ? (
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  ) : null}
                  {isFront ? (
                    <p className="mt-auto text-xs text-muted-foreground">
                      {reduce ? "Use buttons below" : "Drag left or right"}
                    </p>
                  ) : null}
                </div>
              </motion.article>
            );
          })
          .reverse()}
      </AnimatePresence>
      {reduce && front ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3">
          <button
            type="button"
            className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium"
            onClick={() => advance("left")}
          >
            Skip
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
            onClick={() => advance("right")}
          >
            Keep
          </button>
        </div>
      ) : null}
    </div>
  );
}
