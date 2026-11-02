---
title: "S0061 — ERD canvas (pan, zoom, drag, relations)"
description: "Figma-like free canvas with a card per table, pan in both axes, wheel zoom, node drag, multi-select and routed relationship lines"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0061
  - done
---

# S0061 — ERD canvas (pan, zoom, drag, relations)

> **Status:** **done** 2026-11-02 · **Depends on** [[S0060-table-relationships-view|S0060]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/fixing-motion-performance/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` — interaction + render performance |
| **Est. time** | **3 h** |
| **Parallel?** | **No** |

## Goal

A full-bleed canvas page: infinite grid background, two-axis pan (drag + scroll), zoom (wheel + buttons + fit-to-view), one card per table with key columns and type badges, relationship lines with cardinality, node drag with multi-select and optional snap-to-grid.

## Done when

- [x] Pan in both axes, wheel zoom, fit-to-view, keyboard equivalents
- [x] Node drag + multi-select drag work with guides and snap
- [x] 100 tables / 500 relations measured interactive
- [x] Cross-schema FKs render without collisions
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-erd-canvas.test.ts` | **7 passed** · 100 tables / ≥500 edges build **~3.4 ms** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio build` | exit 0 (no import warnings) |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` (+ studio) |
| Queue | [[../README]] |
