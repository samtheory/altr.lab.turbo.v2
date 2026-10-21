---
title: "Phase 3 — Pagination, Scroll Area, Progress"
description: "Dense-panel chrome for Jord Studio tables and Artemis shells"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - ui-kit
  - apolyx
  - pagination
  - scroll-area
  - progress
  - Apolyx-S0005
---

# Phase 3 — Pagination, Scroll Area, Progress

> Who: apollo. Independent of Select once primitives exist; can overlap card 1 if staffing allows.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/06-apolyx-s0005-product-gate]]

## Pagination

Compositional parts for page controls. Controlled `page` / `onPageChange` helper optional. No data fetching.

## Scroll Area

Owned scrollport: overflow, optional vertical / horizontal scrollbar styling from tokens, `prefers-reduced-motion` respected for any fade affordances.

## Progress

`Progress` with `value` 0–100 and an indeterminate mode (`value` undefined or `indeterminate` prop — pick one API and document it).

## Done when

- [ ] Registry items: `pagination`, `scroll-area`, `progress`
- [ ] Vitest for Progress value clamp + indeterminate; Pagination controlled clicks
- [ ] Stories + MDX stubs
