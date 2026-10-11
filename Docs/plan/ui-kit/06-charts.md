---
title: "Phase 6 — charts (SVG + visx)"
description: "ChartContainer, tooltip, legend, LineChart, BarChart — Apolyx SVG chrome, visx scales and paths"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - charts
  - visx
---

# Phase 6 — charts (SVG + visx)

> Who: apollo. Charts must look like Apolyx, not like a dashboard kit. visx does the math; every visible pixel is ours.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#Chart engine — decided: Apolyx SVG + visx (not pure-from-scratch, not Recharts)]]

**Depends on:** phase 2 (chart tokens), phase 5 (motion) · **Skills:** `vercel-react-best-practices` + `animate` (+ `find-docs` for visx APIs)

## Tasks

### Setup

- [x] Add `@visx/scale`, `@visx/shape`, `@visx/curve` to kit dependencies (nothing else from visx)
- [x] `src/charts/use-resize-observer.ts`: width / height of the container
- [x] `src/charts/types.ts`: `ChartConfig` — map series keys to `{ label, color: "chart-1" … "chart-5" }`

### Chrome

- [x] `ChartContainer`: sizes to parent (aspect ratio prop), provides config + dimensions via context, sets `--color-<key>` CSS vars from config, renders accessible wrapper (`role="figure"`, `aria-label`, optional `<figcaption>`)
- [x] `ChartGrid`, `ChartAxis` (own SVG ticks + labels using `scale.ticks()` / `nice()`, token colors `chart-grid` / `chart-axis`)
- [x] `ChartTooltip`: pointer + keyboard driven (arrow keys move the active index when chart is focused), positioned with phase 3 `position.ts` or plain absolute layout inside the container
- [x] `ChartLegend`: from config, toggles series visibility (buttons with `aria-pressed`)
- [x] Empty and loading states (uses `Skeleton`)

### Charts

- [x] `LineChart`: `data`, `x` key, `series` keys, `curve` (`linear` / `monotone` / `step`), optional area fill, dots on active point; path draw-in animation via Motion (`pathLength`), off under reduced motion
- [x] `BarChart`: vertical, grouped and stacked; rounded top corners via token radius; bars grow in on mount, off under reduced motion
- [x] Data table fallback: visually hidden `<table>` with the same data for screen readers

### Stories

- [x] Line: single, multi-series, area, empty, loading, 1k points (perf smoke)
- [x] Bar: grouped, stacked, negative values
- [x] All charts under the 3 families (chart ramp differs per family)

## Verify

```bash
rg "recharts|echarts|chart\.js" elements apps   # expect no hits
pnpm --filter @altr/apolyx typecheck
pnpm storybook:ui-kit
```

Manual: tooltip reachable by keyboard; 1k-point line stays smooth on hover.

## Done when

- `ChartContainer`, tooltip, legend, `LineChart`, `BarChart` exported from `@altr/apolyx` and `@altr/apolyx/charts`
- Only the three visx packages in the dependency list
