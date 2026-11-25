"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type BeamEndpoint = { x: number; y: number };

export type BeamLinkProps = {
  from: BeamEndpoint;
  to: BeamEndpoint;
  className?: string;
  curvature?: number;
  width?: number;
  path?: "quad" | "line";
};

export type BeamConnection = {
  from: BeamEndpoint;
  to: BeamEndpoint;
  curvature?: number;
  width?: number;
  path?: "quad" | "line";
};

export type BeamCanvasProps = {
  className?: string;
  children: React.ReactNode;
};

export type BeamNodeProps = {
  x: number;
  y: number;
  className?: string;
  children: React.ReactNode;
};

export type BeamConnectionsProps = {
  links: BeamConnection[];
  className?: string;
  width?: number;
};

function beamPath(
  from: BeamEndpoint,
  to: BeamEndpoint,
  curvature: number,
  path: "quad" | "line",
) {
  if (path === "line") {
    return `M ${from.x * 100} ${from.y * 100} L ${to.x * 100} ${to.y * 100}`;
  }
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - curvature;
  return `M ${from.x * 100} ${from.y * 100} Q ${midX * 100} ${midY * 100} ${to.x * 100} ${to.y * 100}`;
}

/** Relative stage for beam nodes and connectors (normalized 0–1 coordinates). */
export function BeamCanvas({ className, children }: BeamCanvasProps) {
  return (
    <div
      data-slot="beam-canvas"
      className={cn("relative isolate overflow-hidden", className)}
    >
      {children}
    </div>
  );
}

/** Anchor content on the beam canvas. */
export function BeamNode({ x, y, className, children }: BeamNodeProps) {
  return (
    <div
      data-slot="beam-node"
      className={cn("absolute z-[1] -translate-x-1/2 -translate-y-1/2", className)}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      {children}
    </div>
  );
}

/** Draw multiple beams in one SVG layer. */
export function BeamConnections({ links, className, width = 2 }: BeamConnectionsProps) {
  const reduce = useReducedMotion();
  const id = React.useId();
  return (
    <svg
      data-slot="beam-connections"
      className={cn("pointer-events-none absolute inset-0 z-0 h-full w-full", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {links.map((link, i) => {
        const path = beamPath(link.from, link.to, link.curvature ?? 0.22, link.path ?? "quad");
        const strokeW = link.width ?? width;
        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              className="stroke-border"
              strokeWidth={strokeW}
              vectorEffect="non-scaling-stroke"
            />
            {!reduce ? (
              <path
                d={path}
                fill="none"
                stroke={`url(#${id}-${i})`}
                strokeWidth={strokeW * 1.5}
                strokeLinecap="round"
                className="apolyx-beam-pulse"
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ) : null}
            <defs>
              <linearGradient id={`${id}-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </g>
        );
      })}
    </svg>
  );
}

/** SVG animated connector between two normalized (0–1) points. */
export function BeamLink({
  from,
  to,
  className,
  curvature = 0.25,
  width = 2,
  path = "quad",
}: BeamLinkProps) {
  return (
    <BeamConnections
      className={className}
      width={width}
      links={[{ from, to, curvature, width, path }]}
    />
  );
}