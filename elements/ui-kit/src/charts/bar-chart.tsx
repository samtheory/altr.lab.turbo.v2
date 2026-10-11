"use client";

import * as React from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { motion } from "motion/react";

import { useReducedMotion } from "../motion/use-reduced-motion";
import { useChart } from "./chart-container";
import { ChartLegend } from "./chart-legend";

export type BarChartProps<T extends Record<string, unknown>> = {
  data: T[];
  x: keyof T & string;
  series: (keyof T & string)[];
  stacked?: boolean;
};

export function BarChart<T extends Record<string, unknown>>({
  data,
  x,
  series,
  stacked = false,
}: BarChartProps<T>) {
  const { width, height, config, hidden } = useChart();
  const reduced = useReducedMotion();
  const margin = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const visibleSeries = series.filter((s) => !hidden.has(s));

  const xScale = scaleBand<string>({
    domain: data.map((d) => String(d[x])),
    range: [0, innerW],
    padding: 0.2,
  });

  const yMax = Math.max(
    1,
    ...data.map((d) =>
      stacked
        ? visibleSeries.reduce((sum, s) => sum + Number(d[s] ?? 0), 0)
        : Math.max(...visibleSeries.map((s) => Number(d[s] ?? 0))),
    ),
  );
  const yScale = scaleLinear<number>({
    domain: [Math.min(0, ...data.flatMap((d) => visibleSeries.map((s) => Number(d[s] ?? 0)))), yMax],
    range: [innerH, 0],
    nice: true,
  });

  const group = scaleBand<string>({
    domain: visibleSeries,
    range: [0, xScale.bandwidth()],
    padding: 0.1,
  });

  return (
    <div className="relative">
      <svg width={width || "100%"} height={height} role="img">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yScale.ticks(4).map((t) => (
            <line
              key={t}
              x1={0}
              x2={innerW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--chart-grid)"
            />
          ))}
          {data.map((d) => {
            const label = String(d[x]);
            const bx = xScale(label) ?? 0;
            let stackY = 0;
            return (
              <g key={label} transform={`translate(${bx},0)`}>
                {visibleSeries.map((key) => {
                  const value = Number(d[key] ?? 0);
                  const barW = stacked ? xScale.bandwidth() : group.bandwidth();
                  const barX = stacked ? 0 : (group(key) ?? 0);
                  const barH = Math.abs(yScale(value) - yScale(0));
                  const barY = stacked
                    ? yScale(stackY + value)
                    : value >= 0
                      ? yScale(value)
                      : yScale(0);
                  if (stacked) stackY += value;
                  return (
                    <motion.rect
                      key={key}
                      x={barX}
                      width={barW}
                      rx={4}
                      fill={`var(--color-${key})`}
                      initial={
                        reduced
                          ? false
                          : { y: yScale(0), height: 0 }
                      }
                      animate={{ y: barY, height: barH }}
                      transition={{ duration: 0.4 }}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>
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
