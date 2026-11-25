"use client";

import * as React from "react";
import { QrCode } from "lucide-react";

import { cn } from "../../lib/utils";

/** Version-2 style 25×25 matrix (placeholder pattern). */
const DEFAULT_QR = [
  "1111111010100101101111111",
  "1000001000110000101000001",
  "1011101000101001001011101",
  "1011101010100001101011101",
  "1011101011100011101011101",
  "1000001010101000001000001",
  "1111111010101010101111111",
  "0000000011101101000000000",
  "1000101111100100011111001",
  "1111110000000111100011010",
  "0001101111100001100011100",
  "1111010010111010000110110",
  "1110101000100111011101111",
  "1001000010001001010010010",
  "0000001110111111011111100",
  "0010010111110101110110110",
  "1111111111101101111111100",
  "0000000010000110100010000",
  "1111111010100000101010000",
  "1000001001001010100011111",
  "1011101010110110111111101",
  "1011101000101001011100111",
  "1011101001011110101001010",
  "1000001000010100000111110",
  "1111111010101101001000111",
];

const CELL = 6;
const SUB = 4;
const GRAIN = CELL / SUB;
const PAD = 14; // quiet-zone padding inside the plate
const HEADROOM = 28;
const HOLD = 2.1;
const TRAVEL = 1.75;
const EMPTY = 0.55;
const CYCLE = HOLD + TRAVEL + EMPTY + TRAVEL;
const SPREAD = 0.58;

type Grain = {
  hx: number;
  hy: number;
  cx: number;
  cy: number;
  ex: number;
  ey: number;
  delay: number;
  accent: boolean;
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function buildGrains(qr: string[]): Grain[] {
  const grains: Grain[] = [];
  const last = Math.max(qr.length - 1, 1);
  qr.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "1") continue;
      for (let i = 0; i < SUB * SUB; i++) {
        const hx = PAD + c * CELL + (i % SUB) * GRAIN;
        const hy = PAD + r * CELL + Math.floor(i / SUB) * GRAIN;
        grains.push({
          hx,
          hy,
          cx: hx + (Math.random() - 0.5) * 140,
          cy: Math.max(hy - 24 - Math.random() * 70, -HEADROOM + 6),
          ex: (Math.random() - 0.5) * 18,
          ey: (Math.random() - 0.5) * 8,
          delay: (r / last) * (SPREAD - 0.08) + Math.random() * 0.08,
          accent: Math.random() < 0.14,
        });
      }
    }
  });
  return grains;
}

function parseCssColor(raw: string, fallback: string) {
  const v = raw.trim();
  return v || fallback;
}

export type QrBadgeProps = {
  /** QR modules as rows of `"1"` / `"0"`. */
  matrix?: string[];
  label?: React.ReactNode;
  ariaLabel?: string;
  onClick?: () => void;
  className?: string;
};

/** QR matrix that dissolves into a scan badge and grows back on a loop. */
export function QrBadge({
  matrix = DEFAULT_QR,
  label = "Scan me",
  ariaLabel = "QR code that dissolves into a scan badge and grows back",
  onClick,
  className,
}: QrBadgeProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const badgeRef = React.useRef<HTMLButtonElement>(null);
  const code = matrix.join("\n");

  React.useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const badge = badgeRef.current;
    if (!stage || !canvas || !badge) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const qr = code.split("\n");
    const matrixSize = qr.length * CELL;
    const plate = matrixSize + PAD * 2;
    const grains = buildGrains(qr);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0;
    let H = 0;
    let qx = 0;
    let qy = HEADROOM;
    let bx = 0;
    let by = 0;
    let ink = "#111";
    let accent = "#3b82f6";
    let plateFill = "#fff";
    let plateStroke = "rgba(0,0,0,0.06)";
    let raf = 0;
    let last = 0;
    let clock = 0;
    let progress = 0;
    let visible = false;
    let hovered = false;
    let pulse = 0;

    function readColors() {
      const cs = getComputedStyle(stage!);
      ink = parseCssColor(cs.getPropertyValue("--qr-ink") || cs.color, "#111");
      accent = parseCssColor(
        getComputedStyle(badge!).getPropertyValue("--qr-accent") ||
          cs.getPropertyValue("--primary"),
        "#3b82f6",
      );
      plateFill = parseCssColor(cs.getPropertyValue("--qr-plate") || cs.getPropertyValue("--card"), "#fff");
      plateStroke = parseCssColor(
        cs.getPropertyValue("--qr-plate-stroke") || cs.getPropertyValue("--border"),
        "rgba(0,0,0,0.08)",
      );
    }

    function measure() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage!.clientWidth;
      H = stage!.clientHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      qx = Math.round((W - plate) / 2);
      qy = HEADROOM;
      bx = badge!.offsetLeft + badge!.offsetWidth / 2;
      by = badge!.offsetTop + badge!.offsetHeight / 2;
    }

    function drawPlate(alpha: number) {
      if (alpha <= 0.01) return;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.shadowColor = "rgba(0,0,0,0.12)";
      ctx!.shadowBlur = 28;
      ctx!.shadowOffsetY = 10;
      roundRect(ctx!, qx, qy, plate, plate, 18);
      ctx!.fillStyle = plateFill;
      ctx!.fill();
      ctx!.shadowColor = "transparent";
      ctx!.strokeStyle = plateStroke;
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.restore();
    }

    function drawRestingModules() {
      ctx!.fillStyle = ink;
      for (let r = 0; r < qr.length; r++) {
        const row = qr[r]!;
        for (let c = 0; c < row.length; c++) {
          if (row[c] !== "1") continue;
          const x = qx + PAD + c * CELL;
          const y = qy + PAD + r * CELL;
          // Finder-ish corners stay slightly sharper; data modules get a soft radius.
          const isFinder =
            (r < 7 && c < 7) || (r < 7 && c >= row.length - 7) || (r >= qr.length - 7 && c < 7);
          roundRect(ctx!, x + 0.35, y + 0.35, CELL - 0.7, CELL - 0.7, isFinder ? 1.1 : 1.6);
          ctx!.fill();
        }
      }
    }

    function draw(p: number) {
      ctx!.clearRect(0, 0, W, H);

      // Soft atmosphere so the stage never feels empty.
      ctx!.save();
      ctx!.globalAlpha = 0.1 + (1 - Math.min(p, 1)) * 0.05;
      const atm = ctx!.createRadialGradient(W / 2, H * 0.36, 6, W / 2, H * 0.4, Math.max(W, H) * 0.4);
      atm.addColorStop(0, accent);
      atm.addColorStop(1, "transparent");
      ctx!.fillStyle = atm;
      ctx!.fillRect(0, 0, W, H);
      ctx!.restore();

      const plateAlpha = 1 - ease(clamp(p / 0.35));
      drawPlate(Math.max(plateAlpha, p > 0.92 ? (1 - p) * 8 : 0));

      let near = 0;

      if (p < 0.02) {
        ctx!.globalAlpha = 1;
        drawRestingModules();
      } else {
        // Flying grains — ink then accent highlights with a soft bloom.
        for (let pass = 0; pass < 2; pass++) {
          for (const g of grains) {
            const t = ease(clamp((p - g.delay) / (1 - SPREAD)));
            if (t >= 1) continue;
            if (t === 0) {
              if (pass === 0) continue; // resting drawn as modules
              continue;
            }
            if (g.accent !== (pass === 1)) continue;

            const u = 1 - t;
            const x = u * u * (qx + g.hx) + 2 * u * t * (qx + g.cx) + t * t * (bx + g.ex);
            const y = u * u * (qy + g.hy) + 2 * u * t * (qy + g.cy) + t * t * (by + g.ey);
            const s = t < 0.18 ? GRAIN - (GRAIN - 1.35) * (t / 0.18) : 1.35;
            const fade = t > 0.78 ? (1 - t) * 5 * 0.9 : 0.9;

            ctx!.save();
            ctx!.globalAlpha = fade;
            if (pass === 1) {
              ctx!.shadowColor = accent;
              ctx!.shadowBlur = 6 + t * 10;
            }
            ctx!.fillStyle = pass === 0 ? ink : accent;
            roundRect(ctx!, x, y, s, s, s * 0.35);
            ctx!.fill();
            ctx!.restore();

            if (t > 0.72) near++;
          }
        }

        // Remnants of resting modules fade as travel begins.
        if (p < 0.22) {
          ctx!.save();
          ctx!.globalAlpha = 1 - p / 0.22;
          drawRestingModules();
          ctx!.restore();
        }
      }

      ctx!.globalAlpha = 1;
      const target = Math.min(near / 420, 1);
      pulse += (target - pulse) * 0.18;
      const scale = 1 + pulse * 0.07;
      badge!.style.transform = pulse > 0.012 ? `translate3d(0,0,0) scale(${scale})` : "";
      badge!.style.setProperty("--qr-pulse", String(pulse));
    }

    function progressAt(c: number) {
      if (c < HOLD) return 0;
      if (c < HOLD + TRAVEL) return (c - HOLD) / TRAVEL;
      if (c < HOLD + TRAVEL + EMPTY) return 1;
      return 1 - (c - HOLD - TRAVEL - EMPTY) / TRAVEL;
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (hovered) {
        progress = Math.max(0, progress - dt / (TRAVEL * 0.55));
        clock = 0;
      } else if (clock === 0 && progress > 0) {
        progress = Math.max(0, progress - dt / (TRAVEL * 0.55));
      } else {
        clock = (clock + dt) % CYCLE;
        progress = progressAt(clock);
        if (clock < dt) readColors();
      }
      draw(progress);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || !visible || reduce.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function still() {
      stop();
      progress = 0;
      clock = 0;
      pulse = 0;
      readColors();
      draw(0);
    }

    measure();
    readColors();
    draw(0);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(stage);

    const ro = new ResizeObserver(() => {
      measure();
      draw(progress);
    });
    ro.observe(stage);

    const mo = new MutationObserver(() => {
      readColors();
      draw(progress);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    const onMotion = () => (reduce.matches ? still() : start());
    reduce.addEventListener("change", onMotion);

    const enter = () => {
      hovered = true;
    };
    const leave = () => {
      hovered = false;
    };
    badge.addEventListener("pointerenter", enter);
    badge.addEventListener("pointerleave", leave);
    badge.addEventListener("focusin", enter);
    badge.addEventListener("focusout", leave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      reduce.removeEventListener("change", onMotion);
      badge.removeEventListener("pointerenter", enter);
      badge.removeEventListener("pointerleave", leave);
      badge.removeEventListener("focusin", enter);
      badge.removeEventListener("focusout", leave);
    };
  }, [code]);

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label={ariaLabel}
      data-slot="qr-badge"
      className={cn(
        "relative flex h-[300px] w-[320px] max-w-full flex-col items-center justify-end overflow-hidden rounded-2xl",
        "bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_62%)]",
        "text-foreground [--qr-accent:var(--primary)] [--qr-ink:var(--foreground)] [--qr-plate:var(--card)] [--qr-plate-stroke:var(--border)]",
        className,
      )}
    >
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />

      <button
        ref={badgeRef}
        type="button"
        onClick={onClick}
        className={cn(
          "relative z-10 mb-5 inline-flex h-9 items-center gap-2 rounded-full border border-border/80",
          "bg-card/95 px-3.5 text-sm font-medium text-foreground shadow-[0_8px_28px_-10px_color-mix(in_oklch,var(--foreground)_35%,transparent),0_0_0_1px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
          "backdrop-blur-sm outline-none transition-[box-shadow,background-color] duration-300",
          "hover:border-primary/30 hover:shadow-[0_10px_32px_-8px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
          "will-change-transform",
        )}
        style={{
          boxShadow:
            "0 8px 28px -10px color-mix(in oklch, var(--foreground) 28%, transparent), 0 0 calc(12px + var(--qr-pulse, 0) * 18px) color-mix(in oklch, var(--primary) calc(18% + var(--qr-pulse, 0) * 35%), transparent)",
        }}
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
        >
          <QrCode className="size-3.5" />
        </span>
        <span className="pr-0.5 tracking-tight">{label}</span>
      </button>
    </div>
  );
}
