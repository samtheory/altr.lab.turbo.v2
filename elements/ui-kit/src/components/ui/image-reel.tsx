"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ImageReelSlide = {
  src: string;
  alt: string;
  caption?: string;
};

export type ImageReelProps = {
  images: ImageReelSlide[];
  className?: string;
  autoHeight?: boolean;
};

export function ImageReel({ images, className, autoHeight }: ImageReelProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const count = images.length;

  const go = React.useCallback(
    (delta: number) => {
      if (!count) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !count) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    }

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [count, go]);

  if (!count) {
    return (
      <div
        data-slot="image-reel"
        className={cn(
          "flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No images</p>
      </div>
    );
  }

  const slide = images[index];

  return (
    <div
      ref={rootRef}
      data-slot="image-reel"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Image reel"
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        autoHeight ? "h-auto" : "aspect-[16/10] sm:aspect-[21/9]",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.figure
          key={slide.src + index}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22 }}
        >
          <img src={slide.src} alt={slide.alt} className="size-full object-cover" />
          {slide.caption ? (
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-4 py-3 text-sm text-foreground">
              {slide.caption}
            </figcaption>
          ) : null}
        </motion.figure>
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Previous image"
        className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        whileTap={reduce ? undefined : { scale: 0.94 }}
        onClick={() => go(-1)}
      >
        <ChevronLeft aria-hidden />
      </motion.button>
      <motion.button
        type="button"
        aria-label="Next image"
        className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        whileTap={reduce ? undefined : { scale: 0.94 }}
        onClick={() => go(1)}
      >
        <ChevronRight aria-hidden />
      </motion.button>

      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {count}: {slide.alt}
      </p>
      <div
        className="absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 text-xs tabular-nums text-muted-foreground backdrop-blur-sm"
        aria-hidden
      >
        {index + 1} / {count}
      </div>
    </div>
  );
}