"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type GlobeCity = { name: string; lat: number; lng: number };

export type GlobeArcsProps = {
  size?: number;
  cities?: GlobeCity[];
  routes?: [string, string][];
  focus?: string;
  speed?: number;
  interactive?: boolean;
  accent?: string;
  label?: string;
  className?: string;
};

const DEFAULT_CITIES: GlobeCity[] = [
  { name: "Frankfurt", lat: 50.11, lng: 8.68 },
  { name: "Dubai", lat: 25.2, lng: 55.27 },
  { name: "Singapore", lat: 1.35, lng: 103.82 },
  { name: "Johannesburg", lat: -26.2, lng: 28.05 },
  { name: "Mumbai", lat: 19.08, lng: 72.88 },
  { name: "Nairobi", lat: -1.29, lng: 36.82 },
  { name: "New York", lat: 40.71, lng: -74.01 },
  { name: "San Francisco", lat: 37.77, lng: -122.42 },
];

const DEFAULT_ROUTES: [string, string][] = [
  ["Frankfurt", "Dubai"],
  ["Dubai", "Singapore"],
  ["Dubai", "Johannesburg"],
  ["New York", "Frankfurt"],
  ["San Francisco", "Singapore"],
];

const RAD = Math.PI / 180;
type Vec = [number, number, number];

function resolveToken(el: HTMLElement, token: string, fallback: string) {
  if (!token.startsWith("var(")) return token;
  const name = token.slice(4, -1).trim();
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (raw) return raw;
  if (name === "--primary") return fallback;
  return getComputedStyle(el).getPropertyValue("--primary").trim() || fallback;
}

const toVec = (lat: number, lng: number): Vec => [
  Math.cos(lat * RAD) * Math.sin(lng * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lng * RAD),
];

function sphereDots(): Vec[] {
  const dots: Vec[] = [];
  const step = 8;
  for (let lat = -80; lat <= 80; lat += step) {
    const count = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / step));
    for (let j = 0; j < count; j++) {
      const lng = -180 + (j + 0.5) * (360 / count);
      dots.push(toVec(lat, lng));
    }
  }
  return dots;
}

function arcPoints(a: Vec, b: Vec, samples = 48): Vec[] {
  const dot = Math.max(-1, Math.min(1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!));
  const omega = Math.acos(dot);
  const lift = 0.08 + 0.2 * (omega / Math.PI);
  const sin = Math.sin(omega) || 1;
  const out: Vec[] = [];
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const ka = Math.sin((1 - s) * omega) / sin;
    const kb = Math.sin(s * omega) / sin;
    const h = 1 + lift * Math.sin(Math.PI * s);
    out.push([
      (a[0]! * ka + b[0]! * kb) * h,
      (a[1]! * ka + b[1]! * kb) * h,
      (a[2]! * ka + b[2]! * kb) * h,
    ]);
  }
  return out;
}

/** Dotted globe with animated arcs between cities; drag to rotate. */
export function GlobeArcs({
  size = 420,
  cities = DEFAULT_CITIES,
  routes = DEFAULT_ROUTES,
  focus = "Dubai",
  speed = 4,
  interactive = true,
  accent = "var(--primary)",
  label = "Globe with animated routes between cities",
  className,
}: GlobeArcsProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    const wrapEl = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrapEl || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = sphereDots();
    const byName = new Map(cities.map((c, i) => [c.name, i]));
    const points = cities.map((c) => toVec(c.lat, c.lng));
    const arcs = routes
      .map(([from, to]) => [byName.get(from), byName.get(to)] as const)
      .filter((r): r is readonly [number, number] => r[0] !== undefined && r[1] !== undefined)
      .map(([a, b]) => ({ pts: arcPoints(points[a]!, points[b]!) }));

    const start = cities[byName.get(focus) ?? 0];
    let yaw = start ? -start.lng * RAD : 0;
    let pitch = start ? Math.max(-1.1, Math.min(1.1, start.lat * RAD * 0.55)) : 0;
    let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
    let width = 0;
    let dpr = 1;
    let t0 = performance.now();
    let visible = true;
    let frame = 0;

    const resize = () => {
      width = Math.min(wrapEl.clientWidth || size, size);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = width * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const q: Vec = [0, 0, 0];
    const project = (p: Vec) => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const x1 = p[0]! * cy + p[2]! * sy;
      const z1 = -p[0]! * sy + p[2]! * cy;
      q[0] = x1;
      q[1] = p[1]! * cp - z1 * sp;
      q[2] = p[1]! * sp + z1 * cp;
      return q;
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const accentResolved = resolveToken(wrapEl, accent, "#6366f1");
    const mutedDot =
      getComputedStyle(wrapEl).getPropertyValue("--muted-foreground").trim() ||
      getComputedStyle(wrapEl).color;

    const draw = (now: number) => {
      const R = width * 0.42;
      const c = width / 2;
      const elapsed = (now - t0) / 1000;
      if (!reduce.matches && !drag && speed) yaw += (speed * RAD * 0.016) % (Math.PI * 2);

      ctx.clearRect(0, 0, width, width);
      const dotColor = mutedDot;
      ctx.fillStyle = dotColor;
      for (const p of dots) {
        const v = project(p);
        if (v[2]! < 0) continue;
        const x = c + v[0]! * R;
        const y = c - v[1]! * R;
        const a = 0.15 + 0.55 * ((v[2]! + 1) / 2);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, width / 380), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = accentResolved;
      ctx.lineWidth = Math.max(1.2, width / 280);
      ctx.lineCap = "round";
      arcs.forEach((arc, i) => {
        const phase = (elapsed / 4.2 + i * 0.22) % 1;
        const drawIn = phase < 0.45 ? phase / 0.45 : phase < 0.7 ? 1 : 1 - (phase - 0.7) / 0.3;
        const end = Math.max(2, Math.floor(drawIn * arc.pts.length));
        ctx.beginPath();
        let started = false;
        for (let j = 0; j < end; j++) {
          const v = project(arc.pts[j]!);
          if (v[2]! < -0.05) {
            started = false;
            continue;
          }
          const x = c + v[0]! * R;
          const y = c - v[1]! * R;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.35 + 0.55 * drawIn;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      for (const city of cities) {
        const v = project(toVec(city.lat, city.lng));
        if (v[2]! < 0.05) continue;
        const x = c + v[0]! * R;
        const y = c - v[1]! * R;
        ctx.fillStyle = accentResolved;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2.5, width / 140), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dotColor;
        ctx.font = `${Math.max(10, width / 36)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(city.name, x, y - 10);
      }
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      frame = requestAnimationFrame(loop);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      drag = { x: e.clientX, y: e.clientY, yaw, pitch };
      setDragging(true);
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.005;
      pitch = Math.max(-1.1, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.004));
    };
    const onPointerUp = () => {
      drag = null;
      setDragging(false);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    io.observe(wrapEl);
    const ro = new ResizeObserver(resize);
    ro.observe(wrapEl);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [size, cities, routes, focus, speed, interactive, accent]);

  return (
    <div
      ref={wrapRef}
      data-slot="globe-arcs"
      className={cn(
        "relative mx-auto w-full max-w-[420px] text-muted-foreground select-none",
        dragging ? "cursor-grabbing" : interactive ? "cursor-grab" : "",
        className,
      )}
      style={{ maxWidth: size }}
    >
      <canvas ref={canvasRef} role="img" aria-label={label} className="block w-full" />
    </div>
  );
}
