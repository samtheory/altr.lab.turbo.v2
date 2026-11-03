"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import type { ChartSeriesColor } from "./types";
import { useResizeObserver } from "./use-resize-observer";

export type TimeSeriesSeries = {
  key: string;
  label: string;
  color: ChartSeriesColor;
  /** Secondary encoding so identity never depends on colour alone. */
  dashed?: boolean;
  marker?: "circle" | "square" | "diamond";
};

export type TimeSeriesPoint = { t: number } & Record<string, number>;

export type TimeSeriesChartProps = {
  data: TimeSeriesPoint[];
  series: TimeSeriesSeries[];
  "aria-label": string;
  /** One-sentence text summary shown under the chart and used as the figure description. */
  summary: string;
  xLabel: string;
  yLabel: string;
  formatX: (t: number) => string;
  formatY?: (v: number) => string;
  height?: number;
  className?: string;
};

const M = { top: 12, right: 16, bottom: 44, left: 52 };

/** Nice round y ticks from 0..max (1/2/5 steps). */
export function niceTicks(max: number, count = 4): number[] {
  const top = Math.max(1, max);
  const raw = top / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = 0; v <= top + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function Marker({ kind, x, y, color }: { kind: string; x: number; y: number; color: string }) {
  const common = { fill: color, stroke: "var(--card)", strokeWidth: 2 };
  if (kind === "square") return <rect x={x - 4} y={y - 4} width={8} height={8} {...common} />;
  if (kind === "diamond")
    return (
      <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} {...common} />
    );
  return <circle cx={x} cy={y} r={4} {...common} />;
}

/**
 * Multi-series line chart over uniformly spaced time buckets. SVG only, no animation (so
 * prefers-reduced-motion is satisfied by construction). Keyboard: focus the plot, Left/Right/Home/End
 * move the active point, the value readout is announced via a live region. A data-table toggle gives
 * the same numbers as text.
 */
export function TimeSeriesChart({
  data,
  series,
  summary,
  xLabel,
  yLabel,
  formatX,
  formatY = (v) => String(v),
  height = 220,
  className,
  "aria-label": ariaLabel,
}: TimeSeriesChartProps) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  const id = React.useId();

  const w = width || 320;
  const innerW = Math.max(0, w - M.left - M.right);
  const innerH = Math.max(0, height - M.top - M.bottom);
  const yMax = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0))));
  const ticks = niceTicks(yMax);
  const yTop = ticks[ticks.length - 1] ?? 1;
  const n = data.length;
  const px = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const py = (v: number) => innerH - (v / yTop) * innerH;
  const xTickIdx = React.useMemo(() => {
    if (n === 0) return [] as number[];
    const target = Math.max(2, Math.min(6, Math.floor(innerW / 90)));
    const idx = new Set<number>();
    for (let k = 0; k < target; k += 1) idx.add(Math.round((k / (target - 1)) * (n - 1)));
    return [...idx];
  }, [n, innerW]);

  const activeRow = active != null ? data[active] : undefined;
  const readout = activeRow
    ? `${formatX(activeRow.t)}: ${series
        .map((s) => `${s.label} ${formatY(Number(activeRow[s.key] ?? 0))}`)
        .join(", ")}`
    : "";

  function onKeyDown(e: React.KeyboardEvent) {
    if (n === 0) return;
    if (e.key === "ArrowRight") setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? n) - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (n === 0 || innerW === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    setActive(n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((x / innerW) * (n - 1)))));
  }

  const colorOf = (s: TimeSeriesSeries) => `var(--${s.color})`;

  return (
    <figure
      data-slot="time-series-chart"
      aria-label={ariaLabel}
      aria-describedby={`${id}-summary`}
      className={cn("w-full text-foreground", className)}
    >
      <div ref={ref} className="relative">
        {showTable ? (
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-xs tabular-nums">
              <caption className="sr-only">{ariaLabel}</caption>
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th scope="col" className="px-2 py-1 font-medium">
                    {xLabel}
                  </th>
                  {series.map((s) => (
                    <th key={s.key} scope="col" className="px-2 py-1 font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.t} className="border-t border-border">
                    <th scope="row" className="px-2 py-1 font-normal">
                      {formatX(d.t)}
                    </th>
                    {series.map((s) => (
                      <td key={s.key} className="px-2 py-1">
                        {formatY(Number(d[s.key] ?? 0))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div
              tabIndex={0}
              role="group"
              aria-label={`${ariaLabel}. Use arrow keys to inspect points.`}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg width={w} height={height} aria-hidden>
                <g transform={`translate(${M.left},${M.top})`}>
                  {ticks.map((t) => (
                    <g key={t}>
                      <line x1={0} x2={innerW} y1={py(t)} y2={py(t)} stroke="var(--chart-grid)" />
                      <text
                        x={-8}
                        y={py(t)}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="fill-[var(--chart-axis)] text-[10px] tabular-nums"
                      >
                        {formatY(t)}
                      </text>
                    </g>
                  ))}
                  {xTickIdx.map((i) => (
                    <text
                      key={i}
                      x={px(i)}
                      y={innerH + 16}
                      textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                      className="fill-[var(--chart-axis)] text-[10px]"
                    >
                      {formatX(data[i]!.t)}
                    </text>
                  ))}
                  <text
                    x={innerW / 2}
                    y={innerH + 36}
                    textAnchor="middle"
                    className="fill-[var(--chart-axis)] text-[10px]"
                  >
                    {xLabel}
                  </text>
                  <text
                    transform={`translate(${-M.left + 10},${innerH / 2}) rotate(-90)`}
                    textAnchor="middle"
                    className="fill-[var(--chart-axis)] text-[10px]"
                  >
                    {yLabel}
                  </text>
                  {series.map((s) => (
                    <polyline
                      key={s.key}
                      fill="none"
                      stroke={colorOf(s)}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeDasharray={s.dashed ? "6 4" : undefined}
                      points={data.map((d, i) => `${px(i)},${py(Number(d[s.key] ?? 0))}`).join(" ")}
                    />
                  ))}
                  {activeRow && active != null ? (
                    <>
                      <line
                        x1={px(active)}
                        x2={px(active)}
                        y1={0}
                        y2={innerH}
                        stroke="var(--chart-axis)"
                        strokeDasharray="2 3"
                      />
                      {series.map((s) => (
                        <Marker
                          key={s.key}
                          kind={s.marker ?? "circle"}
                          x={px(active)}
                          y={py(Number(activeRow[s.key] ?? 0))}
                          color={colorOf(s)}
                        />
                      ))}
                    </>
                  ) : null}
                  <rect
                    x={0}
                    y={0}
                    width={innerW}
                    height={innerH}
                    fill="transparent"
                    onPointerMove={onPointerMove}
                    onPointerLeave={() => setActive(null)}
                  />
                </g>
              </svg>
            </div>
            <ChartTooltip
              visible={activeRow != null}
              x={M.left + (active != null ? px(active) : 0)}
              y={M.top + 4}
              label={activeRow ? formatX(activeRow.t) : undefined}
              values={series.map((s) => ({
                key: s.key,
                label: s.label,
                value: activeRow ? formatY(Number(activeRow[s.key] ?? 0)) : "",
              }))}
            />
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <svg width={22} height={10} aria-hidden>
                <line
                  x1={0}
                  x2={22}
                  y1={5}
                  y2={5}
                  stroke={colorOf(s)}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "5 3" : undefined}
                />
                <Marker kind={s.marker ?? "circle"} x={11} y={5} color={colorOf(s)} />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showTable ? "Show chart" : "Show data table"}
        </button>
      </div>
      <figcaption id={`${id}-summary`} className="mt-1 text-xs text-muted-foreground">
        {summary}
      </figcaption>
      <span className="sr-only" role="status" aria-live="polite">
        {readout}
      </span>
    </figure>
  );
}
