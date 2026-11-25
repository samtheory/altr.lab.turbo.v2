"use client";

import * as React from "react";
import { cn } from "@altr/apolyx";

type Heading = { id: string; title: string };
type Pt = { x: number; y: number };

const SCROLL_MARKER = 120;
const BOLT_WIDTH = 12;
/** Extra SVG room under the rail for the planted ground stake. */
const GROUND_PAD = 14;
/** SVG Repo Mjölnir path (viewBox 0 0 512 512). */
const THOR_HAMMER_PATH =
  "M266.033 32.42l-85.238 85.238v19.799L285.832 32.42h-19.799zm41.528 3.728L184.523 159.186l168.291 168.29L475.852 204.44 307.56 36.15zm172.02 190.02L374.542 331.205h19.799l85.238-85.238v-19.799zm-239.903 13.627l-9.9 9.9 32.527 32.528 9.9-9.9-32.527-32.528zm-22.627 22.627l-23.528 23.527h47.055l-23.527-23.527zm-41.528 41.527l-27.255 27.256h65.054l27.256-27.256h-65.055zm-45.255 45.256l-27.254 27.254h65.054l27.254-27.254h-65.054zm-27.254 45.254l23.527 23.527 23.527-23.527h-47.054zm-21.729 3.728l-9.898 9.899 32.527 32.527 9.898-9.898-32.527-32.527zm-38.767 18.899l-7.504 22.512 37.388 37.388 22.512-7.504v-12.414L54.93 417.086H42.518z";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [fillHeight, setFillHeight] = React.useState(0);
  const [tipY, setTipY] = React.useState(0);
  const [trackHeight, setTrackHeight] = React.useState(0);
  const [planted, setPlanted] = React.useState(false);

  const listRef = React.useRef<HTMLUListElement>(null);
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const activeIndexRef = React.useRef(0);
  const lockUntilRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const reduceMotion = usePrefersReducedMotion();
  const reactId = React.useId().replace(/:/g, "");
  const gradId = `apolyx-bolt-grad-${reactId}`;
  const glowId = `apolyx-bolt-glow-${reactId}`;

  const measureRail = React.useCallback(
    (index: number) => {
      const list = listRef.current;
      const item = itemRefs.current[index];
      if (!list || !item) return;

      const listHeight = list.offsetHeight;
      const center = item.offsetTop + item.offsetHeight / 2;
      const atEnd = index >= headings.length - 1;

      setTrackHeight(listHeight);
      // Hammer always tracks the active heading center (never below the last item).
      setTipY(center);
      // Charge runs to the ground only on the last heading.
      setFillHeight(atEnd ? listHeight : Math.max(center, item.offsetHeight));
      setPlanted(atEnd);
    },
    [headings.length],
  );

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

    // Lock spy while smooth-scroll animates so the marker doesn't bounce through
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

  const railH = Math.max(trackHeight, 1);
  const svgH = railH + GROUND_PAD;
  const points = React.useMemo(() => lightningPoints(railH), [railH]);
  const boltPath = pointsToPath(points);
  const progress = Math.min(100, Math.max(0, (fillHeight / railH) * 100));
  // Hammer follows the active heading on the bolt — not the charge tip.
  const tip = pointOnPolyline(points, tipY);
  const tipAngle = planted ? 0 : tangentAngleDeg(points, tipY);
  const midX = BOLT_WIDTH / 2;

  if (!headings.length) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        On this page
      </p>
      <div className="relative pb-3 pl-7">
        <svg
          aria-hidden
          width={BOLT_WIDTH}
          height={svgH}
          viewBox={`0 0 ${BOLT_WIDTH} ${svgH}`}
          className="pointer-events-none absolute top-0 left-0 overflow-visible text-border/70"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in oklch, var(--primary) 88%, white)" />
              <stop offset="55%" stopColor="var(--primary)" />
              <stop
                offset="100%"
                stopColor="color-mix(in oklch, var(--accent) 55%, var(--primary))"
              />
            </linearGradient>
            <filter
              id={glowId}
              x="-80%"
              y="-8%"
              width="260%"
              height="116%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="1.25" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={boltPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={boltPath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={`${progress} 100`}
            className={cn(
              !reduceMotion &&
                "transition-[stroke-dasharray] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]",
            )}
            style={reduceMotion ? undefined : { filter: `url(#${glowId})` }}
          />

          {/* Ground stake — bolt plants when the last heading is active. */}
          <g
            className={cn(
              "apolyx-toc-ground",
              planted && "apolyx-toc-ground-planted",
              !reduceMotion && "transition-opacity duration-500 ease-out",
            )}
            opacity={planted ? 1 : 0.35}
          >
            <path
              d={`M ${midX} ${railH} L ${midX} ${railH + 5.5}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.35}
              strokeLinecap="round"
            />
            <path
              d={`M ${midX - 7.5} ${railH + 6.2} Q ${midX} ${railH + 4.2} ${midX + 7.5} ${railH + 6.2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
            <path
              d={`M ${midX - 5} ${railH + 8.4} Q ${midX} ${railH + 7.1} ${midX + 5} ${railH + 8.4}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.9}
              strokeLinecap="round"
              opacity={0.7}
            />
          </g>
        </svg>

        <span
          aria-hidden
          className={cn(
            "apolyx-toc-hammer pointer-events-none absolute z-10 origin-center will-change-transform",
            planted && "apolyx-toc-hammer-planted",
            !reduceMotion &&
              "transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]",
          )}
          style={{
            left: 0,
            top: 0,
            // Pivot on the handle (after flip) so it stays on the bolt; head aims at titles.
            transform: `translate3d(${tip.x}px, ${Math.max(tip.y, 0)}px, 0) rotate(${tipAngle}deg) translate3d(-5px, -10px, 0)`,
          }}
        >
          {/* SVG Repo Mjölnir — flipped so handle rides the lightning, head points at items. */}
          <svg
            viewBox="0 0 512 512"
            width="20"
            height="20"
            aria-hidden
            className="apolyx-toc-hammer-icon"
          >
            {/* Exact-shape halo (~0.5px) that covers the bolt under the glyph. */}
            <path
              d={THOR_HAMMER_PATH}
              className="apolyx-toc-hammer-mask"
            />
            <path
              d={THOR_HAMMER_PATH}
              className="apolyx-toc-hammer-glyph"
            />
          </svg>
        </span>

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

/** Deterministic PRNG so the bolt stays stable for a given rail height. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random zigzag that settles into a quiet near-straight finish.
 * Amplitude + segment length vary; taper grows stronger toward the end.
 */
function lightningPoints(height: number): Pt[] {
  const mid = BOLT_WIDTH / 2;
  const h = Math.max(height, 1);
  const rand = mulberry32((Math.round(h * 97) ^ 0xa91c) >>> 0);
  const pts: Pt[] = [{ x: mid, y: 0 }];

  let y = 0;
  let dir = 1;
  while (y < h - 0.75) {
    const t = y / h;
    // Ease-out taper: wild near the top, calm near the bottom.
    const taper = Math.pow(1 - t, 1.55);
    const amp = (1.6 + rand() * 3.2) * taper;
    const seg = 10 + rand() * 18;
    const next = Math.min(y + seg, h);
    const kinkT = 0.28 + rand() * 0.42;
    const kinkY = y + (next - y) * kinkT;

    if (amp < 0.55) {
      pts.push({ x: mid + dir * amp * 0.35, y: kinkY });
      pts.push({ x: mid, y: next });
    } else {
      pts.push({ x: mid + dir * amp, y: kinkY });
      pts.push({ x: mid - dir * amp * (0.3 + rand() * 0.45), y: next });
    }

    y = next;
    dir *= -1;
  }

  pts.push({ x: mid, y: h });
  return pts;
}

function pointsToPath(pts: Pt[]): string {
  if (!pts.length) return "";
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

function pointOnPolyline(pts: Pt[], y: number): Pt {
  const seg = segmentAtY(pts, y);
  if (!seg) return { x: BOLT_WIDTH / 2, y: 0 };
  const { a, b, t, target } = seg;
  return { x: a.x + (b.x - a.x) * t, y: target };
}

/** Path tilt in degrees; clamped so the hammer head still faces the titles. */
function tangentAngleDeg(pts: Pt[], y: number): number {
  const seg = segmentAtY(pts, y);
  if (!seg) return 0;
  const { a, b } = seg;
  const rad = Math.atan2(b.y - a.y, b.x - a.x);
  // Local art has the handle along +Y; subtract 90° so 0° = upright.
  const deg = (rad * 180) / Math.PI - 90;
  return Math.max(-30, Math.min(30, deg));
}

function segmentAtY(
  pts: Pt[],
  y: number,
): { a: Pt; b: Pt; t: number; target: number } | null {
  if (!pts.length) return null;
  const target = Math.min(Math.max(y, 0), pts[pts.length - 1]!.y);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (target < a.y) return { a, b, t: 0, target: a.y };
    if (target <= b.y) {
      const span = Math.max(b.y - a.y, 1e-6);
      return { a, b, t: (target - a.y) / span, target };
    }
  }

  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2] ?? last;
  return { a: prev, b: last, t: 1, target: last.y };
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
