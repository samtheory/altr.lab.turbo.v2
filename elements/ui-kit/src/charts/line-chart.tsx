"use client";

import * as React from "react";
import { scaleLinear, scalePoint } from "@visx/scale";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveLinear, curveMonotoneX, curveStep } from "@visx/curve";
import { motion } from "motion/react";

import { useReducedMotion } from "../motion/use-reduced-motion";
import { useChart } from "./chart-container";
import { ChartLegend } from "./chart-legend";
import { ChartTooltip } from "./chart-tooltip";

const curves = {
  linear: curveLinear,
  monotone: curveMonotoneX,
  step: curveStep,
} as const;

export type LineChartProps<T extends Record<string, unknown>> = {
  data: T[];
  x: keyof T & string;
  series: (keyof T & string)[];
  curve?: keyof typeof curves;
  area?: boolean;
};

export function LineChart<T extends Record<string, unknown>>({
  data,
  x,
  series,
  curve = "monotone",
  area = false,
}: LineChartProps<T>) {
  const { width, height, config, hidden } = useChart();
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState<number | null>(null);
  const margin = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const xScale = scalePoint<string>({
    domain: data.map((d) => String(d[x])),
    range: [0, innerW],
    padding: 0.5,
  });

  const visibleSeries = series.filter((s) => !hidden.has(s));
  const yValues = data.flatMap((d) =>
    visibleSeries.map((s) => Number(d[s] ?? 0)),
  );
  const yMax = Math.max(1, ...yValues);
  const yScale = scaleLinear<number>({
    domain: [0, yMax],
    range: [innerH, 0],
    nice: true,
  });

  const activeRow = active != null ? data[active] : null;

  return (
    <div className="relative" tabIndex={0} onKeyDown={(e) => {
      if (e.key === "ArrowRight") {
        setActive((i) => Math.min(data.length - 1, (i ?? -1) + 1));
      } else if (e.key === "ArrowLeft") {
        setActive((i) => Math.max(0, (i ?? data.length) - 1));
      }
    }}>
      <svg width={width || "100%"} height={height} role="img">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yScale.ticks(4).map((t) => (
            <g key={t}>
              <line
                x1={0}
                x2={innerW}
                y1={yScale(t)}
                y2={yScale(t)}
                stroke="var(--chart-grid)"
              />
              <text
                x={-8}
                y={yScale(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[var(--chart-axis)] text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
          {visibleSeries.map((key) => {
            const pathProps = {
              data,
              x: (d: T) => xScale(String(d[x])) ?? 0,
              y: (d: T) => yScale(Number(d[key] ?? 0)),
              curve: curves[curve],
            };
            return (
              <g key={key}>
                {area ? (
                  <AreaClosed
                    {...pathProps}
                    yScale={yScale}
                    fill={`var(--color-${key})`}
                    fillOpacity={0.15}
                  />
                ) : null}
                <LinePath
                  {...pathProps}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                >
                  {({ path }) => {
                    const d = path(data) ?? "";
                    return (
                      <motion.path
                        d={d}
                        fill="none"
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        initial={
                          reduced ? false : { pathLength: 0, opacity: 0.4 }
                        }
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                      />
                    );
                  }}
                </LinePath>
              </g>
            );
          })}
          {data.map((d, i) => {
            const px = xScale(String(d[x])) ?? 0;
            return (
              <rect
                key={i}
                x={px - innerW / data.length / 2}
                y={0}
                width={Math.max(8, innerW / data.length)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            );
          })}
          {activeRow
            ? visibleSeries.map((key) => {
                const px = xScale(String(activeRow[x])) ?? 0;
                const py = yScale(Number(activeRow[key] ?? 0));
                return (
                  <circle
                    key={key}
                    cx={px}
                    cy={py}
                    r={4}
                    fill={`var(--color-${key})`}
                  />
                );
              })
            : null}
        </g>
      </svg>
      <ChartTooltip
        visible={active != null && !!activeRow}
        x={(activeRow ? (xScale(String(activeRow[x])) ?? 0) : 0) + margin.left}
        y={margin.top + 8}
        label={activeRow ? String(activeRow[x]) : undefined}
        values={visibleSeries.map((key) => ({
          key,
          label: config[key]?.label ?? key,
          value: activeRow ? String(activeRow[key]) : "",
        }))}
      />
      <ChartLegend />
      <table className="sr-only">
        <thead>
          <tr>
            <th>{x}</th>
            {series.map((s) => (
              <th key={s}>{config[s]?.label ?? s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{String(row[x])}</td>
              {series.map((s) => (
                <td key={s}>{String(row[s])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
