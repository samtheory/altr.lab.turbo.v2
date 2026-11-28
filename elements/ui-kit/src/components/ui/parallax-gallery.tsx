"use client";

import * as React from "react";
import { useScroll, useTransform, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ParallaxGalleryImage = {
  src: string;
  alt: string;
};

export type ParallaxGalleryProps = {
  images: ParallaxGalleryImage[];
  columns?: 2 | 3 | 4;
  className?: string;
};

function distributeColumns(images: ParallaxGalleryImage[], cols: number) {
  const buckets: ParallaxGalleryImage[][] = Array.from({ length: cols }, () => []);
  images.forEach((img, i) => buckets[i % cols].push(img));
  return buckets;
}

function ParallaxColumn({
  images,
  speed,
  containerRef,
}: {
  images: ParallaxGalleryImage[];
  speed: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40 * speed, -40 * speed]);

  return (
    <motion.div
      className="flex flex-col gap-3 sm:gap-4"
      style={reduce ? undefined : { y }}
    >
      {images.map((img, i) => (
        <figure
          key={img.src + i}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
        >
          <img
            src={img.src}
            alt={img.alt}
            className="aspect-[3/4] w-full object-cover"
            loading="lazy"
          />
        </figure>
      ))}
    </motion.div>
  );
}

export function ParallaxGallery({
  images,
  columns = 3,
  className,
}: ParallaxGalleryProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buckets = React.useMemo(
    () => distributeColumns(images, columns),
    [images, columns],
  );
  const speeds = [0.6, 1, 1.35, 0.85];

  return (
    <div
      ref={containerRef}
      data-slot="parallax-gallery"
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {buckets.map((col, i) => (
          <ParallaxColumn
            key={i}
            images={col}
            speed={speeds[i % speeds.length]}
            containerRef={containerRef}
          />
        ))}
      </div>
    </div>
  );
}