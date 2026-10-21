---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0003 shipped; next Studio S2 or Artemis"
created: 2026-09-19
updated: 2026-10-21
tags:
  - report
  - status
  - Apolyx-S0005
  - Jord-S0001
  - Jord-S0002
  - Jord-S0003
---

# Status

Last updated: 2026-10-21 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0003** (Studio shell + table-editor UX) · No active Jord sprint · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]] (libSQL, WAL, OCC `records`)
- **Jord Studio S1 (`Jord-S0002`)** — [[../tech_space/jord/01-s0002-studio-s1]] (BFF + Apolyx records CRUD)
- **Jord Studio S1.5 (`Jord-S0003`)** — [[../tech_space/jord/02-s0003-studio-shell]]
  - Categorized side nav (Data live; Runtime / APIs / Database placeholders)
  - Supabase-like Insert/Edit row for SQL columns; optional JSON validate on `body`
- **`@altr/apolyx`** through **S0005** · CLI · docs app · Apolyx-first · docs_man / apollo / mimir

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]

## Planned (repo) — **do next**

1. **Jord Studio S2+** — open new `Jord-S000N` (schema visualizer, auth, …) · [[../feature_list/Jord/03-jord-studio]]
2. Artemis — idea [[../idea/artemis/README]]
3. Tia — intent [[../feature_list/tia/README]]
4. CI pipeline
