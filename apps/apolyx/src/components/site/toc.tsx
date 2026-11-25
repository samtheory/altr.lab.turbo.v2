"use client";

import * as React from "react";
import { cn } from "@altr/apolyx";

type Heading = { id: string; title: string };

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = React.useState<string>(headings[0]?.id ?? "");
  const [progress, setProgress] = React.useState(0);
  const reduceMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    if (!headings.length) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 1],
      },
    );

    for (const el of elements) observer.observe(el);

    const onScroll = () => {
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      const start = first.offsetTop - 120;
      const end = last.offsetTop - 120;
      const range = Math.max(end - start, 1);
      const raw = (window.scrollY - start) / range;
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        On this page
      </p>
      <div className="relative pl-4">
        <div
          aria-hidden
          className="absolute top-1 bottom-1 left-0 w-px overflow-hidden rounded-full bg-border"
        >
          <div
            className={cn(
              "apolyx-lightning-fill absolute inset-x-0 top-0 origin-top",
              !reduceMotion && "transition-[height] duration-200 ease-out",
            )}
            style={{ height: `${Math.max(progress * 100, 4)}%` }}
          />
        </div>
        <ul className="space-y-1.5">
          {headings.map((h) => {
            const active = activeId === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    const el = document.getElementById(h.id);
                    if (!el) return;
                    el.scrollIntoView({
                      behavior: reduceMotion ? "auto" : "smooth",
                      block: "start",
                    });
                    setActiveId(h.id);
                    history.replaceState(null, "", `#${h.id}`);
                  }}
                  className={cn(
                    "relative block rounded-md py-1 pl-1 pr-1 text-[13px] leading-snug transition-[color,text-shadow,opacity] duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    active &&
                      !reduceMotion &&
                      "apolyx-toc-active",
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
