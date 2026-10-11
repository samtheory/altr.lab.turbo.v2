---
title: "Apolyx motion, charts, CLI, docs (as-built)"
description: "Motion recipes, visx charts, registry/CLI, apps/apolyx — Apolyx-S0001"
created: 2026-10-11
updated: 2026-10-11
tags:
  - tech-space
  - ui-kit
  - apolyx
  - motion
  - charts
  - cli
  - Apolyx-S0001
---

# Apolyx motion, charts, CLI, docs (as-built)

> Sprint **Apolyx-S0001**.

## Motion (`src/motion/`)

Tokens (`durations` / `easings`), `useReducedMotion`, FadeIn, Stagger / StaggerItem, Pressable, HoverLift. Subpath `@altr/apolyx/motion`. Legacy `components/motion.tsx` re-exports FadeIn.

## Charts (`src/charts/`)

Deps: `@visx/scale`, `@visx/shape`, `@visx/curve` only. Own `useResizeObserver`. ChartContainer + Legend + Tooltip + LineChart + BarChart. Subpath `@altr/apolyx/charts`.

## Registry + CLI

- Manifests: `elements/ui-kit/registry/{utils,slot,button}.json`
- Build: `pnpm --filter @altr/apolyx build` → `dist/r/*.json`
- CLI package: `elements/apolyx-cli` (npm name `apolyx`) — `init` / `add` / `list`, import rewrite tests
- Root helper: `pnpm cli:apolyx`

## Docs app

- `apps/apolyx` → `@altr/apolyx-docs`, port **3004**
- `pnpm dev:apolyx`
- Pages: `/`, `/docs`, `/docs/components/button`
- `prebuild` copies registry JSON to `public/r/`
