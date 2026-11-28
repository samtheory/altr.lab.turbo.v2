"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type StickyScrollItem = {
  title: string;
  description: string;
  content?: React.ReactNode;
};

export type StickyScrollProps = {
  items: StickyScrollItem[];
  className?: string;
  panelPosition?: "left" | "right";
};

export function StickyScroll({
  items,
  className,
  panelPosition = "left",
}: StickyScrollProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const sectionRefs = React.useRef<(HTMLElement | null)[]>([]);

  React.useEffect(() => {
    const nodes = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const idx = Number(visible[0].target.getAttribute("data-index"));
        if (!Number.isNaN(idx)) setActive(idx);
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: [0.15, 0.35, 0.55, 0.75] },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items.length]);

  const panel = (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-border bg-card p-6 shadow-xs"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            {String(active + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {items[active]?.title}
          </h3>
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            {items[active]?.description}
          </p>
          {items[active]?.content ? (
            <div className="mt-5 border-t border-border pt-5">{items[active].content}</div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const sections = (
    <div className="flex flex-col gap-16 lg:gap-24">
      {items.map((item, i) => (
        <section
          key={item.title + i}
          ref={(el) => {
            sectionRefs.current[i] = el;
          }}
          data-index={i}
          data-slot="sticky-scroll-section"
          className="min-h-[55vh] scroll-mt-24 lg:min-h-[70vh]"
        >
          <h4 className="text-lg font-semibold text-foreground lg:hidden">{item.title}</h4>
          <p className="mt-2 text-sm text-muted-foreground lg:hidden">{item.description}</p>
          <div
            className={cn(
              "mt-6 flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-6",
              i === active && "border-primary/35 bg-primary/5",
            )}
          >
            {item.content ?? (
              <p className="max-w-sm text-center text-sm text-pretty text-muted-foreground">
                Scroll to sync the sticky panel with each section.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <div
      data-slot="sticky-scroll"
      className={cn("grid w-full gap-10 lg:grid-cols-2 lg:gap-14", className)}
    >
      {panelPosition === "left" ? (
        <>
          {panel}
          {sections}
        </>
      ) : (
        <>
          {sections}
          {panel}
        </>
      )}
    </div>
  );
}