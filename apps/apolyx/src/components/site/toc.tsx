"use client";

import * as React from "react";
import { cn } from "@altr/apolyx";

type Heading = { id: string; title: string };

const SCROLL_MARKER = 120;

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dotTop, setDotTop] = React.useState(0);
  const [fillHeight, setFillHeight] = React.useState(0);
  const [trackHeight, setTrackHeight] = React.useState(0);

  const listRef = React.useRef<HTMLUListElement>(null);
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const activeIndexRef = React.useRef(0);
  const lockUntilRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const reduceMotion = usePrefersReducedMotion();

  const measureRail = React.useCallback((index: number) => {
    const list = listRef.current;
    const item = itemRefs.current[index];
    if (!list || !item) return;

    const listHeight = list.offsetHeight;
    const center = item.offsetTop + item.offsetHeight / 2;
    const atEnd = index >= headings.length - 1;
    const fill = atEnd ? listHeight : Math.max(center, item.offsetHeight);

    setTrackHeight(listHeight);
    setDotTop(center);
    setFillHeight(fill);
  }, [headings.length]);

  const resolveIndexFromScroll = React.useCallback(() => {
    if (!headings.length) return 0;

    // Near document bottom → pin to last heading so the rail completes.
    const scrollBottom = window.scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight - scrollBottom < 48) return headings.length - 1;

    let next = 0;
    for (let i = 0; i < headings.length; i++) {
      const el = document.getElementById(headings[i]!.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= SCROLL_MARKER) next = i;
    }
    return next;
  }, [headings]);

  const syncFromScroll = React.useCallback(() => {
    if (Date.now() < lockUntilRef.current) return;

    const next = resolveIndexFromScroll();
    if (next === activeIndexRef.current) {
      measureRail(next);
      return;
    }
    activeIndexRef.current = next;
    setActiveIndex(next);
    measureRail(next);
  }, [measureRail, resolveIndexFromScroll]);

  React.useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  React.useEffect(() => {
    if (!headings.length) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(syncFromScroll);
    };

    const onScrollEnd = () => {
      lockUntilRef.current = 0;
      syncFromScroll();
    };

    // Initial measure after paint so item refs exist.
    const boot = requestAnimationFrame(() => {
      const next = resolveIndexFromScroll();
      activeIndexRef.current = next;
      setActiveIndex(next);
      measureRail(next);
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      cancelAnimationFrame(boot);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [headings, measureRail, resolveIndexFromScroll, syncFromScroll]);

  function goTo(index: number) {
    const heading = headings[index];
    if (!heading) return;
    const el = document.getElementById(heading.id);
    if (!el) return;

    // Lock spy while smooth-scroll animates so the dot doesn't bounce through
    // intermediate headings.
    lockUntilRef.current = Date.now() + (reduceMotion ? 0 : 900);
    activeIndexRef.current = index;
    setActiveIndex(index);
    measureRail(index);
    history.replaceState(null, "", `#${heading.id}`);

    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  if (!headings.length) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        On this page
      </p>
      {/* Gutter keeps the track + full blue dot inside the overflow clip. */}
      <div className="relative pl-4">
        <div
          aria-hidden
          className="absolute top-0 left-[7px] w-px overflow-hidden rounded-full bg-border/80"
          style={{ height: trackHeight || "100%" }}
        >
          <div
            className={cn(
              "apolyx-lightning-fill absolute inset-x-0 top-0 will-change-[height]",
              !reduceMotion && "transition-[height] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]",
            )}
            style={{ height: fillHeight }}
          />
        </div>

        <span
          aria-hidden
          className={cn(
            "apolyx-toc-dot pointer-events-none absolute top-0 left-1 z-10 size-2 will-change-transform",
            !reduceMotion &&
              "transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]",
          )}
          style={{ transform: `translate3d(0, ${Math.max(dotTop - 4, 0)}px, 0)` }}
        />

        <ul ref={listRef} className="space-y-0.5">
          {headings.map((h, index) => {
            const active = index === activeIndex;
            const passed = index < activeIndex;
            return (
              <li
                key={h.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
              >
                <a
                  href={`#${h.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(index);
                  }}
                  className={cn(
                    // Fixed weight avoids layout shifts that wobble the rail.
                    "relative block rounded-md py-1.5 pl-1.5 pr-1 text-[13px] font-medium leading-snug",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !reduceMotion && "transition-colors duration-300 ease-out",
                    active && "text-foreground",
                    passed && !active && "text-foreground/75",
                    !active && !passed && "text-muted-foreground hover:text-foreground",
                    active && !reduceMotion && "apolyx-toc-active",
                  )}
                  aria-current={active ? "location" : undefined}
                >
                  {h.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
