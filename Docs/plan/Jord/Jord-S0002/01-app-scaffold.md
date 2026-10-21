---
title: "Phase 1 — jord-studio app scaffold"
description: "Create apps/jord-studio with Next.js, Apolyx provider, and workspace scripts"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0002
---

# Phase 1 — jord-studio app scaffold

> Who: **apollo**. Empty shell only. Data wiring is card 2+.

Sprint index: [[README]] · Intent: [[../../../feature_list/Jord/03-jord-studio]]

## Status

**done** (2026-10-21)

## Tasks

- [x] `apps/jord-studio` package `@altr/jord-studio` (`private`, `"type": "module"`)
- [x] Next.js App Router + Tailwind aligned with `apps/apolyx` (do not copy docs/MDX machinery)
- [x] Depend on workspace `@altr/apolyx`; wrap root with `ApolyxProvider` + one theme
- [x] Root script `pnpm dev:jord-studio` → filter this app
- [x] Placeholder home page with product name **Jord Studio** (brand-first, not a dashboard collage)

## Done when

`pnpm --filter @altr/jord-studio typecheck` runs, and `pnpm dev:jord-studio` serves a themed empty shell with no Radix / Base UI.
